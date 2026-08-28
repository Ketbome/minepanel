jest.mock('node:util', () => {
  const execMock = jest.fn();
  return { ...jest.requireActual('node:util'), promisify: () => execMock };
});
jest.mock('fs-extra', () => ({
  ensureDir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  pathExists: jest.fn().mockResolvedValue(true),
}));

import * as fs from 'fs-extra';
import { ProxyRouterService } from './proxy-router.service';

const mockExec = jest.requireMock('node:util').promisify();

describe('ProxyRouterService lifecycle', () => {
  let instanceSettings: Record<string, jest.Mock>;
  let service: ProxyRouterService;

  const build = (unresolved: string[] = []) =>
    new ProxyRouterService(
      { get: jest.fn((key: string) => (key === 'dataHostDir' ? '/srv/minepanel/data' : key === 'unresolvedHostPaths' ? unresolved : undefined)) } as any,
      instanceSettings as any,
      { get: jest.fn().mockResolvedValue({ service: 'backend' }) } as any,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    instanceSettings = {
      getProxy: jest.fn().mockResolvedValue({ enabled: true, baseDomain: 'mc.example.com' }),
      getRouterSettings: jest.fn().mockResolvedValue({ proxyPort: '25565', autoScaleEnabled: false, autoScaleToken: null, autoScaleDownAfter: '10m', autoScaleWakeTimeout: '180s', autoScaleAsleepMotd: 'a', autoScaleLoadingMotd: 'b', extraNetworks: null }),
    };
    service = build();
  });

  it('detects whether the router container is running', async () => {
    mockExec.mockResolvedValueOnce({ stdout: 'abc123\n' });
    expect(await service.isRunning()).toBe(true);
    mockExec.mockResolvedValueOnce({ stdout: '\n' });
    expect(await service.isRunning()).toBe(false);
    mockExec.mockRejectedValueOnce(new Error('no docker'));
    expect(await service.isRunning()).toBe(false);
  });

  it('recognises a router owned by another compose project', async () => {
    mockExec.mockResolvedValueOnce({ stdout: 'minepanel\n' });
    expect(await service.findUnmanagedRouter()).toEqual({ project: 'minepanel' });
    mockExec.mockResolvedValueOnce({ stdout: 'proxy\n' });
    expect(await service.findUnmanagedRouter()).toBeNull();
    mockExec.mockResolvedValueOnce({ stdout: '' });
    expect(await service.findUnmanagedRouter()).toBeNull();
    mockExec.mockRejectedValueOnce(new Error('no such container'));
    expect(await service.findUnmanagedRouter()).toBeNull();
  });

  it('starts by regenerating the compose file and reports failures', async () => {
    mockExec.mockResolvedValueOnce({ stdout: '' });
    expect(await service.start()).toBe(true);
    expect(fs.writeFile).toHaveBeenCalled();
    expect(mockExec).toHaveBeenLastCalledWith('docker compose up -d', { cwd: '/app/data/proxy' });

    mockExec.mockRejectedValueOnce(new Error('compose failed'));
    expect(await service.start()).toBe(false);

    expect(await build(['/app/data']).start()).toBe(false);
  });

  it('stops only when a compose file exists and reports failures', async () => {
    (fs.pathExists as unknown as jest.Mock).mockResolvedValueOnce(false);
    expect(await service.stop()).toBe(true);
    expect(mockExec).not.toHaveBeenCalled();

    mockExec.mockResolvedValueOnce({ stdout: '' });
    expect(await service.stop()).toBe(true);
    expect(mockExec).toHaveBeenLastCalledWith('docker compose down', { cwd: '/app/data/proxy' });

    mockExec.mockRejectedValueOnce(new Error('down failed'));
    expect(await service.stop()).toBe(false);
  });

  it('reconciles on bootstrap without throwing', async () => {
    instanceSettings.getProxy.mockRejectedValueOnce(new Error('db'));
    await expect(service.onApplicationBootstrap()).resolves.toBeUndefined();

    instanceSettings.getProxy.mockResolvedValue({ enabled: false, baseDomain: null });
    mockExec.mockResolvedValueOnce({ stdout: '' }); // not running
    await service.onApplicationBootstrap();
    expect(mockExec).toHaveBeenCalledTimes(1);
  });
});
