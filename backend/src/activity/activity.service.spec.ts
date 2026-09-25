import { DataSource } from 'typeorm';
import { ActivityService, sessionDeltas } from './activity.service';
import { ActivityEvent } from './entities/activity-event.entity';
import { InventorySnapshot } from './entities/inventory-snapshot.entity';
import { LogCursor } from './entities/log-cursor.entity';
import { PlayerSession } from './entities/player-session.entity';
import { LogLine } from './log-line.parser';

const STEVE = '069a79f4-44e9-4726-a5be-fca90e38aaf5';
const line = (time: string, message: string, level = 'INFO'): LogLine => ({ time, level, message });
const at = (time: string) => new Date(`2026-09-25T${time}Z`);

describe('ActivityService', () => {
  let dataSource: DataSource;
  let players: { readStats: jest.Mock; findUuid: jest.Mock; readInventory: jest.Mock };
  let service: ActivityService;
  let scheduled: Array<() => void>;

  const create = () =>
    new ActivityService(dataSource.getRepository(ActivityEvent), dataSource.getRepository(PlayerSession), dataSource.getRepository(InventorySnapshot), players as any);
  const snapshots = () => dataSource.getRepository(InventorySnapshot).find({ order: { id: 'ASC' } });
  const inventory = (id: string, savedAt: string) => ({
    inventory: { inventory: [{ slot: 0, id, count: 1 }], armor: [], offhand: null, enderChest: [] },
    savedAt: new Date(savedAt),
  });
  const sessions = () => dataSource.getRepository(PlayerSession).find({ order: { id: 'ASC' } });
  const runScheduled = async () => {
    for (const fn of scheduled.splice(0)) fn();
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
  };

  beforeEach(async () => {
    dataSource = new DataSource({ type: 'sqljs', entities: [ActivityEvent, PlayerSession, LogCursor, InventorySnapshot], synchronize: true });
    await dataSource.initialize();
    players = { readStats: jest.fn().mockResolvedValue(null), findUuid: jest.fn().mockResolvedValue(null), readInventory: jest.fn().mockResolvedValue(null) };
    service = create();
    scheduled = [];
    jest.spyOn(global, 'setTimeout').mockImplementation(((fn: () => void) => {
      scheduled.push(fn);
      return { unref: () => undefined };
    }) as any);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await dataSource.destroy();
  });

  describe('ingest', () => {
    it('turns a join, chat, death and leave into four events and one session', async () => {
      players.readStats
        .mockResolvedValueOnce({ 'minecraft:custom': { 'minecraft:deaths': 3, 'minecraft:play_time': 100 }, 'minecraft:mined': { 'minecraft:stone': 10 } })
        .mockResolvedValueOnce({
          'minecraft:custom': { 'minecraft:deaths': 4, 'minecraft:mob_kills': 2, 'minecraft:walk_one_cm': 900 },
          'minecraft:mined': { 'minecraft:stone': 110, 'minecraft:diamond_ore': 3 },
        });

      const count = await service.ingest(
        'srv',
        [
          line('12:00:00', `UUID of player Steve is ${STEVE}`),
          line('12:00:01', 'Steve joined the game'),
          line('12:05:00', '<Steve> anyone seen my diamonds?'),
          line('12:06:00', 'Steve was slain by Zombie'),
          line('12:07:00', 'Steve has made the advancement [Stone Age]'),
          line('12:10:00', 'Steve left the game'),
          line('12:10:01', 'Done (3.2s)! For help, type "help"'),
        ],
        at,
      );

      expect(count).toBe(5);
      const events = await dataSource.getRepository(ActivityEvent).find({ order: { id: 'ASC' } });
      expect(events.map((event) => event.type)).toEqual(['join', 'chat', 'death', 'advancement', 'leave']);
      expect(events.every((event) => event.uuid === STEVE)).toBe(true);

      let [session] = await sessions();
      expect(session).toMatchObject({ name: 'Steve', uuid: STEVE, chatCount: 1, advancements: 1, loggedDeaths: 1, deaths: 1 });
      expect(session.endAt?.toISOString()).toBe('2026-09-25T12:10:00.000Z');

      await runScheduled();
      [session] = await sessions();
      expect(session).toMatchObject({ deaths: 1, mobKills: 2, blocksMined: 103, distanceCm: 900, baseline: null });
      expect(session.oreDeltas).toEqual({ 'minecraft:stone': 100, 'minecraft:diamond_ore': 3 });
    });

    it('looks the UUID up when the log does not print it', async () => {
      players.findUuid.mockResolvedValue(STEVE);

      await service.ingest('srv', [line('12:00:00', 'Steve joined the game')], at);

      expect((await sessions())[0].uuid).toBe(STEVE);
      expect(players.findUuid).toHaveBeenCalledWith('srv', 'Steve');
    });

    it('closes every open session when the server stops', async () => {
      await service.ingest('srv', [line('12:00:00', 'Steve joined the game'), line('12:01:00', 'Alex joined the game'), line('13:00:00', 'Stopping server')], at);

      expect((await sessions()).map((session) => session.endAt?.toISOString())).toEqual(['2026-09-25T13:00:00.000Z', '2026-09-25T13:00:00.000Z']);
    });

    it('closes a dangling session when the player joins again', async () => {
      await service.ingest('srv', [line('12:00:00', 'Steve joined the game'), line('12:30:00', 'Steve joined the game')], at);

      const [first, second] = await sessions();
      expect(first.endAt?.toISOString()).toBe('2026-09-25T12:30:00.000Z');
      expect(second.endAt).toBeNull();
    });

    it('resumes open sessions after a panel restart', async () => {
      await service.ingest('srv', [line('12:00:00', 'Steve joined the game')], at);

      const restarted = create();
      await restarted.ingest('srv', [line('12:01:00', '<Steve> back'), line('12:02:00', 'Steve left the game')], at);

      const [session] = await sessions();
      expect(session.chatCount).toBe(1);
      expect(session.endAt?.toISOString()).toBe('2026-09-25T12:02:00.000Z');
    });

    it('keeps imports away from live sessions and without stats', async () => {
      await service.ingest('srv', [line('12:00:00', 'Steve joined the game')], at);
      const state = service.newImportState();

      await service.ingest('srv', [line('08:00:00', `UUID of player Steve is ${STEVE}`), line('08:00:01', 'Steve joined the game'), line('08:10:00', 'Steve fell from a high place')], at, state);
      await service.closeOpenSessions('srv', undefined, state);

      const [live, imported] = await sessions();
      expect(live.endAt).toBeNull();
      expect(imported).toMatchObject({ deaths: 1, mobKills: null, baseline: null });
      expect(imported.endAt?.toISOString()).toBe('2026-09-25T08:10:00.000Z');
      expect(players.readStats).toHaveBeenCalledTimes(0);
      expect(players.readInventory).toHaveBeenCalledTimes(0);
    });

    it('ignores activity from players it never saw join', async () => {
      await service.ingest('srv', [line('12:00:00', '<Ghost> hi')], at);

      expect(await sessions()).toEqual([]);
      expect(await dataSource.getRepository(ActivityEvent).count()).toBe(1);
    });

    it('forgets cached state on request', async () => {
      await service.ingest('srv', [line('12:00:00', 'Steve joined the game')], at);
      await dataSource.getRepository(PlayerSession).update({ name: 'Steve' }, { endAt: at('12:05:00') });
      service.forgetLiveState('srv');

      await service.ingest('srv', [line('12:06:00', 'Steve left the game')], at);

      expect((await sessions())[0].endAt?.toISOString()).toBe('2026-09-25T12:05:00.000Z');
    });

    it('closes open sessions at the last event when no time is given', async () => {
      await service.ingest('srv', [line('12:00:00', 'Steve joined the game'), line('12:03:00', '<Steve> bye')], at);

      await service.closeOpenSessions('srv');

      expect((await sessions())[0].endAt?.toISOString()).toBe('2026-09-25T12:03:00.000Z');
    });
  });

  describe('finalizeSession', () => {
    it('clears the baseline even when the stats cannot be read', async () => {
      players.findUuid.mockResolvedValue(STEVE);
      players.readStats.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('EACCES'));
      await service.ingest('srv', [line('12:00:00', 'Steve joined the game'), line('12:01:00', 'Steve left the game')], at);

      await runScheduled();

      expect((await sessions())[0]).toMatchObject({ baseline: null, deaths: 0, mobKills: null });
    });

    it('does nothing for unknown or already finalized sessions', async () => {
      await expect(service.finalizeSession(999)).resolves.toBeUndefined();
    });

    it('skips the stats when the session had no baseline', async () => {
      players.findUuid.mockResolvedValue(STEVE);
      await service.ingest('srv', [line('12:00:00', 'Steve joined the game')], at);
      await dataSource.getRepository(PlayerSession).update({ name: 'Steve' }, { baseline: null });
      service.forgetLiveState('srv');
      await service.ingest('srv', [line('12:01:00', 'Steve left the game')], at);
      players.readStats.mockClear();

      await runScheduled();

      expect(players.readStats).not.toHaveBeenCalled();
      expect(players.readInventory).toHaveBeenCalledTimes(2);
    });
  });

  describe('queries', () => {
    beforeEach(async () => {
      await service.ingest(
        'srv',
        [
          line('10:00:00', 'Steve joined the game'),
          line('10:01:00', '<Steve> Hello World'),
          line('10:02:00', 'Alex joined the game'),
          line('10:03:00', '<Alex> hello steve'),
          line('10:04:00', 'Alex was blown up by Creeper'),
        ],
        at,
      );
    });

    it('filters events by type, player, text and time', async () => {
      expect((await service.listEvents('srv', { types: ['chat'] })).events.map((event) => event.name)).toEqual(['Alex', 'Steve']);
      expect((await service.listEvents('srv', { name: 'Alex' })).events).toHaveLength(3);
      expect((await service.listEvents('srv', { q: 'hello' })).events).toHaveLength(2);
      expect((await service.listEvents('srv', { from: at('10:02:30'), to: at('10:03:30') })).events.map((event) => event.message)).toEqual(['hello steve']);
      expect((await service.listEvents('other', {})).events).toEqual([]);
    });

    it('pages with a cursor', async () => {
      const first = await service.listEvents('srv', { limit: 2 });
      expect(first.events).toHaveLength(2);
      const second = await service.listEvents('srv', { limit: 2, before: first.nextCursor });
      const third = await service.listEvents('srv', { limit: 2, before: second.nextCursor });
      expect(third.events).toHaveLength(1);
      expect(third.nextCursor).toBeNull();
    });

    it('lists sessions by uuid or by name', async () => {
      await dataSource.getRepository(PlayerSession).update({ name: 'Steve' }, { uuid: STEVE });

      expect(await service.listSessions('srv', { uuid: STEVE.toUpperCase() })).toHaveLength(1);
      expect(await service.listSessions('srv', { name: 'Alex' })).toHaveLength(1);
      expect(await service.listSessions('srv', { uuid: STEVE, name: 'Steve' })).toHaveLength(1);
      expect(await service.listSessions('srv', {})).toEqual([]);
    });
  });

  describe('summarize', () => {
    it('adds up sessions, weekdays and the play streak', async () => {
      const repo = dataSource.getRepository(PlayerSession);
      const base = { serverId: 'srv', name: 'Steve', uuid: STEVE, loggedDeaths: 0, advancements: 0, chatCount: 0 };
      await repo.save([
        repo.create({ ...base, startAt: new Date('2026-09-23T10:00:00Z'), endAt: new Date('2026-09-23T11:00:00Z'), deaths: 2 }),
        repo.create({ ...base, startAt: new Date('2026-09-24T10:00:00Z'), endAt: new Date('2026-09-24T10:30:00Z'), loggedDeaths: 1 }),
        repo.create({ ...base, startAt: new Date('2026-09-25T10:00:00Z'), endAt: null }),
      ]);

      const summary = await service.summarize('srv', { uuid: STEVE }, 'UTC', new Date('2026-09-25T10:15:00Z'));

      expect(summary).toMatchObject({ sessions: 3, totalMs: 105 * 60_000, averageMs: 35 * 60_000, longestMs: 60 * 60_000, deaths: 3, streakDays: 3 });
      expect(summary.playMsByWeekday[3]).toBe(60 * 60_000); // Wednesday
      expect(await service.summarize('srv', {}, 'UTC')).toMatchObject({ sessions: 0, averageMs: 0, longestMs: 0, streakDays: 0 });
    });
  });

  describe('inventory snapshots', () => {
    beforeEach(() => {
      players.findUuid.mockResolvedValue(STEVE);
    });

    it('snapshots on join, autosave and leave, skipping unchanged inventories', async () => {
      players.readInventory
        .mockResolvedValueOnce(inventory('minecraft:diamond', '2026-09-25T11:00:00Z'))
        .mockResolvedValueOnce(inventory('minecraft:diamond', '2026-09-25T12:05:00Z'))
        .mockResolvedValueOnce(inventory('minecraft:dirt', '2026-09-25T12:10:00Z'))
        .mockResolvedValueOnce(inventory('minecraft:stick', '2026-09-25T12:20:00Z'));

      await service.ingest('srv', [line('12:00:00', 'Steve joined the game')], at);
      await service.snapshotOnline('srv');
      await service.snapshotOnline('srv');
      await service.ingest('srv', [line('12:15:00', 'Steve was slain by Zombie'), line('12:20:00', 'Steve left the game')], at);
      await runScheduled();

      expect((await snapshots()).map((snapshot) => [snapshot.reason, snapshot.data.inventory[0].id])).toEqual([
        ['join', 'minecraft:diamond'],
        ['autosave', 'minecraft:dirt'],
        ['leave', 'minecraft:stick'],
      ]);

      const list = await service.listSnapshots('srv', STEVE.toUpperCase());
      expect(list.map((item) => [item.reason, item.items, item.deathMessage])).toEqual([
        ['leave', 1, null],
        ['autosave', 1, 'Steve was slain by Zombie'],
        ['join', 1, null],
      ]);
      const full = await service.getSnapshot('srv', list[1].id);
      expect(full.data.inventory[0].id).toBe('minecraft:dirt');
      await expect(service.getSnapshot('other', list[1].id)).rejects.toThrow('not found');
    });

    it('keeps only the newest 50 snapshots per player', async () => {
      for (let i = 0; i < 52; i++) {
        players.readInventory.mockResolvedValueOnce(inventory(`minecraft:item_${i}`, new Date(Date.UTC(2026, 8, 25, 0, i)).toISOString()));
        await service.snapshotInventory('srv', STEVE, 'Steve', 'autosave');
      }

      const rows = await snapshots();
      expect(rows).toHaveLength(50);
      expect(rows[0].data.inventory[0].id).toBe('minecraft:item_2');
    });

    it('logs and moves on when the player file cannot be read', async () => {
      players.readInventory.mockRejectedValue(new Error('corrupt'));
      await expect(service.snapshotInventory('srv', STEVE, 'Steve', 'join')).resolves.toBeUndefined();
      expect(await snapshots()).toEqual([]);
    });

    it('skips online players without a known UUID', async () => {
      players.findUuid.mockResolvedValue(null);
      await service.ingest('srv', [line('12:00:00', 'Ghost joined the game')], at);
      await service.snapshotOnline('srv');
      expect(players.readInventory).not.toHaveBeenCalled();
    });
  });

  it('prunes events and closed sessions past the retention window', async () => {
    await service.ingest('srv', [line('10:00:00', 'Steve joined the game'), line('10:10:00', 'Steve left the game'), line('10:20:00', 'Alex joined the game')], at);

    await service.prune(new Date('2026-10-25T10:15:00Z'));

    expect(await dataSource.getRepository(ActivityEvent).count()).toBe(1);
    expect((await sessions()).map((session) => session.name)).toEqual(['Alex']);
  });

  it('prunes sessions that never closed once they are past the retention window', async () => {
    await service.ingest('srv', [line('10:00:00', 'Steve joined the game')], at);

    await service.prune(new Date('2026-10-20T00:00:00Z'));
    expect(await sessions()).toHaveLength(1);

    await service.prune(new Date('2026-11-01T00:00:00Z'));
    expect(await sessions()).toEqual([]);

    // The cached session is gone too: a late leave line must not bring it back
    await service.ingest('srv', [line('10:05:00', 'Steve left the game')], at);
    expect(await sessions()).toEqual([]);
  });

  it('keeps only the newest events of a server over the cap', async () => {
    await service.ingest('srv', ['a', 'b', 'c', 'd', 'e'].map((word, i) => line(`10:0${i}:00`, `<Steve> ${word}`)), at);
    await service.ingest('other', [line('10:00:00', '<Alex> hi')], at);

    await service.prune(new Date('2026-09-25T12:00:00Z'), 3);

    const kept = await dataSource.getRepository(ActivityEvent).find({ order: { id: 'ASC' } });
    expect(kept.map((event) => `${event.serverId}:${event.message}`)).toEqual(['srv:c', 'srv:d', 'srv:e', 'other:hi']);
  });

  it('clamps negative stat deltas', () => {
    expect(sessionDeltas({ 'minecraft:custom': { 'minecraft:deaths': 5 } }, { 'minecraft:custom': { 'minecraft:deaths': 1 } })).toMatchObject({ deaths: 0, oreDeltas: {} });
  });
});
