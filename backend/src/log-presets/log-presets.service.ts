import { BadRequestException, ConflictException, Injectable, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LogPreset } from './entities/log-preset.entity';
import { SaveLogPresetDto } from './dto/save-log-preset.dto';
import { ServerManagementService } from 'src/server-management/server-management.service';
import { ServerStoreService } from 'src/docker-compose/server-store.service';

const MAX_PER_SERVER = 20;

const toView = ({ name, searchTerm, levelFilter, regex, lines, sinceMinutes }: LogPreset) => ({ name, searchTerm, levelFilter, regex, lines, sinceMinutes });

@Injectable()
export class LogPresetsService implements OnModuleInit, OnModuleDestroy {
  private readonly deleting = new Set<string>();
  private unregisterDeletionGuard?: () => void;

  constructor(
    @InjectRepository(LogPreset) private readonly repo: Repository<LogPreset>,
    private readonly serverManagement: ServerManagementService,
    private readonly store: ServerStoreService,
  ) {}

  onModuleInit(): void {
    this.unregisterDeletionGuard = this.serverManagement.registerDeletionGuard(async (serverId) => {
      this.deleting.add(serverId);
      await this.saving;
      return () => { this.deleting.delete(serverId); };
    });
  }

  onModuleDestroy(): void {
    this.unregisterDeletionGuard?.();
  }

  async list(userId: number, serverId: string) {
    return (await this.repo.find({ where: { userId, serverId }, order: { name: 'ASC' } })).map(toView);
  }

  // Saving an existing name overwrites it, so "save current view" doubles as update.
  // Saves run one at a time so the count check and the insert cannot interleave.
  // ponytail: in-process queue; a second backend replica would need a DB-level limit.
  save(userId: number, dto: SaveLogPresetDto) {
    return this.enqueue(dto.serverId, () => this.saveNow(userId, dto));
  }

  private enqueue<T>(serverId: string, operation: () => Promise<T>): Promise<T> {
    if (this.deleting.has(serverId)) return Promise.reject(new ConflictException('Server deletion is in progress'));
    const run = this.saving.then(async () => {
      if (this.deleting.has(serverId)) throw new ConflictException('Server deletion is in progress');
      if (!(await this.store.readConfig(serverId))) throw new NotFoundException('Server not found');
      return operation();
    });
    this.saving = run.catch(() => undefined);
    return run;
  }

  private saving: Promise<unknown> = Promise.resolve();

  private async saveNow(userId: number, dto: SaveLogPresetDto) {
    const existing = await this.repo.findOne({ where: { userId, serverId: dto.serverId, name: dto.name } });
    if (!existing && (await this.repo.count({ where: { userId, serverId: dto.serverId } })) >= MAX_PER_SERVER) {
      throw new BadRequestException(`At most ${MAX_PER_SERVER} presets per server`);
    }
    const { searchTerm, levelFilter, regex, lines, sinceMinutes } = dto;
    const row = existing ?? this.repo.create({ userId, serverId: dto.serverId, name: dto.name });
    return toView(await this.repo.save(Object.assign(row, { searchTerm, levelFilter, regex, lines, sinceMinutes })));
  }

  async remove(userId: number, serverId: string, name: string) {
    await this.enqueue(serverId, () => this.repo.delete({ userId, serverId, name }));
  }
}
