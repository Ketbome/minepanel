import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ServerStoreService } from 'src/docker-compose/server-store.service';
import { ServerManagementService, ServerRuntimeStats } from 'src/server-management/server-management.service';
import { parseCpuPercent, parseMemoryToMb } from './metric-parse.util';
import { CustomTickPatterns, parseNeoForgeStats, parseSparkStats, parseTickOutput, TickPatternTimeoutError, TickSource } from './tick-stats';

export type TickStatus = 'available' | 'offline' | 'unsupported' | 'rcon_disabled' | 'spark_missing' | 'custom_paused' | 'unavailable';

export interface TickTestResult {
  success: boolean;
  output: string;
  parsed: { source: TickSource; tps: number; msptMean: number | null; msptMedian: number | null; msptP95: number | null } | null;
}

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
  tickSource: TickSource | null;
  tps: number | null;
  msptMean: number | null;
  msptMedian: number | null;
  msptP95: number | null;
}

// A custom command that keeps answering with nothing usable (empty, unrecognised, or a pattern
// that times out) is paused instead of being polled forever. RCON connection failures do not
// count: they are what a booting server looks like, not a broken command. After the pause it gets
// one retry, and fails straight back into a pause if it is still unusable.
export const CUSTOM_TICK_FAILURE_LIMIT = 5;
export const CUSTOM_TICK_PAUSE_MS = 15 * 60_000;

interface CustomTickBreaker {
  fingerprint: string;
  failures: number;
  pausedUntil: number;
}

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);
  private readonly breakers = new Map<string, CustomTickBreaker>();
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
      const rconPort = config.rconPort || '25575';
      if (config.tickCommand) {
        // An operator-chosen command replaces the built-in probes; no fallback to guesses.
        const patterns = { tps: config.tickTpsPattern, mspt: config.tickMsptPattern };
        const breaker = this.breakerFor(serverId, config.tickCommand, patterns);
        if (breaker.pausedUntil > Date.now()) return { ...result, tickStatus: 'custom_paused' };
        const custom = await this.management.readTickCommand(serverId, config.tickCommand, rconPort, config.rconPassword);
        if (!custom.success) return result;
        const parsed = this.parseCustom(serverId, custom.output, patterns);
        if (!parsed) {
          this.recordCustomFailure(serverId, breaker);
          return result;
        }
        this.breakers.delete(serverId);
        const { source, ...stats } = parsed;
        return { ...result, ...stats, tickStatus: 'available', tickSource: source, timestamp: new Date().toISOString() };
      }
      // NeoForge responds synchronously; spark's async commands can return empty over RCON.
      if (['NEOFORGE', 'AUTO_CURSEFORGE', 'CURSEFORGE'].includes(config.serverType)) {
        const native = await this.management.readTickStats(serverId, 'neoforge', rconPort, config.rconPassword);
        // A failed/unrecognized neoforge probe (transient RCON hiccup, or the pack is actually
        // Forge) does not rule out spark; fall through and try it instead of reporting a false
        // "no connection".
        if (native.success) {
          const stats = parseNeoForgeStats(native.output);
          if (stats) return { ...result, ...stats, tickStatus: 'available', tickSource: 'neoforge', timestamp: new Date().toISOString() };
        }
      }
      const response = await this.management.readTickStats(serverId, 'spark', rconPort, config.rconPassword);
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

  // Editing the command or its patterns starts over, so the breaker needs no explicit reset call.
  private breakerFor(serverId: string, command: string, patterns: CustomTickPatterns): CustomTickBreaker {
    const fingerprint = JSON.stringify([command, patterns.tps, patterns.mspt]);
    let breaker = this.breakers.get(serverId);
    if (!breaker || breaker.fingerprint !== fingerprint) {
      breaker = { fingerprint, failures: 0, pausedUntil: 0 };
      this.breakers.set(serverId, breaker);
    }
    return breaker;
  }

  private parseCustom(serverId: string, output: string, patterns: CustomTickPatterns) {
    try {
      return parseTickOutput(output, patterns);
    } catch (error) {
      if (!(error instanceof TickPatternTimeoutError)) throw error;
      this.logger.warn(`Custom tick pattern for ${serverId} exceeded its time limit`);
      return null;
    }
  }

  private recordCustomFailure(serverId: string, breaker: CustomTickBreaker): void {
    breaker.failures += 1;
    if (breaker.failures < CUSTOM_TICK_FAILURE_LIMIT) return;
    breaker.pausedUntil = Date.now() + CUSTOM_TICK_PAUSE_MS;
    this.logger.warn(`Custom tick command for ${serverId} returned no usable data ${breaker.failures} times in a row; paused for ${CUSTOM_TICK_PAUSE_MS / 60_000} minutes`);
  }

  // Runs a candidate command once for the Metrics tab's "Run & test", without saving anything.
  async testTickCommand(serverId: string, command: string, patterns: CustomTickPatterns = {}): Promise<TickTestResult> {
    if (!/^[a-zA-Z0-9_-]+$/.test(serverId)) throw new BadRequestException('Invalid server ID');
    const config = await this.store.readConfig(serverId);
    if (!config) throw new NotFoundException(`Server with ID "${serverId}" not found`);
    if (config.edition === 'BEDROCK' || !config.enableRcon) throw new BadRequestException('RCON is required and only available on Java servers');
    const response = await this.management.readTickCommand(serverId, command, config.rconPort || '25575', config.rconPassword);
    let parsed: TickTestResult['parsed'];
    try {
      parsed = response.success ? parseTickOutput(response.output, patterns) : null;
    } catch (error) {
      if (error instanceof TickPatternTimeoutError) throw new BadRequestException('Pattern is too slow: it exceeded the match time limit');
      throw error;
    }
    // A working command is a reason to try again straight away instead of waiting out a pause.
    if (parsed) this.breakers.delete(serverId);
    return { ...response, parsed };
  }
}
