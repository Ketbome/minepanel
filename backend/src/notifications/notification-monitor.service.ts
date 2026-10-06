import { backupDuration } from './backup-freshness';
import { ServerConfig } from 'src/server-management/dto/server-config.model';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { statfs } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { ServerStoreService } from 'src/docker-compose/server-store.service';
import { InstanceSettingsService } from 'src/settings/instance-settings.service';
import { NotificationsService } from './notifications.service';

const INTERVAL_MS = 60_000;
const MINUTE_MS = 60_000;
type Policy = Awaited<ReturnType<InstanceSettingsService['getNotifications']>>;

function runDocker(args: string[], cwd?: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile('docker', args, { timeout: 5_000, maxBuffer: 512 * 1024, ...(cwd ? { cwd } : {}) }, (error, stdout, stderr) => {
      if (error) reject(Object.assign(error, { stderr }));
      else resolve({ stdout, stderr });
    });
  });
}

@Injectable()
export class NotificationMonitorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationMonitorService.name);
  private timer: NodeJS.Timeout | null = null;
  private collecting = false;
  private diskIncident = false;
  private diskLastAlert: number | null = null;
  private readonly freshnessChecks = new Map<string, number>();
  private readonly staleIncidents = new Set<string>();
  private readonly staleAlerts = new Map<string, number>();
  private readonly backupCursors = new Map<string, number>();
  private readonly backupLastAlerts = new Map<string, number>();

  constructor(
    private readonly settings: InstanceSettingsService,
    private readonly notifications: NotificationsService,
    private readonly store: ServerStoreService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => { void this.collect(); }, INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async collect(): Promise<void> {
    if (this.collecting) return;
    this.collecting = true;
    try {
      const policy = await this.settings.getNotifications();
      // Incidents seen before a switch was turned off are no longer observed; never recover them later.
      if (!policy.alertsEnabled || !policy.diskAlertEnabled) {
        this.diskIncident = false;
        this.diskLastAlert = null;
      }
      if (!policy.alertsEnabled || (!policy.backupFailureEnabled && !policy.staleBackupEnabled)) {
        this.freshnessChecks.clear(); this.staleIncidents.clear(); this.staleAlerts.clear();
        this.backupCursors.clear();
        this.backupLastAlerts.clear();
      }
      if (!policy.alertsEnabled) return;
      if (policy.diskAlertEnabled) {
        try { await this.checkDisk(policy); } catch { this.logger.warn('Disk notification probe unavailable'); }
      }
      if (!policy.backupFailureEnabled && !policy.staleBackupEnabled) return;
      const ids = (await this.store.listServerDirs()).filter((id) => /^[a-zA-Z0-9_-]+$/.test(id));
      if (ids.length === 0) return;
      const present = new Set(ids);
      for (const id of this.freshnessChecks.keys()) if (!present.has(id)) this.freshnessChecks.delete(id);
      for (const id of this.staleIncidents) if (!present.has(id)) this.staleIncidents.delete(id);
      for (const id of this.staleAlerts.keys()) if (!present.has(id)) this.staleAlerts.delete(id);
      for (const id of this.backupCursors.keys()) if (!present.has(id)) this.backupCursors.delete(id);
      for (const id of this.backupLastAlerts.keys()) if (!present.has(id)) this.backupLastAlerts.delete(id);
      for (let offset = 0; offset < ids.length; offset += 4) {
        await Promise.all(ids.slice(offset, offset + 4).map(async (id) => {
          try { await this.checkBackup(id, policy); } catch (error) {
            const diagnostic = `${(error as Error)?.message ?? ''} ${(error as { stderr?: string })?.stderr ?? ''}`;
            if (!/no such (?:object|container)/i.test(diagnostic)) this.logger.warn(`Backup notification probe unavailable for ${id}`);
          }
        }));
      }
    } catch {
      this.logger.warn('Notification monitoring unavailable');
    } finally {
      this.collecting = false;
    }
  }

  private async checkDisk(policy: Policy): Promise<void> {
    const directory = this.config.get<string>('serversDir');
    if (!directory) return;
    const stats = await statfs(directory);
    if (!(stats.blocks > 0) || !Number.isFinite(stats.bavail)) return;
    const freePercent = Math.max(0, stats.bavail / stats.blocks * 100);
    if (freePercent <= policy.diskFreeThresholdPercent) {
      this.diskIncident = true;
      if (this.diskLastAlert === null || Date.now() - this.diskLastAlert >= policy.alertCooldownMinutes * MINUTE_MS) {
        this.diskLastAlert = Date.now();
        await this.notifications.sendOperationalAlert('disk', directory, `${freePercent.toFixed(1)}% free; threshold ${policy.diskFreeThresholdPercent}%`);
      }
    } else if (this.diskIncident && freePercent > policy.diskFreeThresholdPercent + 2) {
      // A small margin prevents alternating warning/recovery messages near the threshold.
      this.diskIncident = false;
      this.diskLastAlert = null;
      await this.notifications.sendOperationalAlert('recovery', directory, `${freePercent.toFixed(1)}% free`);
    }
  }

  private async checkBackup(serverId: string, policy: Policy): Promise<void> {
    const config = await this.store.readConfig(serverId);
    if (!config?.enableBackup) {
      this.staleIncidents.delete(serverId); this.staleAlerts.delete(serverId); this.freshnessChecks.delete(serverId);
      this.backupCursors.delete(serverId);
      this.backupLastAlerts.delete(serverId);
      return;
    }
    const directory = path.join(this.config.get<string>('serversDir'), serverId);
    const prefix = this.config.get<string>('composeProject')?.trim();
    const compose = ['compose', ...(prefix ? ['--project-name', `${prefix.toLowerCase()}_${serverId.toLowerCase()}`] : [])];
    const mc = (await runDocker([...compose, 'ps', '-q', 'mc'], directory)).stdout.trim();
    if (!mc) return;
    const backup = (await runDocker([...compose, 'ps', '-a', '-q', 'backup'], directory)).stdout.trim();
    if (!backup) return;
    const inspection = await runDocker(['inspect', '--format', '{{json .State}}', mc, backup]);
    const states = inspection.stdout.trim().split('\n').map((line) => JSON.parse(line) as { Running: boolean; Restarting?: boolean; ExitCode: number; StartedAt?: string });
    if (states.length !== 2 || states[0].Running !== true) return;
    if (policy.staleBackupEnabled) {
      if (states[1].Running === true && states[1].Restarting !== true) {
        try { await this.checkFreshness(serverId, config, policy, backup, states[0].StartedAt); }
        catch { this.logger.warn(`Backup freshness probe unavailable for ${serverId}`); }
      }
    } else { this.staleIncidents.delete(serverId); this.staleAlerts.delete(serverId); }
    if (!policy.backupFailureEnabled) return;
    const now = Date.now();
    let failed = (states[1].Running === false || states[1].Restarting === true) && Number.isInteger(states[1].ExitCode) && states[1].ExitCode > 0 && states[1].ExitCode !== 143;
    if (states[1].Running === true) {
      const since = Math.max(this.backupCursors.get(serverId) ?? now - INTERVAL_MS, now - 5 * INTERVAL_MS);
      const logs = await runDocker(['logs', '--timestamps', '--tail', '500', '--since', new Date(since).toISOString(), '--until', new Date(now).toISOString(), backup]);
      const lines = `${logs.stdout}\n${logs.stderr}`.split('\n');
      failed ||= lines.some((line) => {
        const match = /^(\S+)\s+\S+\s+(?:ERROR|WARN)\s+Backup failed with exit code ([1-9]\d*)\s*$/.exec(line);
        const timestamp = match ? Date.parse(match[1]) : NaN;
        return match !== null && timestamp > since && timestamp <= now;
      });
      this.backupCursors.set(serverId, now);
    }
    if (!failed) return;
    const last = this.backupLastAlerts.get(serverId);
    if (last !== undefined && now - last < policy.alertCooldownMinutes * MINUTE_MS) return;
    this.backupLastAlerts.set(serverId, now);
    // Backup logs may contain repository credentials; never forward the raw log text.
    await this.notifications.sendOperationalAlert('backup', serverId, 'The backup sidecar reported a failed backup or exited with an error. Check its logs.');
  }

  private async checkFreshness(serverId: string, config: ServerConfig, policy: Policy, backup: string, startedAt?: string): Promise<void> {
    if (config.edition === 'BEDROCK' || config.backupMethod !== 'restic' || config.pauseIfNoPlayers || config.composeSnippets?.length) return;
    const interval = backupDuration(config.backupInterval || '24h');
    const initial = backupDuration(config.backupInitialDelay || '2m', true);
    const started = Date.parse(startedAt || '');
    const now = Date.now();
    if (interval === null || initial === null || !Number.isFinite(started) || started > now) return;
    const lastCheck = this.freshnessChecks.get(serverId);
    if (lastCheck !== undefined && now - lastCheck < 5 * MINUTE_MS) return;
    this.freshnessChecks.set(serverId, now);
    const result = await runDocker(['exec', backup, 'restic', 'snapshots', '--json', '--host', serverId, '--path', '/data', '--latest', '1']);
    const snapshots = JSON.parse(result.stdout) as Array<{ time?: string }>;
    if (!Array.isArray(snapshots)) return;
    const times = snapshots.map((snapshot) => Date.parse(snapshot.time || ''));
    if (times.some((time) => !Number.isFinite(time) || time > now)) return;
    const latest = times.length ? Math.max(...times) : 0;
    const expected = latest >= started ? latest + interval : started + initial + (config.backupOnStartup === false ? interval : 0);
    if (now > expected + policy.staleBackupToleranceMinutes * MINUTE_MS) {
      this.staleIncidents.add(serverId);
      const previous = this.staleAlerts.get(serverId);
      if (previous === undefined || now - previous >= policy.alertCooldownMinutes * MINUTE_MS) {
        this.staleAlerts.set(serverId, now);
        await this.notifications.sendOperationalAlert('stale', serverId, 'No new restic snapshot was observed within the expected interval and tolerance.');
      }
    } else if (latest > 0 && this.staleIncidents.delete(serverId)) {
      this.staleAlerts.delete(serverId);
      await this.notifications.sendOperationalAlert('recovery', serverId, 'A new restic snapshot was observed.');
    }
  }

}
