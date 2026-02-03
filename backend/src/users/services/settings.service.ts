import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Settings } from '../entities/settings.entity';
import { UpdateSettingsDto } from '../dtos/settings.dto';
import { UsersService } from 'src/users/services/users.service';

@Injectable()
export class SettingsService {
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

    Object.assign(settings, dto);
    return this.settingsRepo.save(settings);
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
    return this.settingsRepo.findOne({ order: { id: 'ASC' } });
  }
}
