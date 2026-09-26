import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as fs from 'fs-extra';
import os from 'node:os';
import * as path from 'node:path';
import { PlayersService, summarizeStats } from './players.service';
import { levelDat, legacyPlayerDat } from './player-nbt.fixtures';

const STEVE = '069a79f4-44e9-4726-a5be-fca90e38aaf5';
const ALEX = 'ec561538-f3fd-461d-aff5-086b22154bce';
const BANNED = '11111111-2222-3333-4444-555555555555';

describe('PlayersService', () => {
  let serversDir: string;
  let mcData: string;
  let service: PlayersService;
  const textures = { ensure: jest.fn() };

  const writeWorldFile = async (world: string, dir: string, file: string, content: string | Buffer) => {
    await fs.outputFile(path.join(mcData, world, dir, file), content);
  };

  beforeEach(async () => {
    textures.ensure.mockClear();
    serversDir = await fs.mkdtemp(path.join(os.tmpdir(), 'minepanel-players-'));
    mcData = path.join(serversDir, 'srv', 'mc-data');
    await fs.ensureDir(mcData);
    service = new PlayersService({ get: () => serversDir } as any, textures as any);
  });

  afterEach(async () => {
    await fs.remove(serversDir);
  });

  describe('list', () => {
    it('merges world files with whitelist, ops and banned lists', async () => {
      await fs.writeJson(path.join(mcData, 'usercache.json'), [
        { name: 'Steve', uuid: STEVE },
        { name: 'LookedUpOnly', uuid: '99999999-9999-9999-9999-999999999999' },
      ]);
      await fs.writeJson(path.join(mcData, 'whitelist.json'), [{ name: 'Alex', uuid: ALEX }]);
      await fs.writeJson(path.join(mcData, 'ops.json'), [{ name: 'Steve', uuid: STEVE.toUpperCase(), level: 4 }]);
      await fs.writeJson(path.join(mcData, 'banned-players.json'), [{ name: 'Griefer', uuid: BANNED }]);
      await writeWorldFile('world', 'playerdata', `${STEVE}.dat`, legacyPlayerDat());
      await writeWorldFile('world', 'playerdata', 'not-a-player.dat_old', 'x');
      await writeWorldFile(
        'world',
        'stats',
        `${STEVE}.json`,
        JSON.stringify({
          stats: {
            'minecraft:custom': { 'minecraft:play_time': 72000, 'minecraft:deaths': 2, 'minecraft:walk_one_cm': 500, 'minecraft:fly_one_cm': 100 },
            'minecraft:mined': { 'minecraft:stone': 40, 'minecraft:diamond_ore': 2 },
          },
        }),
      );
      await writeWorldFile(
        'world',
        'advancements',
        `${STEVE}.json`,
        JSON.stringify({
          'minecraft:story/mine_stone': { done: true, criteria: { get_stone: '2024-03-14 18:02:11 +0000' } },
          'minecraft:story/smelt_iron': { done: false, criteria: {} },
          'minecraft:recipes/misc/stick': { done: true, criteria: {} },
          DataVersion: 3700,
        }),
      );

      const players = await service.list('srv');

      expect(players.map((p) => p.uuid)).toEqual([STEVE, ALEX, BANNED]);
      const steve = players[0];
      expect(steve).toMatchObject({ name: 'Steve', op: true, opLevel: 4, whitelisted: false, banned: false, advancements: 1 });
      expect(steve.stats).toEqual({ playTimeTicks: 72000, deaths: 2, mobKills: 0, playerKills: 0, distanceCm: 600, blocksMined: 42 });
      expect(steve.lastSeen).not.toBeNull();
      expect(players[1]).toMatchObject({ name: 'Alex', whitelisted: true, lastSeen: null, advancements: 0 });
      expect(players[2]).toMatchObject({ name: 'Griefer', banned: true });
    });

    it('reads the world named by level-name', async () => {
      await fs.writeFile(path.join(mcData, 'server.properties'), 'motd=hi\nlevel-name=survival\n');
      await writeWorldFile('survival', 'stats', `${ALEX}.json`, JSON.stringify({ stats: {} }));
      await writeWorldFile('world', 'stats', `${STEVE}.json`, JSON.stringify({ stats: {} }));

      expect((await service.list('srv')).map((p) => p.uuid)).toEqual([ALEX]);
    });

    it('falls back to the default world when level-name escapes mc-data', async () => {
      await fs.writeFile(path.join(mcData, 'server.properties'), 'level-name=../../etc\n');
      await writeWorldFile('world', 'stats', `${STEVE}.json`, JSON.stringify({ stats: {} }));

      expect((await service.list('srv')).map((p) => p.uuid)).toEqual([STEVE]);
    });

    it('returns an empty list for a server that never started', async () => {
      expect(await service.list('srv')).toEqual([]);
      expect(await service.list('missing')).toEqual([]);
    });

    it('rejects invalid server ids', async () => {
      await expect(service.list('../etc')).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('profile', () => {
    it('returns stats, advancements and inventory', async () => {
      await fs.writeJson(path.join(mcData, 'usercache.json'), [{ name: 'Steve', uuid: STEVE }]);
      await writeWorldFile('world', 'playerdata', `${STEVE}.dat`, legacyPlayerDat());
      await writeWorldFile('world', 'stats', `${STEVE}.json`, JSON.stringify({ stats: { 'minecraft:killed': { 'minecraft:zombie': 3 } } }));
      await writeWorldFile(
        'world',
        'advancements',
        `${STEVE}.json`,
        JSON.stringify({ 'minecraft:story/root': { done: true, criteria: { a: '2024-03-14 18:02:11 +0000', b: 'garbage' } } }),
      );

      const profile = await service.profile('srv', STEVE.toUpperCase());

      expect(profile.name).toBe('Steve');
      expect(profile.statsByCategory).toEqual({ 'minecraft:killed': { 'minecraft:zombie': 3 } });
      expect(profile.advancementList).toEqual([{ id: 'minecraft:story/root', done: true, doneAt: null }]);
      expect(profile.inventory).toHaveLength(3);
      expect(profile.enderChest).toEqual([{ slot: 3, id: 'minecraft:emerald', count: 64 }]);
      expect(profile.position?.dimension).toBe('minecraft:the_nether');
      expect(profile.vitals?.gameMode).toBe('creative');
      expect(profile.textureVersion).toBeNull();
      expect(textures.ensure).not.toHaveBeenCalled();
    });

    it('reports the world version and starts caching its textures', async () => {
      await writeWorldFile('world', 'playerdata', `${STEVE}.dat`, legacyPlayerDat());
      await writeWorldFile('world', '', 'level.dat', levelDat('1.21.1'));

      const profile = await service.profile('srv', STEVE);

      expect(profile.textureVersion).toBe('1.21.1');
      expect(textures.ensure).toHaveBeenCalledWith('1.21.1');
    });

    it('parses advancement dates', async () => {
      await writeWorldFile('world', 'advancements', `${STEVE}.json`, JSON.stringify({ 'minecraft:story/root': { done: true, criteria: { a: '2024-03-14 18:02:11 +0000' } } }));

      const profile = await service.profile('srv', STEVE);

      expect(profile.advancementList[0].doneAt).toBe('2024-03-14T18:02:11.000Z');
      expect(profile.inventory).toEqual([]);
      expect(profile.position).toBeNull();
    });

    it('returns empty inventory when player data is corrupt', async () => {
      await writeWorldFile('world', 'playerdata', `${STEVE}.dat`, 'not nbt');

      const profile = await service.profile('srv', STEVE);

      expect(profile.inventory).toEqual([]);
      expect(profile.offhand).toBeNull();
      expect(profile.vitals).toBeNull();
      expect(profile.effects).toEqual([]);
    });

    it('rejects invalid uuids and unknown players', async () => {
      await expect(service.profile('srv', '../../x')).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.profile('srv', STEVE)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('inventory and item search', () => {
    beforeEach(async () => {
      await fs.writeJson(path.join(mcData, 'usercache.json'), [{ name: 'Steve', uuid: STEVE }]);
      await writeWorldFile('world', 'playerdata', `${STEVE}.dat`, legacyPlayerDat());
      await writeWorldFile('world', 'playerdata', `${ALEX}.dat`, 'corrupt');
    });

    it('reads a saved inventory with its save time', async () => {
      const saved = await service.readInventory('srv', STEVE);
      expect(saved?.inventory.enderChest).toHaveLength(1);
      expect(Number.isNaN(saved?.savedAt.getTime())).toBe(false);
      expect(await service.readInventory('srv', ALEX)).toBeNull();
    });

    it('finds items in inventories, ender chests and carried shulkers', async () => {
      const matches = await service.searchItems('srv', 'Diamond');

      expect(matches.map((m) => [m.name, m.where, m.id, m.count, m.containerId])).toEqual([
        ['Steve', 'inventory', 'minecraft:diamond_pickaxe', 1, undefined],
        ['Steve', 'inventory', 'minecraft:diamond', 12, undefined],
        ['Steve', 'container', 'minecraft:diamond', 30, 'minecraft:shulker_box'],
      ]);
      expect((await service.searchItems('srv', 'digger'))[0].itemName).toBe('Digger');
      expect((await service.searchItems('srv', 'ender pearl')).length).toBe(0);
      expect((await service.searchItems('srv', 'emerald'))[0].where).toBe('enderChest');
      expect((await service.searchItems('srv', 'iron_helmet')).length).toBe(1);
    });

    it('rejects searches that are too short', async () => {
      await expect(service.searchItems('srv', ' a ')).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('readStats and findUuid', () => {
    it('reads a player stats file and resolves names from the server lists', async () => {
      await fs.writeJson(path.join(mcData, 'usercache.json'), [{ name: 'Steve', uuid: STEVE }]);
      await writeWorldFile('world', 'stats', `${STEVE}.json`, JSON.stringify({ stats: { 'minecraft:custom': { 'minecraft:deaths': 1 } } }));

      expect(await service.readStats('srv', STEVE.toUpperCase())).toEqual({ 'minecraft:custom': { 'minecraft:deaths': 1 } });
      expect(await service.readStats('srv', ALEX)).toBeNull();
      expect(await service.findUuid('srv', 'steve')).toBe(STEVE);
      expect(await service.findUuid('srv', 'Nobody')).toBeNull();
    });
  });

  it('summarizes pre-1.17 play time', () => {
    expect(summarizeStats({ 'minecraft:custom': { 'minecraft:play_one_minute': 20 } }).playTimeTicks).toBe(20);
    expect(summarizeStats({}).blocksMined).toBe(0);
  });
});
