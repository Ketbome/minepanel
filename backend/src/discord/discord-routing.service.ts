import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, IsNull, Not, Repository } from 'typeorm';
import { decryptSecret, encryptSecret } from 'src/common/crypto/secret-cipher';
import { ServerStoreService } from 'src/docker-compose/server-store.service';
import { InstanceSettingsService } from 'src/settings/instance-settings.service';
import { Settings } from 'src/users/entities/settings.entity';
import { DiscordWebhook } from './entities/discord-webhook.entity';
import { DiscordRoute } from './entities/discord-route.entity';
import { CreateDiscordWebhookDto, UpdateDiscordWebhookDto } from './dto/discord-webhook.dto';
import { isRoutableEventKey, RoutableEventKey } from './discord-events';

export interface DiscordTarget {
  url: string;
  // Shared webhooks carry the server name so one channel can follow many servers.
  shared: boolean;
  serverName?: string;
}

export interface DiscordWebhookSummary {
  id: number;
  name: string;
  shared: boolean;
}

export interface DiscordIntegrationState {
  webhooks: DiscordWebhookSummary[];
  // Only rows the admin actually saved: webhook id, or null for "off".
  routes: Record<string, number | null>;
}

@Injectable()
export class DiscordRoutingService {
  private readonly logger = new Logger(DiscordRoutingService.name);

  constructor(
    @InjectRepository(DiscordWebhook)
    private readonly webhooks: Repository<DiscordWebhook>,
    @InjectRepository(DiscordRoute)
    private readonly routes: Repository<DiscordRoute>,
    private readonly store: ServerStoreService,
    private readonly settingsService: InstanceSettingsService,
    @InjectRepository(Settings)
    private readonly userSettings: Repository<Settings>,
  ) {}

  async listFor(serverId: string): Promise<DiscordIntegrationState> {
    const hooks = await this.webhooks.find({
      where: [{ serverId }, { serverId: IsNull() }],
      order: { serverId: 'ASC', name: 'ASC' },
    });
    return {
      webhooks: hooks.map((hook) => ({ id: hook.id, name: hook.name, shared: hook.serverId === null })),
      routes: await this.explicitRoutes(serverId),
    };
  }

  async create(serverId: string, dto: CreateDiscordWebhookDto): Promise<DiscordWebhookSummary> {
    const hook = await this.webhooks.save(
      this.webhooks.create({
        serverId: dto.shared ? null : serverId,
        name: dto.name.trim(),
        urlEnc: encryptSecret(dto.url.trim()),
      }),
    );
    return { id: hook.id, name: hook.name, shared: hook.serverId === null };
  }

  async update(serverId: string, id: number, dto: UpdateDiscordWebhookDto): Promise<DiscordWebhookSummary> {
    const hook = await this.accessibleWebhook(serverId, id);
    if (dto.name !== undefined) hook.name = dto.name.trim();
    if (dto.url !== undefined) hook.urlEnc = encryptSecret(dto.url.trim());
    // Only a webhook created for this server can switch between own and shared.
    // A shared webhook has no owner, so letting one server claim it would take it
    // away from every other server that is already using it.
    if (dto.shared !== undefined && hook.serverId === serverId) {
      hook.serverId = dto.shared ? null : serverId;
    }
    const saved = await this.webhooks.save(hook);
    return { id: saved.id, name: saved.name, shared: saved.serverId === null };
  }

  async remove(serverId: string, id: number): Promise<void> {
    const hook = await this.accessibleWebhook(serverId, id);
    await this.routes.delete({ webhookId: hook.id });
    await this.webhooks.delete({ id: hook.id });
  }

  /**
   * Clears one deleted server's routes and its own webhooks, keeping shared ones.
   * `manager` lets the caller run this inside the deletion transaction, so the
   * Discord rows roll back together with the rest of the server cleanup.
   */
  async removeForServer(serverId: string, manager?: EntityManager): Promise<void> {
    if (manager) return this.clearForServer(serverId, manager);
    await this.webhooks.manager.transaction((run) => this.clearForServer(serverId, run));
  }

  private async clearForServer(serverId: string, manager: EntityManager): Promise<void> {
    const owned = await manager.find(DiscordWebhook, { where: { serverId }, select: { id: true } });
    if (owned.length > 0) {
      await manager.delete(DiscordRoute, { webhookId: In(owned.map((hook) => hook.id)) });
    }
    // A shared webhook has serverId null, so it is never matched here.
    await manager.delete(DiscordRoute, { serverId });
    await manager.delete(DiscordWebhook, { serverId });
  }

