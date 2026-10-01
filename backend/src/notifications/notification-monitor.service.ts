import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { statfs } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { ServerStoreService } from 'src/docker-compose/server-store.service';
import { InstanceSettingsService } from 'src/settings/instance-settings.service';
import { NotificationsService } from './notifications.service';

const INTERVAL_MS = 60_000;
type Policy = Awaited<ReturnType<InstanceSettingsService['getNotifications']>>;

function runDocker(args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile('docker', args, { timeout: 5_000, maxBuffer: 512 * 1024 }, (error, stdout, stderr) => {
      if (error) reject(error);
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
      if (!policy.alertsEnabled) return;
      if (policy.diskAlertEnabled) {
        try { await this.checkDisk(policy); } catch { this.logger.warn('Disk notification probe unavailable'); }
      } else {
        this.diskIncident = false;
        this.diskLastAlert = null;
      }
      if (!policy.backupFailureEnabled) {
        this.backupCursors.clear();
        this.backupLastAlerts.clear();
        return;
      }
      const ids = (await this.store.listServerDirs()).filter((id) => /^[a-zA-Z0-9_-]+$/.test(id));
      const present = new Set(ids);
      for (const id of this.backupCursors.keys()) if (!present.has(id)) this.backupCursors.delete(id);
      for (const id of this.backupLastAlerts.keys()) if (!present.has(id)) this.backupLastAlerts.delete(id);
      for (let offset = 0; offset < ids.length; offset += 4) {
        await Promise.all(ids.slice(offset, offset + 4).map(async (id) => {
          try { await this.checkBackup(id, policy); } catch { this.logger.warn(`Backup notification probe unavailable for ${id}`); }
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
      if (this.diskLastAlert === null || Date.now() - this.diskLastAlert >= policy.alertCooldownMinutes * INTERVAL_MS) {
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
      this.backupCursors.delete(serverId);
      this.backupLastAlerts.delete(serverId);
      return;
    }
    const inspection = await runDocker(['inspect', '--format', '{{json .State}}', serverId, `${serverId}-backup`]);
    const states = inspection.stdout.trim().split('\n').map((line) => JSON.parse(line) as { Running: boolean; Restarting?: boolean; ExitCode: number });
    if (states.length !== 2 || states[0].Running !== true) return;
    const now = Date.now();
    let failed = (states[1].Running === false || states[1].Restarting === true) && Number.isInteger(states[1].ExitCode) && states[1].ExitCode > 0 && states[1].ExitCode !== 143;
    if (states[1].Running === true) {
      const since = Math.max(this.backupCursors.get(serverId) ?? now - INTERVAL_MS, now - 5 * INTERVAL_MS);
      const logs = await runDocker(['logs', '--timestamps', '--tail', '500', '--since', new Date(since).toISOString(), '--until', new Date(now).toISOString(), `${serverId}-backup`]);
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
    if (last !== undefined && now - last < policy.alertCooldownMinutes * INTERVAL_MS) return;
    this.backupLastAlerts.set(serverId, now);
    // Backup logs may contain repository credentials; never forward the raw log text.
    await this.notifications.sendOperationalAlert('backup', serverId, 'The backup sidecar reported a failed backup or exited with an error. Check its logs.');
  }
}
