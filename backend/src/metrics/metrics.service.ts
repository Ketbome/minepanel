import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, MoreThanOrEqual, Repository } from 'typeorm';
import { MetricSample } from './entities/metric-sample.entity';
import { parseCpuPercent, parseMemoryToMb } from './metric-parse.util';
import { ServerManagementService } from 'src/server-management/server-management.service';
import { AlertsService } from 'src/alerts/alerts.service';

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
    private readonly alertsService: AlertsService,
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

      try {
        await this.alertsService.evaluate(resources);
      } catch (error) {
        this.logger.warn(`Failed to evaluate alerts: ${(error as Error).message}`);
      }

      const now = new Date();
      const samples: MetricSample[] = [];

      for (const [serverId, data] of Object.entries(resources)) {
        if (data.status !== 'running') {
          continue;
        }

        const cpuPercent = parseCpuPercent(data.cpuUsage);
        const memoryMb = parseMemoryToMb(data.memoryUsage);
        if (cpuPercent === null || memoryMb === null) {
          continue;
        }

        samples.push(
          this.sampleRepo.create({
            serverId,
            cpuPercent,
            memoryMb,
            memoryLimitMb: parseMemoryToMb(data.memoryLimit),
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

}
