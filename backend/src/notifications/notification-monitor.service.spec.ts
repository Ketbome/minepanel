import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { statfs } from 'node:fs/promises';
import { NotificationMonitorService } from './notification-monitor.service';
import { InstanceSettingsService } from 'src/settings/instance-settings.service';
import { NotificationsService } from './notifications.service';
import { ServerStoreService } from 'src/docker-compose/server-store.service';

jest.mock('node:fs/promises', () => ({ statfs: jest.fn() }));
jest.mock('node:child_process', () => ({ execFile: jest.fn() }));

describe('NotificationMonitorService', () => {
  let service: NotificationMonitorService;
  let policy: { alertsEnabled: boolean; diskAlertEnabled: boolean; backupFailureEnabled: boolean; staleBackupEnabled: boolean; staleBackupToleranceMinutes: number; diskFreeThresholdPercent: number; alertCooldownMinutes: number };
  let settings: { getNotifications: jest.Mock };
  let notifications: { sendOperationalAlert: jest.Mock };
  let store: { listServerDirs: jest.Mock; readConfig: jest.Mock };
  let backupRunning: boolean;
  let gameRunning: boolean;
  let output: string;
  let exitCode: number;
  const now = Date.parse('2026-10-01T12:00:00Z');

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(now);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    policy = { alertsEnabled: true, diskAlertEnabled: true, backupFailureEnabled: true, staleBackupEnabled: false, staleBackupToleranceMinutes: 60, diskFreeThresholdPercent: 10, alertCooldownMinutes: 60 };
    settings = { getNotifications: jest.fn(async () => policy) };
    notifications = { sendOperationalAlert: jest.fn().mockResolvedValue(undefined) };
    store = { listServerDirs: jest.fn().mockResolvedValue(['srv']), readConfig: jest.fn().mockResolvedValue({ enableBackup: true }) };
    backupRunning = gameRunning = true; exitCode = 0; output = '';
    (statfs as jest.Mock).mockResolvedValue({ blocks: 100, bavail: 50 });
    (execFile as unknown as jest.Mock).mockImplementation((_cmd, args, _opts, callback) => {
      if (args[0] === 'compose') callback(null, args.at(-1) === 'mc' ? 'generated-mc-id\n' : 'backup-id\n', '');
      else if (args[0] === 'inspect') callback(null, JSON.stringify({ Running: gameRunning }) + '\n' + JSON.stringify({ Running: backupRunning, ExitCode: exitCode }), '');
      else callback(null, '', output);
    });
    service = new NotificationMonitorService(settings as unknown as InstanceSettingsService, notifications as unknown as NotificationsService, store as unknown as ServerStoreService, { get: (key: string) => key === 'serversDir' ? '/mock/servers' : undefined } as unknown as ConfigService);
  });

  afterEach(() => { service.onModuleDestroy(); jest.useRealTimers(); jest.restoreAllMocks(); });

  it('detects low space on the data filesystem, respects cooldown and recovers once with hysteresis', async () => {
    (statfs as jest.Mock).mockResolvedValue({ blocks: 100, bavail: 5 });
    await service.collect();await service.collect();
    expect(statfs).toHaveBeenCalledWith('/mock/servers');
    expect(notifications.sendOperationalAlert).toHaveBeenCalledTimes(1);
    expect(notifications.sendOperationalAlert).toHaveBeenCalledWith('disk', '/mock/servers', expect.stringContaining('5.0%'));
    jest.setSystemTime(now + 60 * 60_000);await service.collect();
    expect(notifications.sendOperationalAlert).toHaveBeenCalledTimes(2);
    (statfs as jest.Mock).mockResolvedValue({ blocks: 100, bavail: 11 });await service.collect();
    expect(notifications.sendOperationalAlert).toHaveBeenCalledTimes(2);
    (statfs as jest.Mock).mockResolvedValue({ blocks: 100, bavail: 20 });await service.collect();await service.collect();
    expect(notifications.sendOperationalAlert).toHaveBeenLastCalledWith('recovery', '/mock/servers', '20.0% free');
    expect(notifications.sendOperationalAlert).toHaveBeenCalledTimes(3);
  });

  it('forgets incidents while alerts are globally disabled', async () => {
    (statfs as jest.Mock).mockResolvedValue({ blocks: 100, bavail: 5 });await service.collect();
    policy.alertsEnabled = false;await service.collect();
    (statfs as jest.Mock).mockResolvedValue({ blocks: 100, bavail: 50 });
    policy.alertsEnabled = true;await service.collect();
    expect(notifications.sendOperationalAlert).toHaveBeenCalledTimes(1);
    expect(notifications.sendOperationalAlert).not.toHaveBeenCalledWith('recovery', expect.anything(), expect.anything());
  });

  it('never counts an unknown disk reading as recovery', async () => {
    (statfs as jest.Mock).mockResolvedValue({ blocks: 100, bavail: 0 });await service.collect();
    (statfs as jest.Mock).mockResolvedValue({ blocks: 0, bavail: 0 });await service.collect();
    (statfs as jest.Mock).mockRejectedValue(new Error('unavailable'));await service.collect();
    expect(notifications.sendOperationalAlert).toHaveBeenCalledTimes(1);
  });

  it('does not alert for a healthy filesystem without an earlier incident', async () => {
    await service.collect();expect(notifications.sendOperationalAlert).not.toHaveBeenCalled();
  });

  it('detects canonical backup failures from bounded logs without forwarding raw credentials', async () => {
    output = '2026-10-01T11:59:50.123456789Z 2026-10-01T11:59:50+0000 ERROR Backup failed with exit code 1\nsecret-repository';
    await service.collect();await service.collect();
    expect(notifications.sendOperationalAlert).toHaveBeenCalledTimes(1);
    expect(notifications.sendOperationalAlert).toHaveBeenCalledWith('backup', 'srv', expect.any(String));
    expect(JSON.stringify(notifications.sendOperationalAlert.mock.calls)).not.toContain('secret');
    expect(execFile).toHaveBeenCalledWith('docker', expect.arrayContaining(['--tail', '500', '--since', '--until', 'backup-id']), expect.objectContaining({ timeout: 5000, maxBuffer: 512 * 1024 }), expect.any(Function));
  });

  it('does not mistake generic errors, stale logs or a successful exit for backup failure', async () => {
    output = '2026-10-01T10:00:00Z 2026-10-01T10:00:00+0000 ERROR Backup failed with exit code 1\n2026-10-01T11:59:50Z ERROR network error';
    await service.collect();backupRunning = false;await service.collect();
    expect(notifications.sendOperationalAlert).not.toHaveBeenCalled();
  });

  it('reports repeated sidecar failures with cooldown only while the game runs', async () => {
    backupRunning = false;exitCode = 1;
    await service.collect();await service.collect();expect(notifications.sendOperationalAlert).toHaveBeenCalledTimes(1);
    jest.setSystemTime(now + 60 * 60_000);await service.collect();expect(notifications.sendOperationalAlert).toHaveBeenCalledTimes(2);
    gameRunning = false;jest.setSystemTime(now + 120 * 60_000);await service.collect();expect(notifications.sendOperationalAlert).toHaveBeenCalledTimes(2);
  });

  it('skips disabled backups and unsafe IDs, and drops removed server state', async () => {
    store.listServerDirs.mockResolvedValue(['srv', '../escape']);store.readConfig.mockResolvedValue({ enableBackup: false });
    await service.collect();expect(store.readConfig).toHaveBeenCalledTimes(1);expect(execFile).not.toHaveBeenCalled();
    store.readConfig.mockResolvedValue({ enableBackup: true });backupRunning = false;exitCode = 1;await service.collect();
    store.listServerDirs.mockResolvedValue(['other']);store.readConfig.mockResolvedValueOnce({ enableBackup: false });await service.collect();
    store.listServerDirs.mockResolvedValue(['srv']);await service.collect();expect(notifications.sendOperationalAlert).toHaveBeenCalledTimes(2);
  });

  it('isolates probe failures and honors global and individual switches', async () => {
    policy.alertsEnabled = false;await service.collect();expect(statfs).not.toHaveBeenCalled();
    policy.alertsEnabled = true;policy.diskAlertEnabled = policy.backupFailureEnabled = false;await service.collect();expect(store.listServerDirs).not.toHaveBeenCalled();
    policy.backupFailureEnabled = true;(execFile as unknown as jest.Mock).mockImplementation((_cmd, _args, _opts, callback) => callback(new Error('secret')));
    await expect(service.collect()).resolves.toBeUndefined();
    expect(JSON.stringify((Logger.prototype.warn as jest.Mock).mock.calls)).not.toContain('secret');
    settings.getNotifications.mockRejectedValue(new Error('secret'));await expect(service.collect()).resolves.toBeUndefined();
  });

  it('avoids overlapping passes and cleans up its timer', async () => {
    let release: (value: typeof policy) => void;
    settings.getNotifications.mockImplementationOnce(() => new Promise((resolve) => { release = resolve; }));
    const first = service.collect();await service.collect();expect(settings.getNotifications).toHaveBeenCalledTimes(1);release!(policy);await first;
    service.onModuleInit();expect(jest.getTimerCount()).toBe(1);service.onModuleDestroy();expect(jest.getTimerCount()).toBe(0);
  });
  it('recognizes a restarting backup sidecar but ignores normal SIGTERM stops', async () => {
    backupRunning = false;exitCode = 143;await service.collect();
    expect(notifications.sendOperationalAlert).not.toHaveBeenCalled();
    (execFile as unknown as jest.Mock).mockImplementation((_cmd, args, _opts, callback) => {
      if (args[0] === 'compose') return callback(null, args.at(-1) === 'mc' ? 'generated-mc-id\n' : 'backup-id\n', '');
      callback(null, args[0] === 'inspect' ? JSON.stringify({ Running: true }) + '\n' + JSON.stringify({ Running: true, Restarting: true, ExitCode: 1 }) : '', '');
    });
    await service.collect();expect(notifications.sendOperationalAlert).toHaveBeenCalledWith('backup', 'srv', expect.any(String));
  });
  it('resolves Compose service IDs rather than assuming the Minecraft container name', async () => {
    (execFile as unknown as jest.Mock).mockImplementation((_cmd, args, _opts, callback) => {
      if (args[0] === 'compose') callback(null, args.at(-1) === 'mc' ? 'generated-mc-id\n' : 'backup-id\n', '');
      else if (args[0] === 'inspect' && args.includes('generated-mc-id')) callback(null, JSON.stringify({ Running: true }) + '\n' + JSON.stringify({ Running: false, ExitCode: 1 }), '');
      else callback(new Error('No such object: srv'));
    });
    await service.collect();
    expect(notifications.sendOperationalAlert).toHaveBeenCalledWith('backup', 'srv', expect.any(String));
    expect(Logger.prototype.warn).not.toHaveBeenCalled();
  });

  it('does not warn when stopped Compose projects have no containers', async () => {
    (execFile as unknown as jest.Mock).mockImplementation((_cmd, _args, _opts, callback) => callback(new Error('Error response from daemon: No such object: srv')));
    await service.collect();expect(Logger.prototype.warn).not.toHaveBeenCalled();
  });
  it('uses the backup sidecar schedule when Minecraft restarts independently', async () => {
    policy.staleBackupEnabled = true; policy.backupFailureEnabled = false; policy.staleBackupToleranceMinutes = 1;
    store.readConfig.mockResolvedValue({ enableBackup: true, edition: 'JAVA', backupMethod: 'restic', backupInterval: '1h', backupInitialDelay: '2m' });
    (execFile as unknown as jest.Mock).mockImplementation((_cmd, args, _opts, callback) => {
      if (args[0] === 'compose') callback(null, args.at(-1) === 'mc' ? 'mc-id' : 'backup-id', '');
      else if (args[0] === 'inspect') callback(null, JSON.stringify({ Running: true, StartedAt: new Date(now - 10 * 60_000).toISOString() }) + '\n' + JSON.stringify({ Running: true, StartedAt: new Date(now - 3 * 3_600_000).toISOString() }), '');
      else callback(null, JSON.stringify([{ time: new Date(now - 30 * 60_000).toISOString() }]), '');
    });
    await service.collect();
    expect(notifications.sendOperationalAlert).not.toHaveBeenCalled();
    expect(execFile).toHaveBeenCalledWith('docker', expect.arrayContaining(['exec', 'backup-id', 'restic', 'snapshots', '--no-lock']), expect.any(Object), expect.any(Function));
  });

  it('detects overdue restic snapshots and recovers only after a valid fresh snapshot', async () => {
    policy.staleBackupEnabled = true;policy.backupFailureEnabled = false;
    store.readConfig.mockResolvedValue({ enableBackup: true, edition: 'JAVA', backupMethod: 'restic', backupInterval: '1h', backupInitialDelay: '0' });
    let snapshots: unknown = [];
    (execFile as unknown as jest.Mock).mockImplementation((_cmd, args, _opts, callback) => {
      if (args[0] === 'compose') callback(null, args.at(-1) === 'mc' ? 'mc-id' : 'backup-id', '');
      else if (args[0] === 'inspect') callback(null, JSON.stringify({ Running: true, StartedAt: new Date(now - 3 * 3_600_000).toISOString() }) + '\n' + JSON.stringify({ Running: true, StartedAt: new Date(now - 3 * 3_600_000).toISOString() }), '');
      else callback(null, JSON.stringify(snapshots), '');
    });
    await service.collect();expect(notifications.sendOperationalAlert).toHaveBeenCalledWith('stale', 'srv', expect.any(String));
    snapshots = [{ time: 'bad timestamp' }];jest.setSystemTime(now + 5 * 60_000);await service.collect();expect(notifications.sendOperationalAlert).toHaveBeenCalledTimes(1);
    snapshots = [{ time: new Date(now + 9 * 60_000).toISOString() }];jest.setSystemTime(now + 10 * 60_000);await service.collect();
    expect(notifications.sendOperationalAlert).toHaveBeenLastCalledWith('recovery', 'srv', 'A new restic snapshot was observed.');
    expect(execFile).toHaveBeenCalledWith('docker', expect.arrayContaining(['--host', 'srv', '--path', '/data']), expect.any(Object), expect.any(Function));
  });

  it('does not infer overdue backups for Bedrock, intentional pauses or custom compose schedules', async () => {
    policy.staleBackupEnabled = true;policy.backupFailureEnabled = false;
    for (const config of [{ edition: 'BEDROCK' }, { edition: 'JAVA', pauseIfNoPlayers: true }, { edition: 'JAVA', composeSnippets: [{ yaml: 'custom' }] }]) {
      store.readConfig.mockResolvedValue({ enableBackup: true, backupMethod: 'restic', ...config });await service.collect();
    }
    expect(notifications.sendOperationalAlert).not.toHaveBeenCalled();
    expect((execFile as unknown as jest.Mock).mock.calls.some((call) => call[1][0] === 'exec')).toBe(false);
  });
  it('keeps explicit backup failure detection independent from an unknown freshness probe', async () => {
    policy.staleBackupEnabled = true;policy.backupFailureEnabled = true;
    store.readConfig.mockResolvedValue({ enableBackup: true, edition: 'JAVA', backupMethod: 'restic', backupInterval: '1h' });
    output = '2026-10-01T11:59:50Z 2026-10-01T11:59:50+0000 ERROR Backup failed with exit code 1';
    (execFile as unknown as jest.Mock).mockImplementation((_cmd, args, _opts, callback) => {
      if (args[0] === 'compose') callback(null, args.at(-1) === 'mc' ? 'mc-id' : 'backup-id', '');
      else if (args[0] === 'inspect') callback(null, JSON.stringify({ Running: true, StartedAt: new Date(now - 3 * 3_600_000).toISOString() }) + '\n' + JSON.stringify({ Running: true, StartedAt: new Date(now - 3 * 3_600_000).toISOString() }), '');
      else if (args[0] === 'exec') callback(new Error('private repository credentials'));
      else callback(null, '', output);
    });
    await service.collect();expect(notifications.sendOperationalAlert).toHaveBeenCalledWith('backup', 'srv', expect.any(String));
    expect(JSON.stringify((Logger.prototype.warn as jest.Mock).mock.calls)).not.toContain('credentials');
  });
});
