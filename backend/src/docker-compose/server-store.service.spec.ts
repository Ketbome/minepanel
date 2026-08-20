import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs-extra';
import * as os from 'node:os';
import * as path from 'node:path';
import { ServerConfig } from 'src/server-management/dto/server-config.model';
import { ServerStoreService } from './server-store.service';

// These tests run against a real temp directory: the whole point of the store is
// what it leaves on disk, and mocking fs would only assert that the mocks were
// called.
describe('ServerStoreService', () => {
  let service: ServerStoreService;
  let serversDir: string;

  const config = (id: string, overrides: Partial<ServerConfig> = {}): ServerConfig =>
    ({
      id,
      edition: 'JAVA',
      serverType: 'VANILLA',
      serverName: `${id} name`,
      motd: `${id} motd`,
      port: '25565',
      ...overrides,
    }) as ServerConfig;

  const indexIds = async (): Promise<string[]> => {
    const entries = await service.readIndex();
    return (entries ?? []).map((entry) => entry.id);
  };

  beforeEach(async () => {
    serversDir = await fs.mkdtemp(path.join(os.tmpdir(), 'minepanel-store-'));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServerStoreService,
        { provide: ConfigService, useValue: { get: (key: string) => (key === 'serversDir' ? serversDir : null) } },
      ],
    }).compile();

    service = module.get(ServerStoreService);
  });

  afterEach(async () => {
    await fs.remove(serversDir);
  });

  describe('per-server config', () => {
    it('round-trips a config through server.json', async () => {
      const original = config('survival', { maxPlayers: '42', envVars: 'FOO=bar=baz' });

      await service.writeConfig(original);

      expect(await service.readConfig('survival')).toEqual(original);
    });

    it('does not persist state that is derived from the filesystem', async () => {
      await service.writeConfig(config('survival', { active: true, serverExists: true } as Partial<ServerConfig>));

      const stored = await fs.readJson(service.getConfigPath('survival'));
      expect(stored).not.toHaveProperty('active');
      expect(stored).not.toHaveProperty('serverExists');
    });

    it('returns null for a server that has no server.json', async () => {
      expect(await service.readConfig('missing')).toBeNull();
    });

    it('throws instead of reporting "no config" when server.json is corrupt', async () => {
      await fs.ensureDir(path.join(serversDir, 'survival'));
      await fs.writeFile(service.getConfigPath('survival'), '{ not json');

      // Returning null here would make the caller re-import from the compose
      // file and overwrite whatever the damaged file still held.
      await expect(service.readConfig('survival')).rejects.toBeDefined();
    });

    it('leaves no temporary files behind', async () => {
      await service.writeConfig(config('survival'));

      const entries = await fs.readdir(path.join(serversDir, 'survival'));
      expect(entries.filter((name) => name.endsWith('.tmp'))).toEqual([]);
    });
  });

  describe('index', () => {
    it('carries the fields the dashboard and the proxy routes need', async () => {
      await service.writeConfig(
        config('survival', { useProxy: false, proxyHostname: 'lobby', useAutoScale: false, edition: 'BEDROCK' }),
      );

      const [entry] = (await service.readIndex()) ?? [];
      expect(entry).toEqual({
        id: 'survival',
        serverName: 'survival name',
        motd: 'survival motd',
        port: '25565',
        serverType: 'VANILLA',
        edition: 'BEDROCK',
        useProxy: false,
        proxyHostname: 'lobby',
        useAutoScale: false,
      });
    });

    it('never writes the derived active flag', async () => {
      await service.writeConfig(config('survival', { active: true } as Partial<ServerConfig>));

      const [entry] = (await service.readIndex()) ?? [];
      expect(entry).not.toHaveProperty('active');
    });

    it('reports a missing index as null so the caller rebuilds it', async () => {
      expect(await service.readIndex()).toBeNull();
    });

    it('reports a corrupt index as null instead of throwing', async () => {
      await fs.writeFile(path.join(serversDir, 'servers.json'), 'definitely not json');

      expect(await service.readIndex()).toBeNull();
    });

    it('keeps every entry when servers are created concurrently', async () => {
      await Promise.all([
        service.writeConfig(config('one')),
        service.writeConfig(config('two')),
        service.writeConfig(config('three')),
      ]);

      expect(await indexIds()).toEqual(['one', 'three', 'two']);
    });

    it('updates an existing entry instead of duplicating it', async () => {
      await service.writeConfig(config('survival', { port: '25565' }));
      await service.writeConfig(config('survival', { port: '25570' }));

      const entries = (await service.readIndex()) ?? [];
      expect(entries).toHaveLength(1);
      expect(entries[0].port).toBe('25570');
    });

    it('drops an entry when the server is removed', async () => {
      await service.writeConfig(config('one'));
      await service.writeConfig(config('two'));

      await service.removeFromIndex('one');

      expect(await indexIds()).toEqual(['two']);
    });
  });

  describe('listServerDirs', () => {
    const makeServer = async (id: string, files: string[]) => {
      await fs.ensureDir(path.join(serversDir, id));
      for (const file of files) {
        await fs.writeFile(path.join(serversDir, id, file), '');
      }
    };

    it('counts folders that only have a server.json', async () => {
      await makeServer('new-style', ['server.json']);

      expect(await service.listServerDirs()).toEqual(['new-style']);
    });

    it('still counts folders that only have a compose file, so pre-2.0 servers survive', async () => {
      await makeServer('old-style', ['docker-compose.yml']);

      expect(await service.listServerDirs()).toEqual(['old-style']);
    });

    it('ignores folders with neither file', async () => {
      await makeServer('junk', ['readme.txt']);

      expect(await service.listServerDirs()).toEqual([]);
    });

    it('ignores the reserved world library and dot folders', async () => {
      await makeServer('.world', ['server.json']);
      await makeServer('.hidden', ['server.json']);
      await makeServer('survival', ['server.json']);

      expect(await service.listServerDirs()).toEqual(['survival']);
    });

    it('ignores the index file itself', async () => {
      await service.writeConfig(config('survival'));

      expect(await service.listServerDirs()).toEqual(['survival']);
    });
  });
});
