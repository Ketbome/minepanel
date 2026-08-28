import { EventEmitter } from 'node:events';
import { SHUTDOWN_BUFFER_SECONDS } from './dto/server-config.model';

jest.mock('fs-extra', () => ({
  pathExists: jest.fn(),
  readdir: jest.fn(),
  stat: jest.fn(),
  readFile: jest.fn(),
  remove: jest.fn(),
  ensureDir: jest.fn(),
  ensureDirSync: jest.fn(),
  move: jest.fn(),
}));

jest.mock('node:child_process', () => ({
  exec: jest.fn(),
  spawn: jest.fn(),
}));

jest.mock('node:util', () => {
  const execMock = jest.fn();
  return { ...jest.requireActual('node:util'), promisify: () => execMock };
});

import * as fs from 'fs-extra';
import { spawn } from 'node:child_process';
import { ServerManagementService } from './server-management.service';

const mockExec = jest.requireMock('node:util').promisify();

type ExecResult = { stdout: string; stderr?: string };
type SpawnResult = { stdout?: string; stderr?: string; exitCode?: number; error?: Error };

const dirent = (name: string, kind: 'dir' | 'file') => ({ name, isDirectory: () => kind === 'dir', isFile: () => kind === 'file' });

const COMPOSE_JAVA = `
services:
  mc:
    image: itzg/minecraft-server:java21
    ports:
      - "25565:25565"
    environment:
      STOP_SERVER_ANNOUNCE_DELAY: "30"
      UID: "1000"
      GID: "1000"
    deploy:
      resources:
        limits:
          cpus: "2"
          memory: 6G
    labels:
      minepanel.proxy.enabled: "true"
      minepanel.proxy.hostname: play.example.com
`;

const COMPOSE_BEDROCK = `
services:
  mc:
    image: itzg/minecraft-bedrock-server:latest
    ports:
      - "19132:19132/udp"
    stop_grace_period: 45s
    environment:
      UID: "1001"
      GID: "bad"
`;

