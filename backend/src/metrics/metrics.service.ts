import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, MoreThanOrEqual, Repository } from 'typeorm';
import { MetricSample } from './entities/metric-sample.entity';
import { ServerManagementService } from 'src/server-management/server-management.service';

const SAMPLE_INTERVAL_MS = 60_000;
const RETENTION_DAYS = 7;

export interface MetricPoint {
  cpuPercent: number;
  memoryMb: number;
  memoryLimitMb: number | null;
  timestamp: string;
}

@Injectable()
export class MetricsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MetricsService.name);
  private timer: NodeJS.Timeout | null = null;
  private sampling = false;

  constructor(
    @InjectRepository(MetricSample)
    private readonly sampleRepo: Repository<MetricSample>,
    private readonly serverManagement: ServerManagementService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.collectSamples();
    }, SAMPLE_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async getHistory(serverId: string, hours: number): Promise<MetricPoint[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const samples = await this.sampleRepo.find({
      where: { serverId, createdAt: MoreThanOrEqual(since) },
      order: { createdAt: 'ASC' },
    });

    return samples.map((sample) => ({
      cpuPercent: sample.cpuPercent,
      memoryMb: sample.memoryMb,
      memoryLimitMb: sample.memoryLimitMb,
      timestamp: sample.createdAt.toISOString(),
    }));
  }

  private async collectSamples(): Promise<void> {
    if (this.sampling) {
      return;
    }
    this.sampling = true;

    try {
      const resources = await this.serverManagement.getAllServersResources();
      const now = new Date();
      const samples: MetricSample[] = [];

      for (const [serverId, data] of Object.entries(resources)) {
        if (data.status !== 'running') {
          continue;
        }

        const cpuPercent = this.parseCpuPercent(data.cpuUsage);
        const memoryMb = this.parseMemoryToMb(data.memoryUsage);
        if (cpuPercent === null || memoryMb === null) {
          continue;
        }

        samples.push(
          this.sampleRepo.create({
            serverId,
            cpuPercent,
            memoryMb,
            memoryLimitMb: this.parseMemoryToMb(data.memoryLimit),
            createdAt: now,
          }),
        );
      }

      if (samples.length > 0) {
        await this.sampleRepo.save(samples);
      }

      await this.pruneOldSamples();
    } catch (error) {
      this.logger.warn(`Failed to collect metric samples: ${(error as Error).message}`);
    } finally {
      this.sampling = false;
    }
  }

  private async pruneOldSamples(): Promise<void> {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    await this.sampleRepo.delete({ createdAt: LessThan(cutoff) });
  }

  private parseCpuPercent(value: string): number | null {
    if (!value || value === 'N/A') {
      return null;
    }
    const parsed = Number.parseFloat(value.replace('%', '').trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  private parseMemoryToMb(value: string): number | null {
    if (!value || value === 'N/A') {
      return null;
    }

    const match = value.trim().match(/^([\d.]+)\s*([a-zA-Z]+)$/);
    if (!match) {
      return null;
    }

    const amount = Number.parseFloat(match[1]);
    if (!Number.isFinite(amount)) {
      return null;
    }

    const unit = match[2].toLowerCase();
    const toMb: Record<string, number> = {
      b: 1 / (1024 * 1024),
      kb: 1 / 1024,
      kib: 1 / 1024,
      mb: 1,
      mib: 1,
      gb: 1024,
      gib: 1024,
      tb: 1024 * 1024,
      tib: 1024 * 1024,
    };

    const factor = toMb[unit];
    if (factor === undefined) {
      return null;
    }

    return Math.round(amount * factor * 100) / 100;
  }
}
