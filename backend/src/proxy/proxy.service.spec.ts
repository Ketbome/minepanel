import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';
import { ProxyService } from './proxy.service';
import { InstanceSettingsService } from 'src/settings/instance-settings.service';

jest.mock('fs-extra', () => ({
  ensureDir: jest.fn().mockResolvedValue(undefined),
  pathExists: jest.fn().mockResolvedValue(false),
  readJson: jest.fn(),
  writeJson: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn(),
}));

describe('ProxyService', () => {
  let service: ProxyService;
  let instanceSettings: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    instanceSettings = {
      getProxy: jest.fn().mockResolvedValue({ enabled: true, baseDomain: 'proxy.test' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProxyService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'serversDir') return '/app/servers';
              return null;
            }),
          },
        },
        {
          provide: InstanceSettingsService,
          useValue: instanceSettings,
        },
      ],
    }).compile();

    service = module.get<ProxyService>(ProxyService);
  });

  it('returns null when server disables proxy even if proxy is globally enabled', async () => {
    (fs.pathExists as jest.Mock).mockImplementation(async (target: string) => target === '/app/servers/survival/docker-compose.yml');
    (fs.readFile as unknown as jest.Mock).mockResolvedValue(
      yaml.dump({
        services: {
          mc: {
            labels: ['minepanel.proxy.enabled=false'],
          },
        },
      }),
    );

    const hostname = await service.getServerHostname('survival');

    expect(hostname).toBeNull();
  });

  it('returns null when object-style labels disable proxy with boolean false', async () => {
    (fs.pathExists as jest.Mock).mockImplementation(async (target: string) => target === '/app/servers/survival/docker-compose.yml');
    (fs.readFile as unknown as jest.Mock).mockResolvedValue(
      yaml.dump({
        services: {
          mc: {
            labels: {
              'minepanel.proxy.enabled': false,
            },
          },
        },
      }),
    );

    const hostname = await service.getServerHostname('survival');

    expect(hostname).toBeNull();
  });

  it('uses custom server hostname when no route mapping exists yet', async () => {
    (fs.pathExists as jest.Mock).mockImplementation(async (target: string) => target === '/app/servers/survival/docker-compose.yml');
    (fs.readFile as unknown as jest.Mock).mockResolvedValue(
      yaml.dump({
        services: {
          mc: {
            labels: ['minepanel.proxy.enabled=true', 'minepanel.proxy.hostname=lobby'],
          },
        },
      }),
    );

    const hostname = await service.getServerHostname('survival');

    expect(hostname).toBe('lobby.proxy.test');
  });

  it('uses object-style hostname labels when no route mapping exists yet', async () => {
    (fs.pathExists as jest.Mock).mockImplementation(async (target: string) => target === '/app/servers/survival/docker-compose.yml');
    (fs.readFile as unknown as jest.Mock).mockResolvedValue(
      yaml.dump({
        services: {
          mc: {
            labels: {
              'minepanel.proxy.enabled': true,
              'minepanel.proxy.hostname': 'lobby',
            },
          },
        },
      }),
    );

    const hostname = await service.getServerHostname('survival');

    expect(hostname).toBe('lobby.proxy.test');
  });

  it('falls back to the instance base domain when the compose file names no hostname', async () => {
    instanceSettings.getProxy.mockResolvedValue({ enabled: true, baseDomain: 'instance.test' });

    (fs.pathExists as jest.Mock).mockImplementation(async (target: string) => target === '/app/servers/survival/docker-compose.yml');
    (fs.readFile as unknown as jest.Mock).mockResolvedValue(
      yaml.dump({
        services: {
          mc: {
            labels: ['minepanel.proxy.enabled=true'],
          },
        },
      }),
    );

    const hostname = await service.getServerHostname('survival');

    expect(hostname).toBe('survival.instance.test');
  });
  describe('routes file', () => {
    it('exposes proxy availability from instance settings', async () => {
      expect(await service.isProxyAvailable()).toBe(true);
      expect(await service.isProxyEnabled()).toBe(true);
      instanceSettings.getProxy.mockResolvedValue({ enabled: false, baseDomain: null });
      expect(await service.isProxyAvailable()).toBe(false);
      expect(await service.isProxyEnabled()).toBe(false);
    });

    it('generates hostnames from ids or custom names', () => {
      expect(service.generateHostname('srv', 'proxy.test')).toBe('srv.proxy.test');
      expect(service.generateHostname('srv', 'proxy.test', 'play')).toBe('play.proxy.test');
      expect(service.generateHostname('srv', 'proxy.test', 'mc.other.com')).toBe('mc.other.com');
    });

    it('generateRoutesFile writes only servers that use the proxy', async () => {
      await service.generateRoutesFile(
        [
          { id: 'a', useProxy: true },
          { id: 'b', useProxy: true, hostname: 'custom' },
          { id: 'c', useProxy: false },
        ],
        'proxy.test',
      );

      expect(fs.writeJson).toHaveBeenCalledWith('/app/data/proxy/routes.json', { mappings: { 'a.proxy.test': 'a:25565', 'custom.proxy.test': 'b:25565' } }, { spaces: 2 });
    });

    it('addServerToProxy replaces the previous hostname of the same server', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(true);
      (fs.readJson as jest.Mock).mockResolvedValue({ mappings: { 'old.proxy.test': 'a:25565', 'other.proxy.test': 'b:25565' } });

      await service.addServerToProxy('a', 'proxy.test', 'new');

      expect(fs.writeJson).toHaveBeenCalledWith(expect.any(String), { mappings: { 'other.proxy.test': 'b:25565', 'new.proxy.test': 'a:25565' } }, { spaces: 2 });
    });

    it('removeServerFromProxy and clearRoutesFile drop mappings', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(true);
      (fs.readJson as jest.Mock).mockResolvedValue({ mappings: { 'a.proxy.test': 'a:25565', 'b.proxy.test': 'b:25565' } });

      await service.removeServerFromProxy('a');
      expect(fs.writeJson).toHaveBeenLastCalledWith(expect.any(String), { mappings: { 'b.proxy.test': 'b:25565' } }, { spaces: 2 });

      await service.clearRoutesFile();
      expect(fs.writeJson).toHaveBeenLastCalledWith(expect.any(String), { mappings: {} }, { spaces: 2 });
    });

    it('migrates the legacy array format and tolerates unreadable files', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(true);
      (fs.readJson as jest.Mock).mockResolvedValue({ mappings: [{ host: 'a.proxy.test', backend: 'a:25565' }] });
      expect(await service.getAllMappings()).toEqual([{ host: 'a.proxy.test', backend: 'a:25565' }]);
      expect(await service.getServerHostname('a')).toBe('a.proxy.test');

      (fs.readJson as jest.Mock).mockRejectedValue(new Error('corrupt'));
      expect(await service.getAllMappings()).toEqual([]);
      expect(await service.getRoutesStatus()).toEqual({ hasRoutesFile: true, routesCount: 0 });
    });

    it('getServerHostname returns null when the proxy is off and no mapping exists', async () => {
      instanceSettings.getProxy.mockResolvedValue({ enabled: false, baseDomain: null });
      expect(await service.getServerHostname('a')).toBeNull();
    });

    it('getServerHostname falls back to the generated hostname when the compose file cannot be read', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValueOnce(false).mockResolvedValueOnce(true);
      (fs.readFile as unknown as jest.Mock).mockRejectedValue(new Error('io'));
      expect(await service.getServerHostname('a')).toBe('a.proxy.test');
    });
  });
});
