import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { AlertConfig } from './entities/alert-config.entity';
import { UpdateAlertConfigDto } from './dto/update-alert-config.dto';
import { Settings } from 'src/users/entities/settings.entity';
import { DiscordService, SupportedLanguage } from 'src/discord/discord.service';
import { DockerComposeService } from 'src/docker-compose/docker-compose.service';
import { parseCpuPercent, parseMemoryToMb } from 'src/metrics/metric-parse.util';
import { getAlertMessages } from './alerts.translations';

const EXPECTED_STOP_WINDOW_MS = 5 * 60 * 1000;

interface ServerResources {
  status: string;
  cpuUsage: string;
  memoryUsage: string;
  memoryLimit: string;
}

type AlertType = 'down' | 'cpu' | 'memory';

interface ServerAlertState {
  lastStatus: string | null;
  highCpuCount: number;
  highMemoryCount: number;
  lastAlertAt: Partial<Record<AlertType, number>>;
  expectedStopUntil: number;
}

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);
  private readonly state = new Map<string, ServerAlertState>();

  constructor(
    @InjectRepository(AlertConfig)
    private readonly alertConfigRepo: Repository<AlertConfig>,
    @InjectRepository(Settings)
    private readonly settingsRepo: Repository<Settings>,
    private readonly discordService: DiscordService,
    private readonly dockerComposeService: DockerComposeService,
  ) {}

  async getConfig(serverId: string): Promise<AlertConfig> {
    const existing = await this.alertConfigRepo.findOne({ where: { serverId } });
    return (
      existing ??
      this.alertConfigRepo.create({
        serverId,
        downAlertEnabled: false,
        resourceAlertEnabled: false,
        cpuThresholdPercent: 90,
        memoryThresholdPercent: 90,
        sustainedMinutes: 5,
        cooldownMinutes: 30,
      })
    );
  }

  async updateConfig(serverId: string, dto: UpdateAlertConfigDto): Promise<AlertConfig> {
    const config = await this.getConfig(serverId);
    Object.assign(config, dto);
    return this.alertConfigRepo.save(config);
  }

  markExpectedStop(serverId: string, windowMs = EXPECTED_STOP_WINDOW_MS): void {
    this.getState(serverId).expectedStopUntil = Date.now() + windowMs;
  }

  async evaluate(resources: Record<string, ServerResources>): Promise<void> {
    const configs = await this.alertConfigRepo.find();
    if (configs.length === 0) {
      this.primeState(resources);
      return;
    }

    const configsByServer = new Map(configs.map((config) => [config.serverId, config]));

    for (const [serverId, data] of Object.entries(resources)) {
      const state = this.getState(serverId);
      const config = configsByServer.get(serverId);
      const previousStatus = state.lastStatus;
      state.lastStatus = data.status;

      if (!config) {
        continue;
      }

      if (config.downAlertEnabled) {
        await this.checkDown(serverId, config, state, previousStatus, data.status);
      }

      if (config.resourceAlertEnabled && data.status === 'running') {
        await this.checkResources(serverId, config, state, data);
      } else {
        state.highCpuCount = 0;
        state.highMemoryCount = 0;
      }
    }
  }

  private primeState(resources: Record<string, ServerResources>): void {
    for (const [serverId, data] of Object.entries(resources)) {
      this.getState(serverId).lastStatus = data.status;
    }
  }

  private getState(serverId: string): ServerAlertState {
    let state = this.state.get(serverId);
    if (!state) {
      state = { lastStatus: null, highCpuCount: 0, highMemoryCount: 0, lastAlertAt: {}, expectedStopUntil: 0 };
      this.state.set(serverId, state);
    }
    return state;
  }

  private async checkDown(serverId: string, config: AlertConfig, state: ServerAlertState, previousStatus: string | null, currentStatus: string): Promise<void> {
    const wentDown = previousStatus === 'running' && currentStatus !== 'running';
    if (!wentDown) {
      return;
    }
    if (Date.now() < state.expectedStopUntil) {
      return;
    }
    if (this.isInCooldown(state, 'down', config.cooldownMinutes)) {
      return;
    }

    try {
      const serverConfig = await this.dockerComposeService.getServerConfig(serverId);
      if (serverConfig?.enableAutoStop || serverConfig?.enableAutoPause) {
        return;
      }
    } catch {
      // If the config cannot be read, still alert: an unreachable server is worth reporting
    }

    state.lastAlertAt.down = Date.now();
    await this.notify(serverId, 'down');
  }

  private async checkResources(serverId: string, config: AlertConfig, state: ServerAlertState, data: ServerResources): Promise<void> {
    const cpuPercent = parseCpuPercent(data.cpuUsage);
    const memoryMb = parseMemoryToMb(data.memoryUsage);
    const memoryLimitMb = parseMemoryToMb(data.memoryLimit);
    const memoryPercent = memoryMb !== null && memoryLimitMb ? (memoryMb / memoryLimitMb) * 100 : null;

    if (cpuPercent !== null && cpuPercent >= config.cpuThresholdPercent) {
      state.highCpuCount += 1;
    } else {
      state.highCpuCount = 0;
    }

    if (memoryPercent !== null && memoryPercent >= config.memoryThresholdPercent) {
      state.highMemoryCount += 1;
    } else {
      state.highMemoryCount = 0;
    }

    if (state.highCpuCount >= config.sustainedMinutes && !this.isInCooldown(state, 'cpu', config.cooldownMinutes)) {
      state.lastAlertAt.cpu = Date.now();
      await this.notify(serverId, 'cpu', { usage: `${cpuPercent?.toFixed(1)}%`, threshold: `${config.cpuThresholdPercent}%`, sustained: config.sustainedMinutes });
    }

    if (state.highMemoryCount >= config.sustainedMinutes && !this.isInCooldown(state, 'memory', config.cooldownMinutes)) {
      state.lastAlertAt.memory = Date.now();
      await this.notify(serverId, 'memory', { usage: `${memoryPercent?.toFixed(1)}% (${data.memoryUsage})`, threshold: `${config.memoryThresholdPercent}%`, sustained: config.sustainedMinutes });
    }
  }

  private isInCooldown(state: ServerAlertState, type: AlertType, cooldownMinutes: number): boolean {
    const lastAlertAt = state.lastAlertAt[type];
    return lastAlertAt !== undefined && Date.now() - lastAlertAt < cooldownMinutes * 60 * 1000;
  }

  private async notify(serverId: string, type: AlertType, details?: { usage: string; threshold: string; sustained: number }): Promise<void> {
    try {
      const settings = await this.settingsRepo.findOne({
        where: { discordWebhook: Not(IsNull()) },
        order: { id: 'ASC' },
      });
      const webhook = settings?.discordWebhook;
      if (!webhook) {
        return;
      }

      const lang = (settings?.language as SupportedLanguage) || 'es';
      const t = getAlertMessages(lang);

      const fields: Array<{ name: string; value: string; inline?: boolean }> = [{ name: t.serverField, value: `\`${serverId}\``, inline: true }];

      if (type === 'down') {
        await this.discordService.sendCustomMessage(webhook, t.downTitle, t.downDescription, 'error', fields);
        return;
      }

      if (details) {
        fields.push({ name: t.usageField, value: `\`${details.usage}\``, inline: true }, { name: t.thresholdField, value: `\`${details.threshold}\``, inline: true }, { name: t.sustainedField, value: `\`${details.sustained} ${t.minutes}\``, inline: true });
      }

      const title = type === 'cpu' ? t.cpuTitle : t.memoryTitle;
      const description = type === 'cpu' ? t.cpuDescription : t.memoryDescription;
      await this.discordService.sendCustomMessage(webhook, title, description, 'warning', fields);
    } catch (error) {
      this.logger.warn(`Failed to send ${type} alert for server ${serverId}: ${(error as Error).message}`);
    }
  }
}
