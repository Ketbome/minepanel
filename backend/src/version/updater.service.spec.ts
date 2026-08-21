import * as fs from 'fs-extra';
import { ConfigService } from '@nestjs/config';
import { HostContextService } from 'src/common/docker/host-context.service';
import { UpdateNotSupportedError, UpdaterService } from './updater.service';

const execMock = jest.fn();
jest.mock('node:child_process', () => ({
  exec: (command: string, callback: (...args: unknown[]) => void) => {
    callback(null, { stdout: execMock(command) ?? '', stderr: '' });
  },
}));

jest.mock('fs-extra', () => ({
  pathExists: jest.fn().mockResolvedValue(false),
  readJson: jest.fn(),
  outputJson: jest.fn().mockResolvedValue(undefined),
}));

describe('UpdaterService', () => {
  let service: UpdaterService;
  let hostContext: jest.Mocked<HostContextService>;
  let config: jest.Mocked<ConfigService>;

  const composeContext = {
    project: 'minepanel',
    workingDir: '/opt/minepanel',
    configFiles: ['/opt/minepanel/docker-compose.yml'],
    service: 'backend',
  };

  const runCommand = (): string => execMock.mock.calls.map(([command]) => command).find((command) => command.startsWith('docker run')) ?? '';

  beforeEach(() => {
    jest.clearAllMocks();
    // What `docker ps` reports for the running stack, i.e. the images a rollback
    // would go back to.
    execMock.mockImplementation((command: string) =>
      command.startsWith('docker ps') ? 'backend ketbom/minepanel-backend:1.11.30\nfrontend ketbom/minepanel-frontend:1.11.30' : '',
    );
    hostContext = { get: jest.fn().mockResolvedValue(composeContext) } as never;
    config = { get: jest.fn().mockReturnValue('/opt/minepanel/data') } as never;
    service = new UpdaterService(hostContext, config);
  });

  describe('canSelfUpdate', () => {
    it('is true for a panel started by compose', async () => {
      expect(await service.canSelfUpdate()).toBe(true);
    });

    it('is false when the panel was not started by compose', async () => {
      hostContext.get.mockResolvedValue({ configFiles: [] });

      expect(await service.canSelfUpdate()).toBe(false);
    });
  });

  describe('start', () => {
    it('refuses when there is no compose stack to act on', async () => {
      hostContext.get.mockResolvedValue({ configFiles: [] });

      await expect(service.start()).rejects.toBeInstanceOf(UpdateNotSupportedError);
      expect(execMock).not.toHaveBeenCalled();
    });

    // The whole point: the panel must not be the process running the recreate,
    // because it dies halfway through.
    it('hands the work to a detached throwaway container', async () => {
      await service.start();

      expect(runCommand()).toContain('docker run -d --rm');
      expect(runCommand()).toContain('-v /var/run/docker.sock:/var/run/docker.sock');
    });

    it('mounts the host compose directory it was started from', async () => {
      await service.start();

      expect(runCommand()).toContain(`-v '/opt/minepanel':/workspace`);
      expect(runCommand()).toContain('-w /workspace');
    });

    it('pulls and recreates the stack', async () => {
      await service.start();

      expect(runCommand()).toContain('docker compose');
      expect(runCommand()).toContain('pull');
      expect(runCommand()).toContain('up -d');
    });

    it('passes every compose file the panel was started with', async () => {
      hostContext.get.mockResolvedValue({
        ...composeContext,
        configFiles: ['/opt/minepanel/docker-compose.yml', '/opt/minepanel/override.yml'],
      });

      await service.start();

      expect(runCommand()).toContain('docker-compose.yml');
      expect(runCommand()).toContain('override.yml');
    });

    // The daemon resolves this mount on the host: the panel's own /app/data
    // would send the outcome to a directory it cannot read back.
    it('writes the outcome to the host directory behind /app/data', async () => {
      await service.start();

      expect(runCommand()).toContain(`-v '/opt/minepanel/data':/result`);
    });

    it('leaves an outcome behind when the updater dies before deciding', async () => {
      await service.start();

      expect(runCommand()).toContain('trap');
      expect(runCommand()).toContain('write_result failed');
    });

    it('says so instead of quietly mounting a container path when the host data dir is unknown', async () => {
      config.get.mockReturnValue(undefined);
      const warn = jest.spyOn(service['logger'], 'warn').mockImplementation();

      await service.start();

      expect(warn).toHaveBeenCalledWith(expect.stringContaining('/app/data'));
    });

    it('waits for the panel to answer before calling it a success', async () => {
      await service.start();

      expect(runCommand()).toContain('exec -T backend');
      expect(runCommand()).toContain('write_result succeeded');
    });

    it('restores the previous images when the new version never comes up', async () => {
      await service.start();

      expect(runCommand()).toContain('write_result rolled-back');
      expect(runCommand()).toContain('ketbom/minepanel-backend:1.11.30');
      expect(runCommand()).toContain('ketbom/minepanel-frontend:1.11.30');
    });

    it('records the images it started from so a rollback has somewhere to go', async () => {
      const result = await service.start();

      expect(result.fromDigests).toEqual({
        backend: 'ketbom/minepanel-backend:1.11.30',
        frontend: 'ketbom/minepanel-frontend:1.11.30',
      });
    });

    it('records that an update is in flight so the panel can report it after restarting', async () => {
      await service.start();

      expect(fs.outputJson).toHaveBeenCalledWith(
        '/app/data/update-result.json',
        expect.objectContaining({ status: 'running' }),
        expect.anything(),
      );
    });
  });

  describe('getLastResult', () => {
    it('returns null when no update has ever run', async () => {
      expect(await service.getLastResult()).toBeNull();
    });

    it('returns the recorded outcome of the last update', async () => {
      (fs.pathExists as unknown as jest.Mock).mockResolvedValue(true);
      (fs.readJson as unknown as jest.Mock).mockResolvedValue({ status: 'rolled-back' });

      expect(await service.getLastResult()).toEqual({ status: 'rolled-back' });
    });

    it('does not throw when the result file is unreadable', async () => {
      (fs.pathExists as unknown as jest.Mock).mockResolvedValue(true);
      (fs.readJson as unknown as jest.Mock).mockRejectedValue(new Error('corrupt'));

      expect(await service.getLastResult()).toBeNull();
    });
  });
});
