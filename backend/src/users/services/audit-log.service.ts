import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';
import { AuditLogQueryDto } from '../dtos/audit-log.dto';
import { Settings } from '../entities/settings.entity';

type CreateAuditLogInput = {
  actorUserId?: number | null;
  actorUsername: string;
  category: string;
  action: string;
  outcome?: 'success' | 'error';
  serverId?: string | null;
  summary: string;
  metadata?: Record<string, unknown> | null;
};

const DEFAULT_AUDIT_RETENTION_DAYS = 15;
const CLEANUP_INTERVAL_MS = 15 * 60 * 1000;

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);
  private lastCleanupAt = 0;

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
    @InjectRepository(Settings)
    private readonly settingsRepo: Repository<Settings>,
  ) {}

  async record(input: CreateAuditLogInput): Promise<void> {
    await this.cleanupIfNeeded();

    try {
      await this.auditLogRepo.save(
        this.auditLogRepo.create({
          actorUserId: input.actorUserId ?? null,
          actorUsername: input.actorUsername,
          category: input.category,
          action: input.action,
          outcome: input.outcome ?? 'success',
          serverId: input.serverId ?? null,
          summary: input.summary,
          metadata: input.metadata ?? null,
        }),
      );
    } catch (error) {
      this.logger.error('Failed to persist audit log', error instanceof Error ? error.stack : undefined);
    }
  }

  async list(query: AuditLogQueryDto): Promise<AuditLog[]> {
    await this.cleanupIfNeeded();

    const builder = this.auditLogRepo.createQueryBuilder('audit');

    if (query.userId) {
      builder.andWhere('audit.actor_user_id = :userId', { userId: query.userId });
    }

    if (query.action) {
      builder.andWhere('audit.action = :action', { action: query.action });
    }

    if (query.outcome) {
      builder.andWhere('audit.outcome = :outcome', { outcome: query.outcome });
    }

    if (query.serverId) {
      builder.andWhere('audit.server_id = :serverId', { serverId: query.serverId });
    }

    if (query.dateFrom) {
      builder.andWhere('audit.created_at >= :dateFrom', { dateFrom: new Date(query.dateFrom).toISOString() });
    }

    if (query.dateTo) {
      builder.andWhere('audit.created_at <= :dateTo', { dateTo: new Date(query.dateTo).toISOString() });
    }

    return builder.orderBy('audit.created_at', 'DESC').take(query.limit ?? 200).getMany();
  }

  async pruneExpired(): Promise<void> {
    const retentionDays = await this.getRetentionDays();
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    await this.auditLogRepo.delete({ createdAt: LessThan(cutoff) });
    this.lastCleanupAt = Date.now();
  }

  private async cleanupIfNeeded(): Promise<void> {
    if (Date.now() - this.lastCleanupAt < CLEANUP_INTERVAL_MS) {
      return;
    }

    try {
      await this.pruneExpired();
    } catch (error) {
      this.lastCleanupAt = Date.now();
      this.logger.error('Failed to prune audit logs', error instanceof Error ? error.stack : undefined);
    }
  }

  private async getRetentionDays(): Promise<number> {
    const [settings] = await this.settingsRepo.find({ order: { id: 'ASC' }, take: 1 });
    const value = settings?.preferences?.auditRetentionDays;

    return Number.isInteger(value) && value > 0 ? value : DEFAULT_AUDIT_RETENTION_DAYS;
  }
}
