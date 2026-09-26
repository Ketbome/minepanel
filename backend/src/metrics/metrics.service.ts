import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, MoreThanOrEqual, Repository } from 'typeorm';
import { MetricSample } from './entities/metric-sample.entity';
import { parseCpuPercent, parseMemoryToMb } from './metric-parse.util';
import { ServerManagementService } from 'src/server-management/server-management.service';
import { AlertsService } from 'src/alerts/alerts.service';
import { MonitoringService } from './monitoring.service';

const SAMPLE_INTERVAL_MS = 60_000;
const RETENTION_DAYS = 7;

export interface MetricPoint {
  cpuPercent: number;
  memoryMb: number;
  memoryLimitMb: number | null;
  tps: number | null;
  tickSource: 'neoforge' | 'spark' | null;
  msptMean: number | null;
  msptMedian: number | null;
  msptP95: number | null;
  playersOnline: number | null;
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
    private readonly monitoring: MonitoringService,
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
      tps: sample.tps ?? null,
      tickSource: sample.tickSource ?? null,
      msptMean: sample.msptMean ?? null,
      msptMedian: sample.msptMedian ?? null,
      msptP95: sample.msptP95 ?? null,
      playersOnline: sample.playersOnline ?? null,
      timestamp: sample.createdAt.toISOString(),
    }));
  }

  private async collectSamples(): Promise<void> {
    if (this.sampling) {
      return;
    }
    this.sampling = true;

    try {
      const resources = await this.serverManagement.getAllServersRuntimeStats();

      try {
        await this.alertsService.evaluate(resources, (serverId) => this.serverManagement.getCrashInfo(serverId));
      } catch (error) {
        this.logger.warn(`Failed to evaluate alerts: ${(error as Error).message}`);
      }

      const now = new Date();
      const samples: MetricSample[] = [];

      const entries = Object.entries(resources);
      // Bound RCON concurrency across large installations.
      for (let offset = 0; offset < entries.length; offset += 4) {
        await Promise.all(entries.slice(offset, offset + 4).map(async ([serverId, data]) => {
          if (data.status !== 'running') {
            return;
          }

          const cpuPercent = parseCpuPercent(data.cpuUsage);
          const memoryMb = parseMemoryToMb(data.memoryUsage);
          if (cpuPercent === null || memoryMb === null) {
            return;
          }

          const live = await this.monitoring.getSnapshot(serverId, data);

          samples.push(
            this.sampleRepo.create({
              serverId,
              cpuPercent,
              memoryMb,
              memoryLimitMb: parseMemoryToMb(data.memoryLimit),
              tps: live.tps,
              tickSource: live.tickSource,
              msptMean: live.msptMean,
              msptMedian: live.msptMedian,
              msptP95: live.msptP95,
              playersOnline: live.playersOnline,
              createdAt: now,
            }),
          );
        }));
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
