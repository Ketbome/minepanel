import { ProxyController } from './proxy.controller';

describe('ProxyController', () => {
  const req = { user: { userId: 1 } };
  let proxyService: Record<string, jest.Mock>;
  let accessControl: { assertServerAccess: jest.Mock; getVisibleServerIds: jest.Mock };
  let controller: ProxyController;
  let instanceSettings: Record<string, jest.Mock>;
  let velocity: { isRunning: jest.Mock; getAddresses: jest.Mock };

  beforeEach(() => {
    proxyService = {
      getRoutesStatus: jest.fn().mockResolvedValue({ hasRoutesFile: true, routesCount: 2 }),
      getProxySettings: jest.fn().mockResolvedValue({ enabled: true, baseDomain: 'mc.example.com' }),
      getAllMappings: jest.fn().mockResolvedValue([{ host: 'a', backend: 'a:25565' }]),
      getServerHostname: jest.fn().mockResolvedValue('a.mc.example.com'),
      addServerToProxy: jest.fn().mockResolvedValue(undefined),
      removeServerFromProxy: jest.fn().mockResolvedValue(undefined),
    };
    accessControl = { assertServerAccess: jest.fn(), getVisibleServerIds: jest.fn((_user, ids: string[]) => ids.filter((id) => id === 'a')) };
    instanceSettings = {
      getEdge: jest.fn().mockResolvedValue({ enabled: true, mode: 'mc-router', baseDomain: 'mc.example.com' }),
      getRouterSettings: jest.fn().mockResolvedValue({ proxyPort: 25565, autoScaleEnabled: true, autoScaleToken: 't' }),
    };
    velocity = { isRunning: jest.fn().mockResolvedValue(false), getAddresses: jest.fn().mockResolvedValue({ a: 'a.mc.example.com', b: 'b.mc.example.com' }) } as any;
    controller = new ProxyController(
      proxyService as any,
      instanceSettings as any,
      { isRunning: jest.fn().mockResolvedValue(true) } as any,
      velocity as any,
      { getRequiredUserById: jest.fn().mockResolvedValue({ id: 1 }) } as any,
      accessControl as any,
    );
  });

  it('aggregates the proxy status', async () => {
    expect(await controller.getStatus()).toEqual({
      available: true,
      enabled: true,
      mode: 'mc-router',
      baseDomain: 'mc.example.com',
      proxyPort: 25565,
      autoScaleAvailable: true,
      running: true,
      hasRoutesFile: true,
      routesCount: 2,
    });
  });

  it('only lists mappings of servers the caller can see', async () => {
    proxyService.getAllMappings.mockResolvedValue([{ host: 'a', backend: 'a:25565' }, { host: 'secret', backend: 'b:25565' }]);
    expect(await controller.getMappings({ user: { userId: 1 } })).toEqual([{ host: 'a', backend: 'a:25565' }]);
  });

  it('reports the proxy as unavailable without a base domain', async () => {
    instanceSettings.getEdge.mockResolvedValue({ enabled: false, mode: 'mc-router', baseDomain: null });
    expect(await controller.getStatus()).toMatchObject({ available: false, enabled: false });
  });

  it('reports the Velocity container and hides auto-scaling while Velocity is the edge', async () => {
    instanceSettings.getEdge.mockResolvedValue({ enabled: true, mode: 'velocity', baseDomain: null });
    velocity.isRunning.mockResolvedValue(true);
    expect(await controller.getStatus()).toMatchObject({ enabled: true, mode: 'velocity', running: true, autoScaleAvailable: false });
  });

  it('serves Velocity forced hosts instead of routes.json while Velocity is the edge', async () => {
    instanceSettings.getEdge.mockResolvedValue({ enabled: true, mode: 'velocity', baseDomain: 'mc.example.com' });

    expect(await controller.getMappings(req)).toEqual([{ host: 'a.mc.example.com', backend: 'a:25565' }]);
    expect(await controller.getServerHostname(req, 'a')).toEqual({ hostname: 'a.mc.example.com' });
    velocity.getAddresses.mockResolvedValue({});
    expect(await controller.getServerHostname(req, 'a')).toEqual({ hostname: null });
    expect(proxyService.getAllMappings).not.toHaveBeenCalled();
  });

  it('checks server access before per-server routes', async () => {
    expect(await controller.getServerHostname(req, 'a')).toEqual({ hostname: 'a.mc.example.com' });
    expect(await controller.addServer(req, 'a', { baseDomain: 'evil.example.com', hostname: 'play' } as any)).toEqual({ success: true });
    expect(proxyService.addServerToProxy).toHaveBeenCalledWith('a', 'mc.example.com', 'play');
    expect(await controller.removeServer(req, 'a')).toEqual({ success: true });
    expect(accessControl.assertServerAccess).toHaveBeenCalledTimes(3);
    expect(accessControl.assertServerAccess).toHaveBeenCalledWith({ id: 1 }, 'a');
  });
});
