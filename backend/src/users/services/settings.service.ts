import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Settings } from '../entities/settings.entity';
import { UpdateSettingsDto } from '../dtos/settings.dto';
import { UsersService } from 'src/users/services/users.service';
import { decryptSecret, encryptSecret } from 'src/common/crypto/secret-cipher';
import { InstanceSettingsService } from 'src/settings/instance-settings.service';
import { ProxyRouterService } from 'src/proxy/proxy-router.service';

const DEFAULT_AUDIT_RETENTION_DAYS = 15;

@Injectable()
export class SettingsService {
  private readonly javaDefaultsKeys = new Set([
    'onlineMode',
    'maxPlayers',
    'initMemory',
    'maxMemory',
    'cpuLimit',
    'cpuReservation',
    'memoryReservation',
    'difficulty',
    'gameMode',
    'pvp',
    'allowFlight',
    'commandBlock',
    'viewDistance',
    'simulationDistance',
    'enableAutoStop',
    'autoStopTimeoutEst',
    'enableAutoPause',
    'autoPauseTimeoutEst',
    'enableBackup',
  ]);

  constructor(
    @InjectRepository(Settings)
    private readonly settingsRepo: Repository<Settings>,
    private readonly usersService: UsersService,
    private readonly instanceSettings: InstanceSettingsService,
    private readonly proxyRouter: ProxyRouterService,
  ) {}

  private normalizeOptionalText(value: string | undefined | null): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  async getSettings(userId: number): Promise<Settings> {
    const user = await this.usersService.getUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const settings = await this.settingsRepo.findOne({ where: { userId: user.id } });
    if (!settings) {
      throw new NotFoundException('Settings not found');
    }
    return settings;
  }

  async createSettings(userId: number): Promise<Settings> {
    const settings = this.settingsRepo.create({ userId });
    if (!settings) {
      throw new NotFoundException('Settings not found');
    }
    return this.settingsRepo.save(settings);
  }

  async updateSettings(dto: UpdateSettingsDto, userId: number): Promise<Settings> {
    const user = await this.usersService.getUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const settings = await this.settingsRepo.findOne({ where: { userId: user.id } });
    if (!settings) {
      throw new NotFoundException('Settings not found');
    }

    // Proxy and network settings are instance-wide, not per user.
    if (dto.proxy) {
      await this.instanceSettings.setProxy({
        enabled: dto.proxy.proxyEnabled,
        baseDomain: dto.proxy.proxyBaseDomain === undefined ? undefined : this.normalizeOptionalText(dto.proxy.proxyBaseDomain),
      });
      if (dto.proxy.router) {
        await this.instanceSettings.updateRouterSettings(dto.proxy.router);
      }
      // The panel owns the router container, so saving is what starts or stops it.
      await this.proxyRouter.reconcile();
      delete (dto as any).proxy;
    }

    if (dto.network) {
      await this.instanceSettings.setNetwork({
        publicIp: dto.network.publicIp === undefined ? undefined : this.normalizeOptionalText(dto.network.publicIp),
        lanIp: dto.network.lanIp === undefined ? undefined : this.normalizeOptionalText(dto.network.lanIp),
      });
      delete (dto as any).network;
    }

    if (dto.javaServerDefaults) {
      await this.instanceSettings.setJavaServerDefaults(this.sanitizeJavaServerDefaults(dto.javaServerDefaults));
      delete (dto as any).javaServerDefaults;
    }

    if (dto.auditRetentionDays !== undefined) {
      await this.updateAuditRetentionDays(dto.auditRetentionDays);
      delete (dto as any).auditRetentionDays;
    }

    // CurseForge API key is a write-only secret: omitted keeps, '' clears, a
    // value is stored encrypted. It is decrypted only server-side (getCfApiKey).
    if (dto.cfApiKey !== undefined) {
      settings.cfApiKey = dto.cfApiKey === '' ? (null as any) : encryptSecret(dto.cfApiKey);
      delete (dto as any).cfApiKey;
    }

    Object.assign(settings, dto);
    return this.settingsRepo.save(settings);
  }

  // Returns the decrypted CurseForge API key for server-side use (compose
  // generation, CurseForge/Bedrock API calls). Never expose this over HTTP.
  async getCfApiKey(userId: number): Promise<string> {
    const settings = await this.settingsRepo.findOne({ where: { userId } });
    return settings?.cfApiKey ? decryptSecret(settings.cfApiKey) : '';
  }

  private sanitizeJavaServerDefaults(defaults: Record<string, any>): Record<string, any> {
    return Object.entries(defaults).reduce((acc, [key, value]) => {
      const isBlankString = typeof value === 'string' && value.trim() === '';
      if (this.javaDefaultsKeys.has(key) && value !== undefined && !isBlankString) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);
  }

  async getProxySettings(): Promise<{ enabled: boolean; baseDomain: string | null; available: boolean }> {
    const { enabled, baseDomain } = await this.instanceSettings.getProxy();
    return { enabled, baseDomain, available: !!baseDomain };
  }

  async getNetworkSettings(): Promise<{ publicIp: string | null; lanIp: string | null }> {
    return this.instanceSettings.getNetwork();
  }

  // Get first user's settings (for system-wide operations like Discord notifications)
  async getFirstUserSettings(): Promise<Settings | null> {
    const [first] = await this.settingsRepo.find({ order: { id: 'ASC' }, take: 1 });
    return first ?? null;
  }

  async getAuditRetentionDays(): Promise<number> {
    const settings = await this.getFirstUserSettings();
    const value = settings?.preferences?.auditRetentionDays;

    return Number.isInteger(value) && value > 0 ? value : DEFAULT_AUDIT_RETENTION_DAYS;
  }

  private async updateAuditRetentionDays(auditRetentionDays: number): Promise<void> {
    const settings = await this.getFirstUserSettings();

    if (!settings) {
      throw new NotFoundException('Settings not found');
    }

    settings.preferences = {
      ...settings.preferences,
      auditRetentionDays,
    };

    await this.settingsRepo.save(settings);
  }
}
