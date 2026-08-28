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
      command.startsWith('docker ps') ? 'backend sha256:backend-old\nfrontend sha256:frontend-old' : '',
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

    it('is false when the panel service cannot be identified', async () => {
      hostContext.get.mockResolvedValue({ ...composeContext, service: undefined });

      expect(await service.canSelfUpdate()).toBe(false);
    });
  });

  describe('start', () => {
    it('refuses when there is no compose stack to act on', async () => {
      hostContext.get.mockResolvedValue({ configFiles: [] });

      await expect(service.start()).rejects.toBeInstanceOf(UpdateNotSupportedError);
      expect(execMock).not.toHaveBeenCalled();
    });

    it('refuses when the panel service cannot be identified', async () => {
      hostContext.get.mockResolvedValue({ ...composeContext, service: undefined });

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

      expect(runCommand()).toContain(`--mount 'type=bind,src=/opt/minepanel,dst=/opt/minepanel'`);
      expect(runCommand()).toContain(`-w '/opt/minepanel'`);
      expect(runCommand()).not.toContain('/workspace');
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

      expect(runCommand()).toContain('/opt/minepanel/docker-compose.yml');
      expect(runCommand()).toContain('/opt/minepanel/override.yml');
    });

    it('mounts compose files outside the working directory', async () => {
      hostContext.get.mockResolvedValue({
        ...composeContext,
        configFiles: ['/opt/minepanel/docker-compose.yml', '/etc/minepanel/override.yml'],
      });

      await service.start();

      expect(runCommand()).toContain(
        `--mount 'type=bind,src=/etc/minepanel/override.yml,dst=/etc/minepanel/override.yml,readonly'`,
      );
    });

    // The daemon resolves this mount on the host: the panel's own /app/data
    // would send the outcome to a directory it cannot read back.
    it('writes the outcome to the host directory behind /app/data', async () => {
      await service.start();

      expect(runCommand()).toContain(`--mount 'type=bind,src=/opt/minepanel/data,dst=/result'`);
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

      expect(runCommand()).toContain('exec -T backend node -e');
      expect(runCommand()).toContain('/health');
      expect(runCommand()).toContain('r.statusCode === 200');
      expect(runCommand()).toContain('AbortSignal.timeout(10000)');
      expect(runCommand()).toContain('{ signal }');
      expect(runCommand()).toContain(')).on(');
      expect(runCommand()).toContain('error');
      expect(runCommand()).toContain('write_result succeeded');
    });

    it('restores the previous images when the new version never comes up', async () => {
      await service.start();

      expect(runCommand()).toContain('write_result rolled-back');
      expect(runCommand()).toContain('sha256:backend-old');
      expect(runCommand()).toContain('sha256:frontend-old');
    });

    it('records the images it started from so a rollback has somewhere to go', async () => {
      const result = await service.start();

      expect(result.fromDigests).toEqual({
        backend: 'sha256:backend-old',
        frontend: 'sha256:frontend-old',
      });
      expect(execMock.mock.calls[0][0]).toContain('com.docker.compose.image');
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
