import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';
import { HostContextService } from 'src/common/docker/host-context.service';
import { InstanceSettingsService } from 'src/settings/instance-settings.service';
import { ProxyRouterService } from './proxy-router.service';

const execMock = jest.fn();
jest.mock('node:child_process', () => ({
  exec: (command: string, options: unknown, callback?: (...args: unknown[]) => void) => {
    const done = typeof options === 'function' ? (options as (...args: unknown[]) => void) : callback!;
    execMock(command, typeof options === 'function' ? undefined : options);
    done(null, { stdout: '', stderr: '' });
  },
}));

jest.mock('fs-extra', () => ({
  ensureDir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  pathExists: jest.fn().mockResolvedValue(true),
}));

describe('ProxyRouterService', () => {
  let service: ProxyRouterService;
  let instanceSettings: any;
  let hostContext: any;

  const routerSettings = (overrides: Record<string, unknown> = {}) => ({
    proxyPort: '25565',
    autoScaleEnabled: false,
    autoScaleToken: null,
    autoScaleDownAfter: '10m',
    autoScaleWakeTimeout: '180s',
    autoScaleAsleepMotd: 'Server is asleep. Join to wake it up!',
    autoScaleLoadingMotd: 'Server is starting...',
    extraNetworks: null,
    ...overrides,
  });

  const lastWrittenCompose = (): string => {
    const calls = (fs.writeFile as unknown as jest.Mock).mock.calls;
    return calls[calls.length - 1][1] as string;
  };

  const generatedCompose = async (): Promise<any> => {
    await service.generateComposeFile();
    return yaml.load(lastWrittenCompose());
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    instanceSettings = {
      getRouterSettings: jest.fn().mockResolvedValue(routerSettings()),
      getProxy: jest.fn().mockResolvedValue({ enabled: false, baseDomain: null }),
    };
    hostContext = { get: jest.fn().mockResolvedValue({ service: 'backend', configFiles: [] }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProxyRouterService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn((key: string) => (key === 'dataHostDir' ? '/host/minepanel/data' : null)) },
        },
        { provide: InstanceSettingsService, useValue: instanceSettings },
        { provide: HostContextService, useValue: hostContext },
      ],
    }).compile();

    service = module.get(ProxyRouterService);
  });

  describe('generated compose file', () => {
    it('attaches to the panel network as external, the way server stacks do', async () => {
      const compose = await generatedCompose();

      expect(compose.networks['minepanel-network']).toEqual({ external: true });
      expect(compose.services['mc-router'].networks).toEqual(['minepanel-network']);
    });

    it('mounts the proxy data directory using a host path', async () => {
      const compose = await generatedCompose();

      expect(compose.services['mc-router'].volumes).toEqual(['/host/minepanel/data/proxy:/data']);
    });

    it('publishes the configured port', async () => {
      instanceSettings.getRouterSettings.mockResolvedValue(routerSettings({ proxyPort: '25577' }));

      const compose = await generatedCompose();

      expect(compose.services['mc-router'].ports).toEqual(['25577:25565']);
    });

    it('leaves auto-scaling out entirely when it is disabled', async () => {
      const compose = await generatedCompose();
      const environment = compose.services['mc-router'].environment;

      expect(environment.AUTO_SCALE_UP).toBeUndefined();
      expect(environment.AUTO_SCALE_WEBHOOK_URL).toBeUndefined();
    });

    it('points the webhook at the panel service name it discovered', async () => {
      instanceSettings.getRouterSettings.mockResolvedValue(routerSettings({ autoScaleEnabled: true, autoScaleToken: 'secret' }));

      const compose = await generatedCompose();
      const environment = compose.services['mc-router'].environment;

      expect(environment.AUTO_SCALE_WEBHOOK_URL).toBe('http://backend:8091/servers/autoscale');
      expect(environment.AUTO_SCALE_WEBHOOK_HEADERS).toBe('Authorization=Bearer secret');
      expect(environment.AUTO_SCALE_DOWN_AFTER).toBe('10m');
    });

    // The all-in-one image runs the panel as "minepanel", not "backend".
    it('uses the single-container service name when that is how the panel runs', async () => {
      hostContext.get.mockResolvedValue({ service: 'minepanel', configFiles: [] });
      instanceSettings.getRouterSettings.mockResolvedValue(routerSettings({ autoScaleEnabled: true, autoScaleToken: 'secret' }));

      const compose = await generatedCompose();

      expect(compose.services['mc-router'].environment.AUTO_SCALE_WEBHOOK_URL).toBe('http://minepanel:8091/servers/autoscale');
    });

    it('does not enable auto-scaling without a token, which would make the router unable to authenticate', async () => {
      instanceSettings.getRouterSettings.mockResolvedValue(routerSettings({ autoScaleEnabled: true, autoScaleToken: null }));

      const compose = await generatedCompose();

      expect(compose.services['mc-router'].environment.AUTO_SCALE_UP).toBeUndefined();
    });

    it('keeps extra networks so hand-added ones survive regeneration', async () => {
      instanceSettings.getRouterSettings.mockResolvedValue(routerSettings({ extraNetworks: 'shared_proxy_net\n  other_net  ' }));

      const compose = await generatedCompose();

      expect(compose.services['mc-router'].networks).toEqual(['minepanel-network', 'shared_proxy_net', 'other_net']);
      expect(compose.networks.shared_proxy_net).toEqual({ external: true });
    });

    it('ignores an extra network that repeats the panel network', async () => {
      instanceSettings.getRouterSettings.mockResolvedValue(routerSettings({ extraNetworks: 'minepanel-network' }));

      const compose = await generatedCompose();

      expect(compose.services['mc-router'].networks).toEqual(['minepanel-network']);
    });

    it('marks the file as generated so it is not edited by hand', async () => {
      await service.generateComposeFile();

      expect(lastWrittenCompose()).toMatch(/^# Generated by Minepanel/);
    });
  });

  describe('reconcile', () => {
    const setRunning = (running: boolean) => {
      execMock.mockClear();
      jest.spyOn(service, 'isRunning').mockResolvedValue(running);
    };

    it('starts the router when the proxy is enabled and nothing is running', async () => {
      instanceSettings.getProxy.mockResolvedValue({ enabled: true, baseDomain: 'mc.example.com' });
      setRunning(false);

      await service.reconcile();

      expect(execMock).toHaveBeenCalledWith('docker compose up -d', expect.objectContaining({ cwd: '/app/data/proxy' }));
    });

    it('stops the router when the proxy is turned off', async () => {
      instanceSettings.getProxy.mockResolvedValue({ enabled: false, baseDomain: null });
      setRunning(true);
      jest.spyOn(service, 'findUnmanagedRouter').mockResolvedValue(null);

      await service.reconcile();

      expect(execMock).toHaveBeenCalledWith('docker compose down', expect.objectContaining({ cwd: '/app/data/proxy' }));
    });

    it('leaves a router it does not own alone', async () => {
      instanceSettings.getProxy.mockResolvedValue({ enabled: false, baseDomain: null });
      setRunning(true);
      jest.spyOn(service, 'findUnmanagedRouter').mockResolvedValue({ project: 'minepanel' });

      await service.reconcile();

      expect(execMock).not.toHaveBeenCalledWith('docker compose down', expect.anything());
    });

    it('reapplies settings that changed while the router was up', async () => {
      instanceSettings.getProxy.mockResolvedValue({ enabled: true, baseDomain: 'mc.example.com' });
      setRunning(true);

      await service.reconcile();

      expect(execMock).toHaveBeenCalledWith('docker compose up -d', expect.objectContaining({ cwd: '/app/data/proxy' }));
    });
  });
});
