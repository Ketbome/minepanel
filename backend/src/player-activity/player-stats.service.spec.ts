import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PlayerStatsService } from './player-stats.service';

const uuid = '12345678-1234-1234-1234-123456789abc';
describe('Saved player statistics', () => {
  let root: string;
  let base: string;
  let service: PlayerStatsService;
  const store = { readConfig: jest.fn() };
  const write = async (relative: string, value: unknown) => {
    const file = path.join(base, relative);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, typeof value === 'string' ? value : JSON.stringify(value));
  };
  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'minepanel-player-stats-'));
    base = path.join(root, 'survival', 'mc-data');
    store.readConfig.mockResolvedValue({ edition: 'JAVA', worldLevelName: 'world' });
    service = new PlayerStatsService({ getOrThrow: () => root } as any, store as any);
    await write('usercache.json', [{ name: 'Alex', uuid }]);
    await write('server.properties', 'level-name=custom-world\n');
  });
  afterEach(async () => { await fs.rm(root, { recursive: true, force: true }); });

  it('reads the actual world and keeps world totals separate from recorded sessions', async () => {
    await write(`custom-world/stats/${uuid}.json`, { stats: { 'minecraft:custom': { 'minecraft:play_time': 2400, 'minecraft:deaths': 2, 'minecraft:mob_kills': 10, 'minecraft:player_kills': 0 }, 'minecraft:mined': { 'minecraft:stone': 50, 'minecraft:dirt': 20 } } });
    expect(await service.getStats('survival', 'alex')).toMatchObject({ uuid, world: 'custom-world', playSeconds: 120, deaths: 2, mobKills: 10, playerKills: 0, blocksMined: 70 });
  });
  it('supports legacy playtime and leaves absent/invalid counters null', async () => {
    await write(`custom-world/stats/${uuid}.json`, { stats: { 'minecraft:custom': { 'minecraft:play_one_minute': 200, 'minecraft:deaths': -1 }, 'minecraft:mined': { bad: 'no' } } });
    expect(await service.getStats('survival', 'Alex')).toMatchObject({ playSeconds: 10, deaths: null, mobKills: null, blocksMined: null });
    await write(`custom-world/stats/${uuid}.json`, { stats: {} });
    expect(await service.getStats('survival', 'Alex')).toMatchObject({ playSeconds: null, blocksMined: null });
  });
  it('returns null for Bedrock, unknown players, invalid cache and malformed/missing files', async () => {
    expect(await service.getStats('../secret', 'Alex')).toBeNull();
    expect(await service.getStats('survival', 'Unknown')).toBeNull();
    expect(await service.getStats('survival', 'Alex')).toBeNull();
    await write('usercache.json', {});
    expect(await service.getStats('survival', 'Alex')).toBeNull();
    await write('usercache.json', [{ name: 'Alex', uuid: '../../secret' }]);
    expect(await service.getStats('survival', 'Alex')).toBeNull();
    store.readConfig.mockResolvedValue({ edition: 'BEDROCK' });
    expect(await service.getStats('survival', 'Alex')).toBeNull();
    store.readConfig.mockResolvedValue(null);
    expect(await service.getStats('survival', 'Alex')).toBeNull();
  });
  it('rejects traversal and symlink escapes, including mc-data pointing at another server', async () => {
    const outside = path.join(root, 'other');
    await fs.mkdir(outside);
    await fs.writeFile(path.join(outside, 'secret.json'), JSON.stringify({ stats: {} }));
    await fs.mkdir(path.join(base, 'custom-world', 'stats'), { recursive: true });
    await fs.symlink(path.join(outside, 'secret.json'), path.join(base, 'custom-world', 'stats', `${uuid}.json`));
    expect(await service.getStats('survival', 'Alex')).toBeNull();
    await fs.rename(base, `${base}-old`);
    await fs.symlink(outside, base);
    expect(await service.getStats('survival', 'Alex')).toBeNull();
  });
  it('bounds file size and falls back to configured world only when properties omit it', async () => {
    await write('server.properties', 'motd=Hello');
    await write(`world/stats/${uuid}.json`, { stats: {} });
    expect((await service.getStats('survival', 'Alex'))?.world).toBe('world');
    await write(`world/stats/${uuid}.json`, 'x'.repeat(2 * 1024 * 1024 + 1));
    expect(await service.getStats('survival', 'Alex')).toBeNull();
    await write(`world/stats/${uuid}.json`, {});
    expect(await service.getStats('survival', 'Alex')).toBeNull();
  });
});