  async setRoutes(serverId: string, input: Record<string, number | null | 'instance'>): Promise<DiscordIntegrationState> {
    const entries = Object.entries(input);
    // Validate everything first: a rejected entry must not leave the earlier ones saved.
    for (const [eventKey, value] of entries) {
      if (!isRoutableEventKey(eventKey)) {
        throw new BadRequestException(`Unknown notification event: ${eventKey}`);
      }
      if (value === 'instance' || value === null) continue;
      if (!Number.isInteger(value)) {
        throw new BadRequestException(`Invalid webhook for ${eventKey}`);
      }
      await this.accessibleWebhook(serverId, value);
    }
    for (const [eventKey, value] of entries) {
      if (value === 'instance') {
        // Back to the default: no row is exactly what the resolver looks for.
        await this.routes.delete({ serverId, eventKey });
      } else {
        await this.saveRoute(serverId, eventKey, value as number | null);
      }
    }
    return this.listFor(serverId);
  }

  /**
   * Destinations for one event. `null` means "no explicit route": the caller
   * applies the delivery mode (per-server fallback or the shared channel).
   * An empty array is an explicit "do not send".
   */
  async resolve(serverId: string, eventKey: RoutableEventKey): Promise<DiscordTarget[] | null> {
    const route = await this.routes.findOne({ where: { serverId, eventKey } });
    if (!route) return null;
    if (route.webhookId === null) return [];
    const hook = await this.webhooks.findOne({ where: { id: route.webhookId } });
    if (!hook) return [];
    return [{
      url: this.decrypt(hook),
      shared: hook.serverId === null,
      serverName: hook.serverId === null ? await this.serverName(serverId) : undefined,
    }];
  }

  /**
   * Instance-wide delivery mode. Defaults to `per-server`, so installs that
   * predate the switch keep their current routing untouched.
   */
  async channelMode(): Promise<'per-server' | 'shared'> {
    const config = await this.settingsService.getNotifications().catch(() => null);
    return config?.discordChannelMode === 'shared' ? 'shared' : 'per-server';
  }

  /** The Minepanel-wide webhook used as the single shared channel, if one is saved. */
  async sharedChannel(): Promise<DiscordTarget | null> {
    const row = await this.userSettings.findOne({ where: { discordWebhook: Not(IsNull()) }, order: { id: 'ASC' } });
    const url = row?.discordWebhook?.trim();
    return url ? { url, shared: true } : null;
  }

  async webhookTarget(serverId: string, id: number): Promise<DiscordTarget> {
    const hook = await this.accessibleWebhook(serverId, id);
    return {
      url: this.decrypt(hook),
      shared: hook.serverId === null,
      serverName: hook.serverId === null ? await this.serverName(serverId) : undefined,
    };
  }

  // Read on demand so a renamed server is reflected in the next shared message.
  async serverName(serverId: string): Promise<string> {
    const config = await this.store.readConfig(serverId).catch(() => null);
    return config?.serverName || serverId;
  }

  private decrypt(hook: DiscordWebhook): string {
    try {
      return decryptSecret(hook.urlEnc);
    } catch {
      // Rotating JWT_SECRET makes stored webhooks unreadable; report it once per send.
      this.logger.warn(`Discord webhook ${hook.id} could not be decrypted; re-enter its URL`);
      return '';
    }
  }

  private async explicitRoutes(serverId: string): Promise<Record<string, number | null>> {
    const rows = await this.routes.find({ where: { serverId } });
    return Object.fromEntries(rows.map((row) => [row.eventKey, row.webhookId]));
  }

  private async saveRoute(serverId: string, eventKey: string, webhookId: number | null): Promise<void> {
    const existing = await this.routes.findOne({ where: { serverId, eventKey } });
    if (existing) {
      existing.webhookId = webhookId;
      await this.routes.save(existing);
      return;
    }
    await this.routes.save(this.routes.create({ serverId, eventKey, webhookId }));
  }

  // Admins can manage a server's own webhooks and the shared ones; another
  // server's webhook is invisible even to them on this page.
  private async accessibleWebhook(serverId: string, id: number): Promise<DiscordWebhook> {
    const hook = await this.webhooks.findOne({ where: { id } });
    if (!hook || (hook.serverId !== null && hook.serverId !== serverId)) {
      throw new NotFoundException(`Discord webhook ${id} not found for this server`);
    }
    return hook;
  }
}
