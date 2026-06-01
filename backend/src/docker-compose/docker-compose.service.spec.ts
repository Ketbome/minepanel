import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DockerComposeService } from './docker-compose.service';
import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';

jest.mock('node:child_process', () => ({
  exec: jest.fn((_: string, callback: (error: Error | null, result: { stdout: string; stderr: string }) => void) => {
    callback(null, { stdout: '', stderr: '' });
  }),
}));

jest.mock('fs-extra', () => ({
  ensureDirSync: jest.fn(),
  ensureDir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  pathExists: jest.fn().mockResolvedValue(false),
  readFile: jest.fn(),
  existsSync: jest.fn().mockReturnValue(false),
  readdir: jest.fn().mockResolvedValue([]),
}));

describe('DockerComposeService', () => {
  let service: DockerComposeService;

  const SERVERS_DIR = '/app/servers';
  const BASE_DIR = '/app';

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'serversDir') return SERVERS_DIR;
        if (key === 'baseDir') return BASE_DIR;
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DockerComposeService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<DockerComposeService>(DockerComposeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllServerIds', () => {
    it('should return empty array when no servers exist', async () => {
      const result = await service.getAllServerIds();
      expect(result).toEqual([]);
    });
  });

  describe('getServerConfig', () => {
    it('should return null when server does not exist', async () => {
      const result = await service.getServerConfig('nonexistent');
      expect(result).toBeNull();
    });

    it('should keep extra ports when loading a proxy compose file', async () => {
      const compose = {
        services: {
          mc: {
            image: 'itzg/minecraft-server:latest',
            environment: {
              ID_MANAGER: 'proxy-server',
              TYPE: 'VANILLA',
            },
            expose: ['25565'],
            ports: ['24454:24454/udp', '8123:8123'],
            labels: ['minepanel.proxy.enabled=true'],
          },
        },
      };

      const existsSyncMock = fs.existsSync as unknown as jest.Mock;
      existsSyncMock.mockImplementation((target: string) =>
        target === `${SERVERS_DIR}/proxy-server` || target === `${SERVERS_DIR}/proxy-server/docker-compose.yml`
      );

      const readFileMock = fs.readFile as unknown as jest.Mock;
      readFileMock.mockResolvedValue(yaml.dump(compose));

      const result = await service.getServerConfig('proxy-server');

      expect(result).not.toBeNull();
      expect(result?.port).toBe('25565');
      expect(result?.extraPorts).toEqual(['24454:24454/udp', '8123:8123']);
    });

    it('should read object-style proxy labels with boolean enabled state', async () => {
      const compose = {
        services: {
          mc: {
            image: 'itzg/minecraft-server:latest',
            environment: {
              ID_MANAGER: 'proxy-server',
              TYPE: 'VANILLA',
            },
            expose: ['25565'],
            labels: {
              'minepanel.proxy.enabled': true,
              'minepanel.proxy.hostname': 'lobby',
            },
          },
        },
      };

      const existsSyncMock = fs.existsSync as unknown as jest.Mock;
      existsSyncMock.mockImplementation((target: string) =>
        target === `${SERVERS_DIR}/proxy-server` || target === `${SERVERS_DIR}/proxy-server/docker-compose.yml`
      );

      const readFileMock = fs.readFile as unknown as jest.Mock;
      readFileMock.mockResolvedValue(yaml.dump(compose));

      const result = await service.getServerConfig('proxy-server');

      expect(result).not.toBeNull();
      expect(result?.useProxy).toBe(true);
      expect(result?.proxyHostname).toBe('lobby');
    });
  });

  describe('generateDockerComposeFile', () => {
    it('should use english default motd for new servers', () => {
      const config = (service as any).createDefaultConfig('survival');

      expect(config.motd).toBe('An incredible Minecraft server');
    });

    it('should generate mc service without container_name', async () => {
      const config = (service as any).createDefaultConfig('survival');

      await service.generateDockerComposeFile(config, false);

      const writeFileMock = fs.writeFile as unknown as jest.Mock;
      const [, yamlContent] = writeFileMock.mock.calls[0];
      const parsed = yaml.load(yamlContent as string) as any;

      expect(parsed.services.mc.container_name).toBeUndefined();
    });

    it('should add stable proxy alias when proxy is enabled', async () => {
      const config = (service as any).createDefaultConfig('proxyserver');

      await service.generateDockerComposeFile(config, true);

      const writeFileMock = fs.writeFile as unknown as jest.Mock;
      const [, yamlContent] = writeFileMock.mock.calls[0];
      const parsed = yaml.load(yamlContent as string) as any;

      expect(parsed.services.mc.networks['minepanel-network'].aliases).toEqual(['proxyserver']);
    });

    it('should reserve port 25565 for direct java servers when global proxy is enabled', async () => {
      const config = (service as any).createDefaultConfig('direct-server');
      config.useProxy = false;

      await service.generateDockerComposeFile(config, true);

      const writeFileMock = fs.writeFile as unknown as jest.Mock;
      const [, yamlContent] = writeFileMock.mock.calls[0];
      const parsed = yaml.load(yamlContent as string) as any;

      expect(parsed.services.mc.ports).toContain('25566:25565');
    });

    it('should reserve port 25565 when mc-router is running even if global proxy is disabled', async () => {
      const childProcess = jest.requireMock('node:child_process') as { exec: jest.Mock };
      childProcess.exec.mockImplementation((_: string, callback: (error: Error | null, result: { stdout: string; stderr: string }) => void) => {
        callback(null, { stdout: 'router-id\n', stderr: '' });
      });

      const config = (service as any).createDefaultConfig('router-running-server');

      await service.generateDockerComposeFile(config, false);

      const writeFileMock = fs.writeFile as unknown as jest.Mock;
      const [, yamlContent] = writeFileMock.mock.calls[0];
      const parsed = yaml.load(yamlContent as string) as any;

      expect(parsed.services.mc.ports).toContain('25566:25565');
    });

    it('should attach backup service to proxy network when proxy is enabled', async () => {
      const config = (service as any).createDefaultConfig('proxybackup');
      config.enableBackup = true;

      await service.generateDockerComposeFile(config, true);

      const writeFileMock = fs.writeFile as unknown as jest.Mock;
      const [, yamlContent] = writeFileMock.mock.calls[0];
      const parsed = yaml.load(yamlContent as string) as any;

      expect(parsed.services.backup.networks['minepanel-network']).toEqual({});
    });

    it('should force restart policy to "no" when auto-stop is enabled', async () => {
      const config = (service as any).createDefaultConfig('autostop-server');
      config.enableAutoStop = true;
      config.restartPolicy = 'always';

      await service.generateDockerComposeFile(config, false);

      const writeFileMock = fs.writeFile as unknown as jest.Mock;
      const [, yamlContent] = writeFileMock.mock.calls[0];
      const parsed = yaml.load(yamlContent as string) as any;

      expect(parsed.services.mc.restart).toBe('no');
    });

    it('should generate valid yaml for docker labels with urls when proxy labels are also present', async () => {
      const config = (service as any).createDefaultConfig('label-server');
      config.dockerLabels = 'example.label=https://example.com/icon.png';

      await service.generateDockerComposeFile(config, true);

      const writeFileMock = fs.writeFile as unknown as jest.Mock;
      const [, yamlContent] = writeFileMock.mock.calls[0];
      const parsed = yaml.load(yamlContent as string) as any;

      expect(parsed.services.mc.labels['example.label']).toBe('https://example.com/icon.png');
      expect(parsed.services.mc.labels['minepanel.proxy.enabled']).toBe('true');
    });
  });
});
