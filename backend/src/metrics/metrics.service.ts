import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, MoreThanOrEqual, Repository } from 'typeorm';
import { MetricSample } from './entities/metric-sample.entity';
import { UptimeSample } from './entities/uptime-sample.entity';
import { parseCpuPercent, parseMemoryToMb } from './metric-parse.util';
import { ServerManagementService } from 'src/server-management/server-management.service';
import { AlertsService } from 'src/alerts/alerts.service';
import { MonitoringService } from './monitoring.service';
import { computeDaily, computeIncidents, computeWindows } from './uptime.util';

import { TickSource } from './tick-stats';
import { ServerStoreService } from 'src/docker-compose/server-store.service';
const SAMPLE_INTERVAL_MS = 60_000;
const PRUNE_INTERVAL_MS = 60 * 60_000;
const RETENTION_DAYS = 7;
const UPTIME_RETENTION_DAYS = 30;
const UPTIME_WINDOWS_HOURS = [24, 168, 720];

export interface MetricPoint {
  cpuPercent: number;
  memoryMb: number;
  memoryLimitMb: number | null;
  tps: number | null;
  tickSource: TickSource | null;
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
  private sampleInFlight: Promise<void> | null = null;
  private sampleGeneration = 0;
  private readonly deletingServers = new Set<string>();
  private unregisterDeletionGuard?: () => void;
  private lastPruneAt: number | null = null;

  // ponytail: in memory, so a crash while the panel itself is off stays unknown. Persist if that matters.
  private readonly availability = new Map<string, 'up' | 'down' | 'parked'>();

  constructor(
    @InjectRepository(MetricSample)
    private readonly sampleRepo: Repository<MetricSample>,
    @InjectRepository(UptimeSample)
    private readonly uptimeRepo: Repository<UptimeSample>,
    private readonly serverManagement: ServerManagementService,
    private readonly alertsService: AlertsService,
    private readonly monitoring: MonitoringService,
    private readonly store: ServerStoreService,
  ) {}

  onModuleInit(): void {
    this.unregisterDeletionGuard = this.serverManagement.registerDeletionGuard(async (serverId) => {
      this.deletingServers.add(serverId);
      this.sampleGeneration++;
      // Already-started writes must finish before deletion's database transaction runs.
      await this.sampleInFlight;
      this.availability.delete(serverId);
      return () => {
        this.availability.delete(serverId);
        this.deletingServers.delete(serverId);
        this.sampleGeneration++;
      };
    });
    this.timer = setInterval(() => {
      void this.collectSamples();
    }, SAMPLE_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    this.unregisterDeletionGuard?.();
    this.unregisterDeletionGuard = undefined;
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

  async getUptime(serverId: string) {
    const now = Date.now();
    const rows = await this.uptimeRepo.find({
      select: { running: true, createdAt: true },
      where: { serverId, createdAt: MoreThanOrEqual(new Date(now - UPTIME_RETENTION_DAYS * 24 * 60 * 60 * 1000)) },
      order: { createdAt: 'ASC' },
    });
    return {
      windows: computeWindows(rows, UPTIME_WINDOWS_HOURS, now),
      daily: computeDaily(rows, UPTIME_RETENTION_DAYS, now),
      incidents: computeIncidents(rows, now),
    };
  }

  // true/false is a sample; null skips it. A stop the panel asked for, and everything after it,
  // is not downtime, so a server parked for days keeps its percentage. A stop nobody asked for
  // is downtime until the server runs again.
  private async uptimeState(serverId: string, status: string): Promise<boolean | null> {
    const previous = this.availability.get(serverId);
    if (status === 'running') {
      this.availability.set(serverId, 'up');
      return true;
    }
    if (status === 'not_found') {
      this.availability.delete(serverId);
      return null;
    }
    if (previous === 'up') {
      let planned = this.alertsService.isExpectedStop(serverId);
      if (!planned && status === 'stopped') {
        try {
          const config = await this.store.readConfig(serverId);
          if (config?.enableAutoStop) {
            const exit = await this.serverManagement.getCrashInfo(serverId);
            if (!exit) return null;
            planned = exit.exitCode === 0;
          }
        } catch {
          // Retry on the next sample rather than classify an unreadable auto-stop as downtime.
          return null;
        }
      }
      this.availability.set(serverId, planned ? 'parked' : 'down');
    }
    return this.availability.get(serverId) === 'down' ? false : null;
  }

  private collectSamples(): Promise<void> {
    if (this.sampling) return Promise.resolve();
    this.sampling = true;
    this.sampleInFlight = this.collectCurrentSamples(this.sampleGeneration).finally(() => {
      this.sampling = false;
      this.sampleInFlight = null;
    });
    return this.sampleInFlight;
  }

  private async collectCurrentSamples(generation: number): Promise<void> {
    try {
      const allResources = await this.serverManagement.getAllServersRuntimeStats();
      if (generation !== this.sampleGeneration) return;
      const resources = Object.fromEntries(Object.entries(allResources).filter(([serverId]) => !this.deletingServers.has(serverId)));

      try {
        await this.alertsService.evaluate(resources, (serverId) => this.serverManagement.getCrashInfo(serverId));
      } catch (error) {
        this.logger.warn(`Failed to evaluate alerts: ${(error as Error).message}`);
      }
      if (generation !== this.sampleGeneration) return;

      const now = new Date();
      const samples: MetricSample[] = [];
      const uptime: UptimeSample[] = [];
      for (const [serverId, data] of Object.entries(resources)) {
        const running = await this.uptimeState(serverId, data.status);
        if (generation !== this.sampleGeneration) return;
        if (running !== null) uptime.push(this.uptimeRepo.create({ serverId, running, createdAt: now }));
      }

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

      if (generation !== this.sampleGeneration) return;
      if (samples.length > 0) {
        await this.sampleRepo.save(samples);
      }

      if (generation !== this.sampleGeneration) return;
      if (uptime.length > 0) {
        await this.uptimeRepo.save(uptime);
      }

      await this.pruneOldSamples();
    } catch (error) {
      this.logger.warn(`Failed to collect metric samples: ${(error as Error).message}`);
    }
  }

  private async pruneOldSamples(): Promise<void> {
    const now = Date.now();
    if (this.lastPruneAt !== null && now - this.lastPruneAt < PRUNE_INTERVAL_MS) return;
    this.lastPruneAt = now;
    // Keep sql.js writes sequential, but a failure in one table must not skip the other.
    for (const [name, repo, days] of [['metric', this.sampleRepo, RETENTION_DAYS], ['uptime', this.uptimeRepo, UPTIME_RETENTION_DAYS]] as const) {
      try {
        await repo.delete({ createdAt: LessThan(new Date(Date.now() - days * 24 * 60 * 60 * 1000)) });
      } catch (error) {
        this.logger.warn(`Failed to prune ${name} samples: ${(error as Error).message}`);
      }
    }
  }

}
