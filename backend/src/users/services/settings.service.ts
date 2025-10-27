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
    return this.settingsRepo.findOne({ where: { userId: user.id } });
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
    Object.assign(settings, dto);
    return this.settingsRepo.save(settings);
  }
}
