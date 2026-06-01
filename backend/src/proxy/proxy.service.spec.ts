import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';
import { ProxyService } from './proxy.service';
import { Settings } from 'src/users/entities/settings.entity';

jest.mock('fs-extra', () => ({
  ensureDir: jest.fn().mockResolvedValue(undefined),
  pathExists: jest.fn().mockResolvedValue(false),
  readJson: jest.fn(),
  writeJson: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn(),
}));

describe('ProxyService', () => {
  let service: ProxyService;

  beforeEach(async () => {
    jest.clearAllMocks();

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
          provide: getRepositoryToken(Settings),
          useValue: {
            find: jest.fn().mockResolvedValue([{ preferences: { proxyEnabled: true, proxyBaseDomain: 'proxy.test' } }]),
            findOne: jest.fn().mockResolvedValue(null),
          },
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

  it('uses current user proxy settings for hostname fallback', async () => {
    const settingsRepo = (service as any).settingsRepo;
    settingsRepo.findOne.mockResolvedValue({ preferences: { proxyEnabled: true, proxyBaseDomain: 'user.test' } });

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

    const hostname = await service.getServerHostname('survival', 42);

    expect(hostname).toBe('survival.user.test');
  });
});
