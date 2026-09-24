import { BadRequestException, Injectable } from '@nestjs/common';
import { ServerStoreService } from 'src/docker-compose/server-store.service';
import { ServerManagementService, ServerRuntimeStats } from 'src/server-management/server-management.service';
import { parseCpuPercent, parseMemoryToMb } from './metric-parse.util';
import { parseNeoForgeStats, parseSparkStats } from './tick-stats';

export type TickStatus = 'available' | 'offline' | 'unsupported' | 'rcon_disabled' | 'spark_missing' | 'unavailable';

export interface MonitoringSnapshot {
  timestamp: string;
  status: ServerRuntimeStats['status'];
  cpuPercent: number | null;
  memoryMb: number | null;
  memoryLimitMb: number | null;
  playersOnline: number | null;
  playersMax: number | null;
  uptimeSeconds: number | null;
  tickStatus: TickStatus;
  tickSource: 'neoforge' | 'spark' | null;
  tps: number | null;
  msptMean: number | null;
  msptMedian: number | null;
  msptP95: number | null;
}

@Injectable()
export class MonitoringService {
  private readonly cache = new Map<string, { at: number; value: MonitoringSnapshot }>();
  private readonly inFlight = new Map<string, Promise<MonitoringSnapshot>>();

  constructor(private readonly management: ServerManagementService, private readonly store: ServerStoreService) {}

  async getSnapshot(serverId: string, runtime?: ServerRuntimeStats): Promise<MonitoringSnapshot> {
    if (!/^[a-zA-Z0-9_-]+$/.test(serverId)) throw new BadRequestException('Invalid server ID');
    const cached = this.cache.get(serverId);
    if (cached && Date.now() - cached.at < 10_000 && (!runtime || runtime.status === cached.value.status)) return cached.value;
    const existing = this.inFlight.get(serverId);
    if (existing) return existing;
    const pending = this.collect(serverId, runtime)
      .then((value) => {
        // Evict expired entries so deleted servers do not accumulate forever.
        for (const [id, entry] of this.cache) if (Date.now() - entry.at >= 10_000) this.cache.delete(id);
        this.cache.set(serverId, { at: Date.now(), value });
        return value;
      })
      .finally(() => this.inFlight.delete(serverId));
    this.inFlight.set(serverId, pending);
    return pending;
  }

  private async collect(serverId: string, supplied?: ServerRuntimeStats): Promise<MonitoringSnapshot> {
    const runtime = supplied ?? await this.management.getServerRuntimeStats(serverId);
    const running = runtime.status === 'running';
    const result: MonitoringSnapshot = {
      timestamp: new Date().toISOString(),
      status: runtime.status,
      cpuPercent: running ? parseCpuPercent(runtime.cpuUsage) : null,
      memoryMb: running ? parseMemoryToMb(runtime.memoryUsage) : null,
      memoryLimitMb: running ? parseMemoryToMb(runtime.memoryLimit) : null,
      playersOnline: runtime.playersOnline,
      playersMax: runtime.playersMax,
      uptimeSeconds: runtime.uptimeSeconds,
      tickStatus: running ? 'unavailable' : 'offline',
      tickSource: null,
      tps: null,
      msptMean: null,
      msptMedian: null,
      msptP95: null,
    };
    if (!running) return result;
    try {
      const config = await this.store.readConfig(serverId);
      if (!config) return result;
      if (config.edition === 'BEDROCK') return { ...result, tickStatus: 'unsupported' };
      if (!config.enableRcon) return { ...result, tickStatus: 'rcon_disabled' };
      // NeoForge responds synchronously; spark's async commands can return empty over RCON.
      if (['NEOFORGE', 'AUTO_CURSEFORGE', 'CURSEFORGE'].includes(config.serverType)) {
        const native = await this.management.readTickStats(serverId, 'neoforge');
        if (!native.success) return result;
        const stats = parseNeoForgeStats(native.output);
        if (stats) return { ...result, ...stats, tickStatus: 'available', tickSource: 'neoforge', timestamp: new Date().toISOString() };
      }
      const response = await this.management.readTickStats(serverId, 'spark');
      if (!response.success) return result;
      const stats = parseSparkStats(response.output);
      if (stats) return { ...result, ...stats, tickStatus: 'available', tickSource: 'spark', timestamp: new Date().toISOString() };
      if (/unknown (?:or incomplete )?command|unknown command|incorrect argument for command/i.test(response.output)) {
        result.tickStatus = 'spark_missing';
      }
    } catch {
      // A failed game probe must not discard independently collected container data.
    }
    return result;
  }
}
