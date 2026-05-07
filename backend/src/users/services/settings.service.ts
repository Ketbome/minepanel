import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Settings } from '../entities/settings.entity';
import { UpdateSettingsDto } from '../dtos/settings.dto';
import { UsersService } from 'src/users/services/users.service';

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
  ) {}

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

    // Handle proxy settings
    if (dto.proxy) {
      settings.preferences = {
        ...settings.preferences,
        proxyEnabled: dto.proxy.proxyEnabled ?? settings.preferences?.proxyEnabled ?? false,
        proxyBaseDomain: dto.proxy.proxyBaseDomain ?? settings.preferences?.proxyBaseDomain ?? null,
      };
      delete (dto as any).proxy;
    }

    // Handle network settings
    if (dto.network) {
      settings.preferences = {
        ...settings.preferences,
        publicIp: dto.network.publicIp ?? settings.preferences?.publicIp ?? null,
        lanIp: dto.network.lanIp ?? settings.preferences?.lanIp ?? null,
      };
      delete (dto as any).network;
    }

    if (dto.javaServerDefaults) {
      settings.preferences = {
        ...settings.preferences,
        javaServerDefaults: this.sanitizeJavaServerDefaults(dto.javaServerDefaults),
      };
      delete (dto as any).javaServerDefaults;
    }

    if (dto.auditRetentionDays !== undefined) {
      await this.updateAuditRetentionDays(dto.auditRetentionDays);
      delete (dto as any).auditRetentionDays;
    }

    Object.assign(settings, dto);
    return this.settingsRepo.save(settings);
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

  async getProxySettings(userId: number): Promise<{ enabled: boolean; baseDomain: string | null; available: boolean }> {
    const settings = await this.getSettings(userId);
    const baseDomain = settings.preferences?.proxyBaseDomain ?? null;
    return {
      enabled: settings.preferences?.proxyEnabled ?? false,
      baseDomain,
      available: !!baseDomain,
    };
  }

  async getNetworkSettings(userId: number): Promise<{ publicIp: string | null; lanIp: string | null }> {
    const settings = await this.getSettings(userId);
    return {
      publicIp: settings.preferences?.publicIp ?? null,
      lanIp: settings.preferences?.lanIp ?? null,
    };
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
