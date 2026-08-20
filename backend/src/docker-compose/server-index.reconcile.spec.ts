import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs-extra';
import * as os from 'node:os';
import * as path from 'node:path';
import * as yaml from 'js-yaml';
import { DockerComposeService } from './docker-compose.service';
import { ServerStoreService } from './server-store.service';

jest.mock('node:child_process', () => ({
  exec: jest.fn((_: string, callback: (error: Error | null, result: { stdout: string; stderr: string }) => void) => {
    callback(null, { stdout: '', stderr: '' });
  }),
}));

// The index is a cache, so what matters is that it can never disagree with the
// per-server files for long. These run against a real directory.
describe('server index reconciliation', () => {
  let service: DockerComposeService;
  let store: ServerStoreService;
  let serversDir: string;

  const writeServer = async (id: string, overrides: Record<string, unknown> = {}) => {
    await fs.ensureDir(path.join(serversDir, id));
    await fs.writeJson(path.join(serversDir, id, 'server.json'), {
      id,
      edition: 'JAVA',
      serverType: 'VANILLA',
      serverName: `${id} name`,
      port: '25565',
      ...overrides,
    });
  };

  const writeComposeOnlyServer = async (id: string) => {
    await fs.ensureDir(path.join(serversDir, id));
    await fs.writeFile(
      path.join(serversDir, id, 'docker-compose.yml'),
      yaml.dump({
        services: {
          mc: {
            image: 'itzg/minecraft-server:latest',
            environment: { ID_MANAGER: id, TYPE: 'VANILLA', SERVER_NAME: 'Imported', SPAWN_PROTECTION: '16' },
            ports: ['25580:25565'],
          },
        },
      }),
    );
  };

  const indexIds = async () => ((await store.readIndex()) ?? []).map((entry) => entry.id);

  beforeEach(async () => {
    serversDir = await fs.mkdtemp(path.join(os.tmpdir(), 'minepanel-index-'));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DockerComposeService,
        ServerStoreService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'serversDir') return serversDir;
              if (key === 'baseDir') return serversDir;
              return null;
            },
          },
        },
      ],
    }).compile();

    service = module.get(DockerComposeService);
    store = module.get(ServerStoreService);
  });

  afterEach(async () => {
    await fs.remove(serversDir);
  });

  it('builds the index from the folders when it does not exist yet', async () => {
    await writeServer('alpha');
    await writeServer('beta');

    const index = await service.getServerIndex();

    expect(index.map((entry) => entry.id)).toEqual(['alpha', 'beta']);
    expect(await indexIds()).toEqual(['alpha', 'beta']);
  });

  it('rebuilds the index instead of failing when it is corrupt', async () => {
    await writeServer('alpha');
    await fs.writeFile(path.join(serversDir, 'servers.json'), 'not json at all');

    const index = await service.getServerIndex();

    expect(index.map((entry) => entry.id)).toEqual(['alpha']);
  });

  it('drops entries whose folder was deleted by hand', async () => {
    await writeServer('alpha');
    await writeServer('beta');
    await service.getServerIndex();

    await fs.remove(path.join(serversDir, 'beta'));

    expect((await service.getServerIndex()).map((entry) => entry.id)).toEqual(['alpha']);
  });

  it('picks up a folder that was copied in by hand', async () => {
    await writeServer('alpha');
    await service.getServerIndex();

    await writeServer('copied');

    expect((await service.getServerIndex()).map((entry) => entry.id)).toEqual(['alpha', 'copied']);
  });

  it('lets server.json win when the index disagrees with it', async () => {
    await writeServer('alpha', { serverName: 'real name', port: '25599' });
    await writeServer('beta');
    // Simulate an index left behind by an interrupted write.
    await store.writeIndex([
      { id: 'alpha', serverName: 'stale name', port: '11111' },
      { id: 'ghost', serverName: 'server that no longer exists' },
    ]);

    const index = await service.getServerIndex();
    const alpha = index.find((entry) => entry.id === 'alpha');

    expect(alpha?.serverName).toBe('real name');
    expect(alpha?.port).toBe('25599');
    expect(index.map((entry) => entry.id)).toEqual(['alpha', 'beta']);
  });

  it('derives active from disk rather than from the stored index', async () => {
    await writeServer('alpha');
    await fs.ensureDir(path.join(serversDir, 'alpha', 'mc-data'));
    await writeServer('beta');

    const index = await service.getServerIndex();

    expect(index.find((entry) => entry.id === 'alpha')?.active).toBe(true);
    expect(index.find((entry) => entry.id === 'beta')?.active).toBe(false);
    // and it is never written to servers.json
    expect(((await store.readIndex()) ?? []).every((entry) => entry.active === undefined)).toBe(true);
  });

  describe('importing pre-2.0 servers', () => {
    it('parses the compose file once and keeps the result as server.json', async () => {
      await writeComposeOnlyServer('legacy');

      const config = await service.getServerConfig('legacy');

      expect(config?.serverName).toBe('Imported');
      expect(config?.spawnProtection).toBe('16');
      expect(await fs.pathExists(store.getConfigPath('legacy'))).toBe(true);
    });

    it('reads the stored config on the next call instead of the compose file', async () => {
      await writeComposeOnlyServer('legacy');
      await service.getServerConfig('legacy');

      // If the compose file were still the source of truth, this edit would win.
      await fs.remove(path.join(serversDir, 'legacy', 'docker-compose.yml'));

      expect((await service.getServerConfig('legacy'))?.serverName).toBe('Imported');
    });

    it('includes imported servers in the index', async () => {
      await writeComposeOnlyServer('legacy');
      await writeServer('modern');

      expect((await service.getServerIndex()).map((entry) => entry.id)).toEqual(['legacy', 'modern']);
    });

    // The strongest guard on the migration: if importing a compose file loses a
    // field, regenerating from the imported config produces a different file.
    describe.each([
      [
        'a java server',
        {
          serverName: 'Round Trip',
          motd: 'A server',
          maxPlayers: '42',
          difficulty: 'hard',
          spawnProtection: '16',
          seed: '998877',
          enableRcon: true,
          rconPort: '25575',
          rconPassword: 'secret',
          envVars: 'CUSTOM_FLAG=-Dfoo=bar=baz',
          useProxy: false,
          useAutoScale: false,
          proxyHostname: 'lobby',
        },
      ],
      [
        'a bedrock server',
        {
          edition: 'BEDROCK' as const,
          serverName: 'Bedrock Trip',
          gameMode: 'creative',
          seed: '12345',
          serverPortV6: '19133',
          allowCheats: true,
          tickDistance: '6',
          maxThreads: '4',
          defaultPlayerPermissionLevel: 'operator' as const,
        },
      ],
      [
        'a server with backups enabled',
        {
          serverName: 'Backed Up',
          enableBackup: true,
          backupInterval: '12h',
          backupMethod: 'restic',
          resticRepository: 's3:https://example.com/bucket',
          resticPassword: 'restic-secret',
          backupExcludes: '*.jar,cache',
        },
      ],
      [
        'a modpack server',
        {
          serverName: 'Modpack',
          serverType: 'AUTO_CURSEFORGE' as const,
          cfMethod: 'slug',
          cfSlug: 'all-the-mods-9',
          cfFilenameMatcher: '1.20.1',
          initMemory: '8G',
          maxMemory: '12G',
        },
      ],
      [
        'a proxied java server',
        {
          serverName: 'Proxied',
          useProxy: true,
          proxyHostname: 'survival',
          extraPorts: ['24454:24454/udp'],
        },
      ],
    ])('%s', (_label, overrides) => {
      it('regenerates a byte-identical compose file after a round-trip through the import', async () => {
        const proxied = (overrides as { useProxy?: boolean }).useProxy === true;

        await service.createServer('roundtrip', overrides as never, proxied);
        const before = await fs.readFile(path.join(serversDir, 'roundtrip', 'docker-compose.yml'), 'utf8');

        // Drop the stored config so the next read has to import from the compose.
        await fs.remove(store.getConfigPath('roundtrip'));
        const imported = await service.getServerConfig('roundtrip');
        await service.generateDockerComposeFile(imported as never, proxied);

        const after = await fs.readFile(path.join(serversDir, 'roundtrip', 'docker-compose.yml'), 'utf8');
        expect(after).toBe(before);
      });
    });

    it('returns null for a folder that has neither file', async () => {
      await fs.ensureDir(path.join(serversDir, 'empty'));

      expect(await service.getServerConfig('empty')).toBeNull();
    });
  });
});
