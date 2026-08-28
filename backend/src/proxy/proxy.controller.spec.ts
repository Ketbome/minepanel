import { ProxyController } from './proxy.controller';

describe('ProxyController', () => {
  const req = { user: { userId: 1 } };
  let proxyService: Record<string, jest.Mock>;
  let accessControl: { assertServerAccess: jest.Mock };
  let controller: ProxyController;

  beforeEach(() => {
    proxyService = {
      getRoutesStatus: jest.fn().mockResolvedValue({ hasRoutesFile: true, routesCount: 2 }),
      getProxySettings: jest.fn().mockResolvedValue({ enabled: true, baseDomain: 'mc.example.com' }),
      getAllMappings: jest.fn().mockResolvedValue([{ host: 'a', backend: 'a:25565' }]),
      getServerHostname: jest.fn().mockResolvedValue('a.mc.example.com'),
      addServerToProxy: jest.fn().mockResolvedValue(undefined),
      removeServerFromProxy: jest.fn().mockResolvedValue(undefined),
    };
    accessControl = { assertServerAccess: jest.fn() };
    controller = new ProxyController(
      proxyService as any,
      { getRouterSettings: jest.fn().mockResolvedValue({ proxyPort: 25565, autoScaleEnabled: true, autoScaleToken: 't' }) } as any,
      { isRunning: jest.fn().mockResolvedValue(true) } as any,
      { getRequiredUserById: jest.fn().mockResolvedValue({ id: 1 }) } as any,
      accessControl as any,
    );
  });

  it('aggregates the proxy status', async () => {
    expect(await controller.getStatus()).toEqual({
      available: true,
      enabled: true,
      baseDomain: 'mc.example.com',
      proxyPort: 25565,
      autoScaleAvailable: true,
      running: true,
      hasRoutesFile: true,
      routesCount: 2,
    });
    expect(await controller.getMappings()).toEqual([{ host: 'a', backend: 'a:25565' }]);
  });

  it('reports the proxy as unavailable without a base domain', async () => {
    proxyService.getProxySettings.mockResolvedValue({ enabled: true, baseDomain: null });
    expect(await controller.getStatus()).toMatchObject({ available: false, enabled: false });
  });

  it('checks server access before per-server routes', async () => {
    expect(await controller.getServerHostname(req, 'a')).toEqual({ hostname: 'a.mc.example.com' });
    expect(await controller.addServer(req, 'a', { baseDomain: 'mc.example.com', hostname: 'play' })).toEqual({ success: true });
    expect(proxyService.addServerToProxy).toHaveBeenCalledWith('a', 'mc.example.com', 'play');
    expect(await controller.removeServer(req, 'a')).toEqual({ success: true });
    expect(accessControl.assertServerAccess).toHaveBeenCalledTimes(3);
    expect(accessControl.assertServerAccess).toHaveBeenCalledWith({ id: 1 }, 'a');
  });
});
