import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LogPreset } from './entities/log-preset.entity';
import { SaveLogPresetDto } from './dto/save-log-preset.dto';

const MAX_PER_SERVER = 20;

const toView = ({ name, searchTerm, levelFilter, regex, lines, sinceMinutes }: LogPreset) => ({ name, searchTerm, levelFilter, regex, lines, sinceMinutes });

@Injectable()
export class LogPresetsService {
  constructor(@InjectRepository(LogPreset) private readonly repo: Repository<LogPreset>) {}

  async list(userId: number, serverId: string) {
    return (await this.repo.find({ where: { userId, serverId }, order: { name: 'ASC' } })).map(toView);
  }

  // Saving an existing name overwrites it, so "save current view" doubles as update.
  async save(userId: number, dto: SaveLogPresetDto) {
    const existing = await this.repo.findOne({ where: { userId, serverId: dto.serverId, name: dto.name } });
    if (!existing && (await this.repo.count({ where: { userId, serverId: dto.serverId } })) >= MAX_PER_SERVER) {
      throw new BadRequestException(`At most ${MAX_PER_SERVER} presets per server`);
    }
    return toView(await this.repo.save(this.repo.create({ ...existing, ...dto, userId })));
  }

  async remove(userId: number, serverId: string, name: string) {
    await this.repo.delete({ userId, serverId, name });
  }
}