describe('ServerManagementService lifecycle', () => {
  let service: ServerManagementService;
  let existing: string[];
  let execRoutes: Array<[RegExp, ExecResult | ((cmd: string) => ExecResult | Promise<ExecResult>)]>;
  let spawnQueue: SpawnResult[];
  let settingsRepo: { findOne: jest.Mock };
  let discord: { sendServerNotification: jest.Mock };
  let alerts: { markExpectedStop: jest.Mock };
  let store: { removeFromIndex: jest.Mock; readConfig: jest.Mock };
  let composeService: { refreshComposeFile: jest.Mock };
  let instanceSettings: { getNetwork: jest.Mock; getProxy: jest.Mock };
  let compose: string;

  const route = (pattern: RegExp, result: ExecResult | ((cmd: string) => ExecResult | Promise<ExecResult>)) => execRoutes.unshift([pattern, result]);
  const execCalls = () => mockExec.mock.calls.map((call) => call[0] as string);

  const build = (composeProject?: string) =>
    new ServerManagementService(
      { get: jest.fn((key: string) => ({ serversDir: '/app/servers', serversHostDir: '/srv/servers', composeProject }[key])) } as any,
      settingsRepo as any,
      discord as any,
      alerts as any,
      store as any,
      instanceSettings as any,
      composeService as any,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    existing = ['/app/servers/srv', '/app/servers/srv/docker-compose.yml'];
    execRoutes = [];
    spawnQueue = [];
    compose = COMPOSE_JAVA;

    (fs.pathExists as unknown as jest.Mock).mockImplementation(async (p: string) => existing.includes(p));
    (fs.readFile as unknown as jest.Mock).mockImplementation(async () => compose);
    (fs.readdir as unknown as jest.Mock).mockResolvedValue([]);
    (fs.stat as unknown as jest.Mock).mockResolvedValue({ isDirectory: () => true, mtime: new Date('2026-01-01T00:00:00Z') });
    mockExec.mockImplementation(async (cmd: string) => {
      for (const [pattern, result] of execRoutes) {
        if (pattern.test(cmd)) return typeof result === 'function' ? result(cmd) : result;
      }
      return { stdout: '', stderr: '' };
    });
    (spawn as jest.Mock).mockImplementation(() => {
      const result = spawnQueue.shift() ?? { stdout: '', exitCode: 0 };
      const child = Object.assign(new EventEmitter(), { stdout: new EventEmitter(), stderr: new EventEmitter() });
      process.nextTick(() => {
        if (result.error) {
          child.emit('error', result.error);
          return;
        }
        if (result.stdout) child.stdout.emit('data', Buffer.from(result.stdout));
        if (result.stderr) child.stderr.emit('data', Buffer.from(result.stderr));
        child.emit('close', result.exitCode ?? 0);
      });
      return child;
    });

    route(/docker compose ps -aq mc/, { stdout: 'abc123\n' });
    route(/docker inspect --format="\{\{.State.Status\}\}"/, { stdout: 'running\n' });

    settingsRepo = { findOne: jest.fn().mockResolvedValue({ discordWebhook: 'https://hook', language: 'en' }) };
    discord = { sendServerNotification: jest.fn().mockResolvedValue(undefined) };
    alerts = { markExpectedStop: jest.fn() };
    store = { removeFromIndex: jest.fn().mockResolvedValue(undefined), readConfig: jest.fn().mockResolvedValue({ edition: 'JAVA', maxPlayers: '20' }) };
    composeService = { refreshComposeFile: jest.fn().mockResolvedValue(undefined) };
    instanceSettings = {
      getNetwork: jest.fn().mockResolvedValue({ publicIp: '1.2.3.4', lanIp: '10.0.0.2' }),
      getProxy: jest.fn().mockResolvedValue({ enabled: false, baseDomain: null }),
    };
    service = build();
  });

  describe('worlds', () => {
    it('returns nothing for an invalid id', async () => {
      expect(await service.listAvailableWorlds('bad id')).toEqual([]);
    });

    it('migrates legacy worlds and lists local and global sources with selection state', async () => {
      existing.push('/app/servers/srv/mc-data/worlds', '/app/servers/srv/worlds/nested/deep/level.dat', '/app/servers/srv/mc-data/My World/level.dat', '/app/servers/.world/worlds/shared.zip');
      (fs.readdir as unknown as jest.Mock).mockImplementation(async (p: string, opts?: unknown) => {
        if (p === '/app/servers/srv/mc-data/worlds') return ['legacy.zip'];
        if (p === '/app/servers/srv/worlds' && !opts) return [];
        if (p === '/app/servers/srv/worlds') return [dirent('nested', 'dir'), dirent('notes.txt', 'file'), dirent('old.tar.gz', 'file')];
        if (p === '/app/servers/srv/worlds/nested') return [dirent('deep', 'dir')];
        if (p === '/app/servers/.world/worlds') return [dirent('shared.zip', 'file')];
        return [];
      });

      const worlds = await service.listAvailableWorlds('srv', 'nested/deep', ' My World ', 'local');

      expect(fs.move).toHaveBeenCalledWith('/app/servers/srv/mc-data/worlds/legacy.zip', '/app/servers/srv/worlds/legacy.zip');
      expect(worlds.map((w) => [w.displayPath, w.scope, w.type, w.selected, w.copied, w.defaultLevelName])).toEqual([
        ['nested/deep', 'local', 'directory', true, true, 'deep'],
        ['old.tar.gz', 'local', 'archive', false, false, 'old'],
        ['shared.zip', 'global', 'archive', false, false, 'shared'],
      ]);
    });
  });

  describe('stop, restart and start', () => {
    it('stopServer uses the announce delay plus buffer as compose timeout', async () => {
      expect(await service.stopServer('srv')).toBe(true);
      expect(execCalls()).toContain(`docker compose down --timeout ${30 + SHUTDOWN_BUFFER_SECONDS}`);
      expect(alerts.markExpectedStop).toHaveBeenCalledWith('srv');
      expect(discord.sendServerNotification).toHaveBeenCalledWith('https://hook', 'stopped', 'srv', 'en', expect.objectContaining({ port: '25565', ip: '1.2.3.4', lanIp: '10.0.0.2' }));
    });

    it('stopServer honours stop_grace_period and falls back to the default', async () => {
      compose = COMPOSE_BEDROCK;
      await service.stopServer('srv');
      expect(execCalls()).toContain('docker compose down --timeout 45');

      compose = 'services:\n  mc:\n    stop_grace_period: nope\n';
      await service.stopServer('srv');
      expect(execCalls()).toContain(`docker compose down --timeout ${SHUTDOWN_BUFFER_SECONDS}`);

      (fs.readFile as unknown as jest.Mock).mockRejectedValueOnce(new Error('io'));
      await service.stopServer('srv');
      expect(execCalls().filter((c) => c === `docker compose down --timeout ${SHUTDOWN_BUFFER_SECONDS}`)).toHaveLength(2);
    });

    it('stopServer reports failures and notifies discord', async () => {
      existing = ['/app/servers/srv'];
      expect(await service.stopServer('srv')).toBe(false);

      existing.push('/app/servers/srv/docker-compose.yml');
      route(/docker compose down/, () => Promise.reject(new Error('compose failed')));
      expect(await service.stopServer('srv')).toBe(false);
      expect(discord.sendServerNotification).toHaveBeenLastCalledWith('https://hook', 'error', 'srv', 'en', expect.objectContaining({ reason: 'Failed to stop server' }));
    });

    it('restartServer refreshes the compose file and uses the compose project name', async () => {
      service = build(' Panel ');
      expect(await service.restartServer('srv')).toBe(true);
      expect(composeService.refreshComposeFile).toHaveBeenCalledWith('srv', false);
      const upCall = mockExec.mock.calls.find((call) => call[0] === 'docker compose up -d');
      expect(upCall[1]).toEqual({ cwd: '/app/servers/srv', env: expect.objectContaining({ COMPOSE_PROJECT_NAME: 'panel_srv' }) });

      expect(await service.restartServer('bad id')).toBe(false);
      existing = ['/app/servers/srv'];
      expect(await service.restartServer('srv')).toBe(false);
      existing.push('/app/servers/srv/docker-compose.yml');
      route(/docker compose up/, () => Promise.reject(new Error('up failed')));
      expect(await service.restartServer('srv')).toBe(false);
    });

    it('startServer fixes bedrock permissions, stops a stale container and starts', async () => {
      compose = COMPOSE_BEDROCK;
      existing.push('/app/servers/srv/mc-data');
      (fs.readdir as unknown as jest.Mock).mockResolvedValue([]);

      expect(await service.startServer('srv')).toBe(true);

      const chown = (spawn as jest.Mock).mock.calls.find((call) => call[1][0] === 'run');
      expect(chown[1]).toEqual(['run', '--rm', '-v', '/srv/servers/srv/mc-data:/data', 'alpine', 'chown', '-R', '1001:1000', '/data']);
      expect(execCalls()).toEqual(expect.arrayContaining([expect.stringMatching(/docker compose down/), 'docker compose up -d']));
      expect(discord.sendServerNotification).toHaveBeenCalledWith('https://hook', 'started', 'srv', 'en', expect.objectContaining({ port: '19132' }));
    });

    it('startServer validates inputs and reports failures', async () => {
      expect(await service.startServer('bad id')).toBe(false);
      existing = ['/app/servers/srv'];
      expect(await service.startServer('srv')).toBe(false);
      existing.push('/app/servers/srv/docker-compose.yml');
      route(/docker compose up/, () => Promise.reject(new Error('up failed')));
      expect(await service.startServer('srv')).toBe(false);
      expect(discord.sendServerNotification).toHaveBeenLastCalledWith('https://hook', 'error', 'srv', 'en', expect.objectContaining({ reason: 'Failed to start server' }));
    });

    it('startServer survives a failing permission fix', async () => {
      compose = COMPOSE_BEDROCK;
      existing.push('/app/servers/srv/mc-data');
      spawnQueue.push({ error: new Error('no docker') });
      expect(await service.startServer('srv')).toBe(true);
    });

    it('forceStopServer asks the server to stop over RCON before compose down', async () => {
      spawnQueue.push({ stdout: '', exitCode: 0 });
      route(/docker inspect --format="\{\{.State.Status\}\}"/, { stdout: 'exited\n' });

      expect(await service.forceStopServer('srv')).toBe(true);
      expect((spawn as jest.Mock).mock.calls[0][1]).toEqual(['exec', 'abc123', 'rcon-cli', 'stop']);
      expect(execCalls()).toContain('docker compose down --timeout 10');
    });

    it('forceStopServer falls back to compose when RCON is rejected or unavailable', async () => {
      spawnQueue.push({ stdout: 'nope', exitCode: 1 });
      expect(await service.forceStopServer('srv')).toBe(true);
      spawnQueue.push({ error: new Error('exec failed') });
      expect(await service.forceStopServer('srv')).toBe(true);

      compose = COMPOSE_BEDROCK;
      (spawn as jest.Mock).mockClear();
      expect(await service.forceStopServer('srv')).toBe(true);
      expect(spawn).not.toHaveBeenCalled();

      expect(await service.forceStopServer('bad id')).toBe(false);
      existing = ['/app/servers/srv'];
      expect(await service.forceStopServer('srv')).toBe(false);
      existing.push('/app/servers/srv/docker-compose.yml');
      route(/docker compose down/, () => Promise.reject(new Error('down failed')));
      expect(await service.forceStopServer('srv')).toBe(false);
    });
  });

  describe('data and deletion', () => {
    it('clearServerData stops the server and recreates mc-data', async () => {
      existing.push('/app/servers/srv/mc-data');
      expect(await service.clearServerData('srv')).toBe(true);
      expect(fs.remove).toHaveBeenCalledWith('/app/servers/srv/mc-data');
      expect(fs.ensureDir).toHaveBeenCalledWith('/app/servers/srv/mc-data');

      existing = ['/app/servers/srv'];
      expect(await service.clearServerData('srv')).toBe(false);
      expect(await service.clearServerData('bad id')).toBe(false);
      (fs.remove as unknown as jest.Mock).mockRejectedValueOnce(new Error('busy'));
      existing.push('/app/servers/srv/mc-data');
      expect(await service.clearServerData('srv')).toBe(false);
    });

    it('deleteServer stops, removes files, index and volumes', async () => {
      route(/docker volume ls/, { stdout: 'srv_data\nsrv_backups\n' });
      expect(await service.deleteServer('srv')).toBe(true);
      expect(fs.remove).toHaveBeenCalledWith('/app/servers/srv');
      expect(store.removeFromIndex).toHaveBeenCalledWith('srv');
      expect(execCalls()).toEqual(expect.arrayContaining(['docker volume rm srv_data', 'docker volume rm srv_backups']));
      expect(discord.sendServerNotification).toHaveBeenCalledWith('https://hook', 'deleted', 'srv', 'en', expect.any(Object));
    });

    it('deleteServer tolerates stop and volume errors and validates inputs', async () => {
      route(/docker compose down/, () => Promise.reject(new Error('down failed')));
      route(/docker volume ls/, () => Promise.reject(new Error('no docker')));
      expect(await service.deleteServer('srv')).toBe(true);

      expect(await service.deleteServer('bad id')).toBe(false);
      existing = [];
      expect(await service.deleteServer('srv')).toBe(false);
      existing = ['/app/servers/srv'];
      (fs.remove as unknown as jest.Mock).mockRejectedValueOnce(new Error('busy'));
      expect(await service.deleteServer('srv')).toBe(false);
    });
  });

  describe('status and info', () => {
    it('getAllServersStatus skips hidden folders and folders without a compose file', async () => {
      (fs.readdir as unknown as jest.Mock).mockResolvedValue(['.world', 'srv', 'plain', 'file.txt']);
      (fs.stat as unknown as jest.Mock).mockImplementation(async (p: string) => ({ isDirectory: () => !p.endsWith('file.txt') }));
      expect(await service.getAllServersStatus()).toEqual({ srv: 'running' });

      (fs.readdir as unknown as jest.Mock).mockRejectedValueOnce(new Error('io'));
      expect(await service.getAllServersStatus()).toEqual({});
    });

    it('getServerStatus maps container states and errors', async () => {
      route(/docker inspect --format="\{\{.State.Status\}\}"/, { stdout: 'paused\n' });
      expect(await service.getServerStatus('srv')).toBe('stopped');
      route(/docker inspect --format="\{\{.State.Status\}\}"/, { stdout: 'created\n' });
      expect(await service.getServerStatus('srv')).toBe('starting');
      route(/docker inspect --format="\{\{.State.Status\}\}"/, { stdout: 'weird\n' });
      expect(await service.getServerStatus('srv')).toBe('stopped');

      route(/docker compose ps -aq mc/, { stdout: '\n' });
      route(/docker ps -a --filter "name=\^\/srv\$"/, { stdout: 'x1\nx2\n' });
      route(/docker inspect --format="\{\{.State.Status\}\}"/, { stdout: 'running\n' });
      expect(await service.getServerStatus('srv')).toBe('running');

      route(/docker ps -a --filter "name=\^\/srv\$"/, { stdout: '' });
      expect(await service.getServerStatus('srv')).toBe('stopped');
      existing = ['/app/servers/srv'];
      expect(await service.getServerStatus('srv')).toBe('not_found');

      route(/docker inspect/, () => Promise.reject(new Error('docker down')));
      existing.push('/app/servers/srv/docker-compose.yml');
      route(/docker compose ps -aq mc/, { stdout: 'abc\n' });
      expect(await service.getServerStatus('srv')).toBe('not_found');
    });

    it('getServerInfo measures the world folder', async () => {
      existing.push('/app/servers/srv/mc-data', '/app/servers/srv/mc-data/world');
      route(/du -sb/, { stdout: '2048\n' });
      const info = await service.getServerInfo('srv');
      expect(info).toMatchObject({ exists: true, status: 'running', dockerComposeExists: true, mcDataExists: true, worldSize: 2048, worldSizeFormatted: '2 KB' });
      expect(info.lastUpdated).toEqual(new Date('2026-01-01T00:00:00Z'));

      existing = [];
      expect(await service.getServerInfo('srv')).toEqual({ exists: false, status: 'not_found' });
      expect(await service.getServerInfo('bad id')).toMatchObject({ exists: false, error: 'Invalid server ID' });

      existing = ['/app/servers/srv', '/app/servers/srv/docker-compose.yml', '/app/servers/srv/mc-data', '/app/servers/srv/mc-data/world'];
      route(/du -sb/, () => Promise.reject(new Error('du failed')));
      expect(await service.getServerInfo('srv')).toMatchObject({ exists: false, error: 'du failed' });
    });

    it('getServerResources parses docker stats', async () => {
      route(/docker stats abc123 --no-stream --format "\{\{.CPUPerc\}\}"/, { stdout: '12.5%\n' });
      route(/docker stats abc123 --no-stream --format "\{\{.MemUsage\}\}"/, { stdout: '1GiB / 4GiB\n' });
      expect(await service.getServerResources('srv')).toEqual({ cpuUsage: '12.5%', memoryUsage: '1GiB', memoryLimit: '4GiB' });
      expect(await service.getServerResources('bad id')).toEqual({ cpuUsage: 'N/A', memoryUsage: 'N/A', memoryLimit: 'N/A' });
    });

    it('collects resources and runtime stats for every server in one pass', async () => {
      (fs.readdir as unknown as jest.Mock).mockResolvedValue(['srv', 'idle']);
      existing.push('/app/servers/idle', '/app/servers/idle/docker-compose.yml');
      route(/docker stats --no-stream --format/, { stdout: 'abc123\tsrv\t5%\t512MiB / 2GiB\nzzz\tidle-minecraft-1\t1%\t100MiB / 1GiB\nbroken line\n' });
      route(/docker compose ps -aq mc/, { stdout: 'abc123\n' });
      route(/docker inspect --format="\{\{.State.Status\}\}"/, { stdout: 'running\n' });
      spawnQueue.push({ stdout: 'abc123full 2026-01-01T00:00:00Z\n', exitCode: 0 }, { stdout: '', exitCode: 1 }, { stdout: '', exitCode: 1 });

      const resources = await service.getAllServersResources();
      expect(resources.srv).toEqual({ status: 'running', cpuUsage: '5%', memoryUsage: '512MiB', memoryLimit: '2GiB', cpuLimit: '2', memoryConfigLimit: '6G' });
      expect(resources.idle).toMatchObject({ status: 'running', cpuUsage: '5%' });

      const stats = await service.getAllServersRuntimeStats();
      expect(stats.srv).toMatchObject({ status: 'running', playersOnline: null, gameReachable: false });
      expect(typeof stats.srv.uptimeSeconds === 'number' || stats.srv.uptimeSeconds === null).toBe(true);
    });

    it('collectServersResources falls back gracefully', async () => {
      (fs.readdir as unknown as jest.Mock).mockResolvedValue(['srv']);
      route(/docker stats --no-stream --format/, () => Promise.reject(new Error('no stats')));
      route(/docker inspect --format="\{\{.State.Status\}\}"/, { stdout: 'exited\n' });
      compose = 'not: [valid';
      const resources = await service.getAllServersResources();
      expect(resources.srv).toEqual({ status: 'stopped', cpuUsage: 'N/A', memoryUsage: 'N/A', memoryLimit: 'N/A', cpuLimit: '1', memoryConfigLimit: '4G' });

      const stats = await service.getAllServersRuntimeStats();
      expect(stats.srv.gameReachable).toBe(false);

      (fs.readdir as unknown as jest.Mock).mockRejectedValueOnce(new Error('io'));
      expect(await service.getAllServersResources()).toEqual({});
    });

    it('getServerRuntimeStats reads limits and probe config errors', async () => {
      store.readConfig.mockRejectedValueOnce(new Error('no config'));
      spawnQueue.push({ stdout: '', exitCode: 1 }, { stdout: '', exitCode: 1 });
      route(/docker stats abc123 --no-stream --format "\{\{.CPUPerc\}\}"/, { stdout: '1%\n' });
      route(/docker stats abc123 --no-stream --format "\{\{.MemUsage\}\}"/, { stdout: '1GiB / 4GiB\n' });
      const stats = await service.getServerRuntimeStats('srv');
      expect(stats).toMatchObject({ status: 'running', cpuLimit: '2', memoryConfigLimit: '6G', playersMax: null, gameReachable: false });

      route(/docker compose ps -aq mc/, () => Promise.reject(new Error('boom')));
      route(/docker ps -a --filter/, () => Promise.reject(new Error('boom')));
      expect((await service.getServerRuntimeStats('srv')).status).toBe('not_found');
    });
  });

  describe('logs', () => {
    it('getServerLogs analyzes docker output', async () => {
      route(/docker logs --tail 50/, { stdout: '[INFO] started\n[WARN] slow tick\n[ERROR] Exception: boom\n' });
      const result = await service.getServerLogs('srv', 50);
      expect(result).toMatchObject({ hasErrors: true, status: 'running', metadata: { totalLines: 3, errorCount: 1, warningCount: 1 } });

      existing = [];
      expect((await service.getServerLogs('srv')).logs).toBe('Server not found');
      existing = ['/app/servers/srv', '/app/servers/srv/docker-compose.yml'];
      route(/docker compose ps -aq mc/, { stdout: '' });
      route(/docker ps -a --filter/, { stdout: '' });
      expect((await service.getServerLogs('srv')).logs).toBe('Container not found');

      route(/docker compose ps -aq mc/, { stdout: 'abc123\n' });
      route(/docker logs --tail/, () => Promise.reject(new Error('docker gone')));
      expect((await service.getServerLogs('srv')).logs).toContain('docker gone');
    });

    it('getServerLogsStream tracks the last timestamp', async () => {
      spawnQueue.push({ stdout: '2026-01-01T10:00:00.000000000Z [INFO] a\n2026-01-01T10:00:01.500000000Z [INFO] b\n', exitCode: 0 });
      const stream = await service.getServerLogsStream('srv', 10);
      expect(stream.lastTimestamp).toBe('2026-01-01T10:00:01.501Z');
      expect((spawn as jest.Mock).mock.calls[(spawn as jest.Mock).mock.calls.length - 1][1]).toEqual(['logs', '--tail', '10', '--timestamps', 'abc123']);

      spawnQueue.push({ stdout: 'no timestamp here\n', stderr: 'err\n', exitCode: 0 });
      const since = await service.getServerLogsStream('srv', 10, '5m');
      expect(since.lastTimestamp).toBeUndefined();
      expect(since.logs).toBe('no timestamp here\nerr\n');
      expect((spawn as jest.Mock).mock.calls[(spawn as jest.Mock).mock.calls.length - 1][1]).toEqual(['logs', '--since', '5m', '--timestamps', 'abc123']);

      existing = [];
      expect((await service.getServerLogsStream('srv')).logs).toBe('Server not found');
      existing = ['/app/servers/srv', '/app/servers/srv/docker-compose.yml'];
      route(/docker compose ps -aq mc/, { stdout: '' });
      route(/docker ps -a --filter/, { stdout: '' });
      expect((await service.getServerLogsStream('srv')).logs).toBe('Container not found');
      route(/docker ps -a --filter/, () => Promise.reject(new Error('gone')));
      jest.spyOn(console, 'error').mockImplementation(() => {});
      expect((await service.getServerLogsStream('srv')).hasErrors).toBe(true);
    });

    it('getServerLogsSince reports whether anything new arrived', async () => {
      spawnQueue.push({ stdout: '', exitCode: 0 });
      expect((await service.getServerLogsSince('srv', '2026-01-01T00:00:00Z')).hasNewContent).toBe(false);
      spawnQueue.push({ stdout: '[ERROR] x\n', exitCode: 0 });
      expect(await service.getServerLogsSince('srv', '1m')).toMatchObject({ hasNewContent: true, hasErrors: true });

      expect((await service.getServerLogsSince('bad id', '1m')).logs).toBe('Invalid server ID');
      existing = [];
      expect((await service.getServerLogsSince('srv', '1m')).logs).toBe('Server not found');
      existing = ['/app/servers/srv', '/app/servers/srv/docker-compose.yml'];
      route(/docker compose ps -aq mc/, { stdout: '' });
      route(/docker ps -a --filter/, { stdout: '' });
      expect((await service.getServerLogsSince('srv', '1m')).logs).toBe('Container not found');
      route(/docker ps -a --filter/, () => Promise.reject(new Error('gone')));
      expect((await service.getServerLogsSince('srv', '1m')).hasErrors).toBe(true);
    });
  });

  describe('backups and players', () => {
    it('getBackupSnapshots parses restic output and maps errors', async () => {
      route(/restic snapshots/, { stdout: JSON.stringify([{ id: 'abcdef1234567890', time: 't', paths: ['/data'], tags: ['x'], hostname: 'h' }, { short_id: 's', paths: 'nope' }]) });
      const result = await service.getBackupSnapshots('srv');
      expect(result.success).toBe(true);
      expect(result.snapshots).toEqual([
        { id: 'abcdef1234567890', shortId: 'abcdef12', time: 't', paths: ['/data'], tags: ['x'], hostname: 'h' },
        { id: '', shortId: 's', time: '', paths: [], tags: [], hostname: '' },
      ]);

      route(/restic snapshots/, () => Promise.reject(new Error('Error: No such container: srv-backup')));
      expect((await service.getBackupSnapshots('srv')).error).toBe('Backup container is not running');
      route(/restic snapshots/, () => Promise.reject(new Error('repo locked')));
      expect((await service.getBackupSnapshots('srv')).error).toMatch(/Could not list/);
      expect((await service.getBackupSnapshots('bad id')).error).toBe('Invalid server ID');
    });

    it('executeCommand on Bedrock only reports delivery', async () => {
      compose = COMPOSE_BEDROCK;
      route(/Commands not supported/, { stdout: '', stderr: '' });
      expect(await service.executeCommand('srv', 'list', '19132')).toEqual({ success: true, output: 'Command sent (output visible in server logs)' });
      route(/Commands not supported/, { stdout: '', stderr: 'permission denied' });
      expect(await service.executeCommand('srv', 'list', '19132')).toEqual({ success: false, output: 'Execution failed: permission denied' });

      expect(await service.executeCommand('bad id', 'list', '1')).toEqual({ success: false, output: 'Invalid server ID' });
      existing = [];
      expect(await service.executeCommand('srv', 'list', '1')).toEqual({ success: false, output: 'Server not found' });
    });

    it('getOnlinePlayers parses the Java list output', async () => {
      spawnQueue.push({ stdout: 'There are 2 of a max of 20 players online: alice, bob', exitCode: 0 });
      expect(await service.getOnlinePlayers('srv', '25575', 'pw')).toEqual({ online: 2, max: 20, players: ['alice', 'bob'], supportsRcon: true });
      expect((spawn as jest.Mock).mock.calls[(spawn as jest.Mock).mock.calls.length - 1][1]).toEqual(['exec', 'abc123', 'rcon-cli', '--port', '25575', '--password', 'pw', 'list']);

      spawnQueue.push({ stdout: 'There are 0 of a max of 20 players online:', exitCode: 0 });
      expect((await service.getOnlinePlayers('srv', '25575')).players).toEqual([]);

      spawnQueue.push({ stdout: 'something else', exitCode: 0 });
      expect((await service.getOnlinePlayers('srv', '25575')).online).toBe(0);

      spawnQueue.push({ stdout: '', exitCode: 1 });
      expect((await service.getOnlinePlayers('srv', '25575')).online).toBe(0);
    });

    it('getOnlinePlayers reads the Bedrock list from the logs', async () => {
      compose = COMPOSE_BEDROCK;
      route(/docker logs --tail 20/, { stdout: 'There are 1/10 players online: steve\n' });
      expect(await service.getOnlinePlayers('srv', '19132')).toEqual({ online: 1, max: 10, players: ['steve'], supportsRcon: false });

      route(/docker logs --tail 20/, { stdout: 'nothing\n' });
      expect((await service.getOnlinePlayers('srv', '19132')).online).toBe(0);

      route(/docker compose ps -aq mc/, { stdout: '' });
      route(/docker ps -a --filter/, { stdout: '' });
      expect((await service.getOnlinePlayers('srv', '19132')).supportsRcon).toBe(false);

      route(/docker ps -a --filter/, () => Promise.reject(new Error('gone')));
      expect((await service.getOnlinePlayers('srv', '19132')).online).toBe(0);
    });

    it('reads ops and banned players from mc-data', async () => {
      existing.push('/app/servers/srv/mc-data/ops.json', '/app/servers/srv/mc-data/banned-players.json');
      (fs.readFile as unknown as jest.Mock).mockImplementation(async (p: string) => (p.endsWith('ops.json') ? '[{"name":"op"}]' : '{bad'));
      expect(await service.getOps('srv')).toEqual([{ name: 'op' }]);
      expect(await service.getBannedPlayers('srv')).toEqual([]);
      expect(await service.getOps('other')).toEqual([]);
    });
  });

  describe('discord enrichment', () => {
    it('uses the proxy hostname for Java servers when the proxy is on', async () => {
      instanceSettings.getProxy.mockResolvedValue({ enabled: true, baseDomain: 'mc.example.com' });
      await service.stopServer('srv');
      expect(discord.sendServerNotification).toHaveBeenCalledWith('https://hook', 'stopped', 'srv', 'en', { ip: 'play.example.com', port: undefined, lanIp: undefined });

      // A server that opted out of the proxy gets no hostname, and the IPs only apply when the proxy is off.
      compose = 'services:\n  mc:\n    image: itzg/minecraft-server\n    labels:\n      minepanel.proxy.enabled: "false"\n';
      await service.stopServer('srv');
      expect(discord.sendServerNotification).toHaveBeenLastCalledWith('https://hook', 'stopped', 'srv', 'en', { port: undefined });

      compose = 'services:\n  mc:\n    image: itzg/minecraft-server\n';
      await service.stopServer('srv');
      expect(discord.sendServerNotification).toHaveBeenLastCalledWith('https://hook', 'stopped', 'srv', 'en', expect.objectContaining({ ip: 'srv.mc.example.com' }));
    });

    it('skips notifications without a webhook and survives settings errors', async () => {
      settingsRepo.findOne.mockResolvedValue(null);
      await service.stopServer('srv');
      expect(discord.sendServerNotification).not.toHaveBeenCalled();

      settingsRepo.findOne.mockRejectedValue(new Error('db'));
      await service.stopServer('srv');
      expect(discord.sendServerNotification).not.toHaveBeenCalled();

      settingsRepo.findOne.mockResolvedValue({ discordWebhook: 'https://hook' });
      discord.sendServerNotification.mockRejectedValueOnce(new Error('discord down'));
      expect(await service.stopServer('srv')).toBe(true);
    });

    it('falls back when the compose file cannot be parsed', async () => {
      (fs.readFile as unknown as jest.Mock).mockRejectedValue(new Error('io'));
      await service.stopServer('srv');
      expect(discord.sendServerNotification).toHaveBeenCalledWith('https://hook', 'stopped', 'srv', 'en', { port: undefined, ip: '1.2.3.4', lanIp: '10.0.0.2' });
    });
  });
});
