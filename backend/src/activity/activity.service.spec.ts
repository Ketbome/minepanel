import { DataSource } from 'typeorm';
import { ActivityService, sessionDeltas } from './activity.service';
import { ActivityEvent } from './entities/activity-event.entity';
import { InventorySnapshot } from './entities/inventory-snapshot.entity';
import { LogCursor } from './entities/log-cursor.entity';
import { PlayerSession } from 'src/player-activity/entities/player-session.entity';
import { LogLine } from './log-line.parser';

const STEVE = '069a79f4-44e9-4726-a5be-fca90e38aaf5';
const line = (time: string, message: string, level = 'INFO'): LogLine => ({ time, level, message });
const at = (time: string) => new Date(`2026-09-25T${time}Z`);

describe('ActivityService', () => {
  let dataSource: DataSource;
  let players: { readStats: jest.Mock; findUuid: jest.Mock; readInventory: jest.Mock };
  let service: ActivityService;

  const create = () =>
    new ActivityService(
      dataSource.getRepository(ActivityEvent),
      dataSource.getRepository(PlayerSession),
      dataSource.getRepository(InventorySnapshot),
      dataSource.getRepository(LogCursor),
      players as any,
    );
  const snapshots = () => dataSource.getRepository(InventorySnapshot).find({ order: { id: 'ASC' } });
  const inventory = (id: string, savedAt: string) => ({
    inventory: { inventory: [{ slot: 0, id, count: 1 }], armor: [], offhand: null, enderChest: [] },
    savedAt: new Date(savedAt),
  });
  const sessions = () => dataSource.getRepository(PlayerSession).find({ order: { id: 'ASC' } });
  const openSession = (name: string, joinedAt: Date, extra: Partial<PlayerSession> = {}) => {
    const repo = dataSource.getRepository(PlayerSession);
    return repo.save(repo.create({ serverId: 'srv', playerKey: `java:${name.toLowerCase()}`, name, joinedAt, lastSeenAt: joinedAt, leftAt: null, endReason: null, ...extra }));
  };

  beforeEach(async () => {
    dataSource = new DataSource({ type: 'sqljs', entities: [ActivityEvent, PlayerSession, LogCursor, InventorySnapshot], synchronize: true });
    await dataSource.initialize();
    players = { readStats: jest.fn().mockResolvedValue(null), findUuid: jest.fn().mockResolvedValue(null), readInventory: jest.fn().mockResolvedValue(null) };
    service = create();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await dataSource.destroy();
  });

  describe('ingest', () => {
    it('records join, chat, death, advancement and leave as events without creating sessions', async () => {
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
      expect(await sessions()).toEqual([]);
    });

    it('knows who is online after a panel restart from the open player-activity sessions', async () => {
      await openSession('Steve', at('11:00:00'), { uuid: STEVE });

      await service.ingest('srv', [line('12:00:00', 'Steve fell from a high place')], at);

      const [death] = await dataSource.getRepository(ActivityEvent).find();
      expect(death).toMatchObject({ type: 'death', uuid: STEVE });
    });

    it('stops treating players as online once the server stops', async () => {
      await service.ingest('srv', [line('12:00:00', 'Steve joined the game'), line('12:30:00', 'Stopping server'), line('12:31:00', 'Steve fell from a high place')], at);

      expect((await dataSource.getRepository(ActivityEvent).find()).map((event) => event.type)).toEqual(['join']);
    });

    it('reloads who is online after a reset', async () => {
      await service.ingest('srv', [line('12:00:00', 'Steve joined the game')], at);
      service.resetLive('srv');

      await service.ingest('srv', [line('12:01:00', 'Steve fell from a high place')], at);

      expect((await dataSource.getRepository(ActivityEvent).find()).map((event) => event.type)).toEqual(['join']);
    });
  });

  describe('history import', () => {
    it('rebuilds left, rejoined, stopped and unfinished sessions', async () => {
      const state = service.newImportState();

      await service.ingest(
        'srv',
        [
          line('08:00:00', `UUID of player Steve is ${STEVE}`),
          line('08:00:01', 'Steve joined the game'),
          line('08:10:00', 'Steve left the game'),
          line('08:20:00', 'Alex joined the game'),
          line('08:25:00', 'Alex joined the game'),
          line('08:30:00', 'Stopping server'),
          line('09:00:00', 'Steve joined the game'),
          line('09:05:00', '<Steve> last line'),
        ],
        at,
        state,
      );
      service.endLog(state);

      expect(state.closed.map((session) => [session.name, session.uuid, session.joinedAt.toISOString().slice(11, 19), session.leftAt.toISOString().slice(11, 19), session.endReason])).toEqual([
        ['Steve', STEVE, '08:00:01', '08:10:00', 'left'],
        ['Alex', null, '08:20:00', '08:25:00', 'interrupted'],
        ['Alex', null, '08:25:00', '08:30:00', 'interrupted'],
        ['Steve', STEVE, '09:00:00', '09:05:00', 'interrupted'],
      ]);
      expect(players.readStats).not.toHaveBeenCalled();
      expect(players.readInventory).not.toHaveBeenCalled();
    });

    it('saves only the sessions older than the first recorded one', async () => {
      await openSession('Steve', at('10:00:00'));
      const imported = [
        { name: 'Steve', uuid: STEVE, joinedAt: at('08:00:00'), leftAt: at('08:10:00'), endReason: 'left' as const },
        { name: 'Steve', uuid: STEVE, joinedAt: at('10:05:00'), leftAt: at('10:10:00'), endReason: 'left' as const },
      ];

      expect(await service.saveImportedSessions('srv', imported)).toBe(1);
      expect(await service.saveImportedSessions('srv', [imported[1]])).toBe(0);

      const [, saved] = await sessions();
      expect(saved).toMatchObject({ playerKey: 'java:steve', uuid: STEVE, endReason: 'left' });
      expect(saved.lastSeenAt.toISOString()).toBe('2026-09-25T08:10:00.000Z');
    });

    it('saves everything when nothing was recorded yet', async () => {
      const imported = [{ name: 'Alex', uuid: null, joinedAt: at('08:00:00'), leftAt: at('08:10:00'), endReason: 'interrupted' as const }];

      expect(await service.saveImportedSessions('srv', imported)).toBe(1);
    });
  });

  describe('session enrichment', () => {
    it('takes a baseline on join and turns it into deltas on leave', async () => {
      players.findUuid.mockResolvedValue(STEVE);
      players.readStats
        .mockResolvedValueOnce({ 'minecraft:custom': { 'minecraft:deaths': 3, 'minecraft:play_time': 100 }, 'minecraft:mined': { 'minecraft:stone': 10 } })
        .mockResolvedValueOnce({
          'minecraft:custom': { 'minecraft:deaths': 4, 'minecraft:mob_kills': 2, 'minecraft:walk_one_cm': 900 },
          'minecraft:mined': { 'minecraft:stone': 110, 'minecraft:diamond_ore': 3 },
        });
      const session = await openSession('Steve', at('12:00:00'));

      await service.beginSession(session.id);
      expect((await sessions())[0]).toMatchObject({ uuid: STEVE, baseline: { 'minecraft:custom': { 'minecraft:deaths': 3, 'minecraft:play_time': 100 } } });

      await dataSource.getRepository(PlayerSession).update(session.id, { leftAt: at('12:10:00'), endReason: 'left' });
      await service.finalizeSession(session.id);

      const [done] = await sessions();
      expect(done).toMatchObject({ deaths: 1, mobKills: 2, blocksMined: 103, distanceCm: 900, baseline: null });
      expect(done.oreDeltas).toEqual({ 'minecraft:stone': 100, 'minecraft:diamond_ore': 3 });
    });

    it('counts everything for a player without a stats file yet', async () => {
      players.findUuid.mockResolvedValue(STEVE);
      const session = await openSession('Steve', at('12:00:00'));

      await service.beginSession(session.id);

      expect((await sessions())[0].baseline).toEqual({});
    });

    it('skips unknown, interrupted and unidentified sessions', async () => {
      const interrupted = await openSession('Alex', at('12:00:00'), { endReason: 'interrupted', leftAt: at('12:01:00') });
      const unknown = await openSession('Ghost', at('12:00:00'));

      await service.beginSession(999);
      await service.beginSession(interrupted.id);
      await service.beginSession(unknown.id);

      expect(players.readStats).not.toHaveBeenCalled();
      expect((await sessions()).every((session) => session.baseline === null)).toBe(true);
    });

    it('clears the baseline even when the stats cannot be read', async () => {
      players.readStats.mockRejectedValue(new Error('EACCES'));
      const session = await openSession('Steve', at('12:00:00'), { uuid: STEVE, baseline: {}, leftAt: at('12:01:00'), endReason: 'left' });

      await service.finalizeSession(session.id);

      expect((await sessions())[0]).toMatchObject({ baseline: null, mobKills: null });
    });

    it('does nothing for unknown sessions and skips stats without a baseline', async () => {
      await expect(service.finalizeSession(999)).resolves.toBeUndefined();
      const session = await openSession('Steve', at('12:00:00'), { uuid: STEVE, leftAt: at('12:01:00'), endReason: 'left' });

      await service.finalizeSession(session.id);

      expect(players.readStats).not.toHaveBeenCalled();
      expect(players.readInventory).toHaveBeenCalledTimes(1);
    });
  });

  describe('session event counts', () => {
    const tracked = async (historyImported = false) => {
      const repo = dataSource.getRepository(LogCursor);
      const cursor = await repo.save(repo.create({ serverId: 'srv', headHash: 'x', offset: 0, historyImported }));
      await repo.update(cursor.serverId, { createdAt: at('09:00:00') });
    };

    it('counts chat, advancements and deaths inside each covered session', async () => {
      await tracked();
      await service.ingest(
        'srv',
        [
          line('10:00:00', 'Steve joined the game'),
          line('10:01:00', '<Steve> hi'),
          line('10:02:00', '<Steve> again'),
          line('10:03:00', 'Steve has made the advancement [Stone Age]'),
          line('10:04:00', 'Steve fell from a high place'),
          line('10:30:00', '<Steve> later'),
        ],
        at,
      );
      const before = await openSession('Steve', at('08:00:00'), { leftAt: at('08:30:00') });
      const covered = await openSession('Steve', at('10:00:00'), { leftAt: at('10:10:00') });

      const counts = await service.sessionEventCounts('srv', [before, covered]);

      expect(counts.get(covered.id)).toEqual({ chat: 2, advancements: 1, deaths: 1 });
      expect(counts.has(before.id)).toBe(false);
    });

    it('covers older sessions once the history was imported', async () => {
      await tracked(true);
      const before = await openSession('Steve', at('08:00:00'));

      const counts = await service.sessionEventCounts('srv', [before], at('08:30:00'));

      expect(counts.get(before.id)).toEqual({ chat: 0, advancements: 0, deaths: 0 });
    });

    it('knows nothing without a log cursor', async () => {
      const session = await openSession('Steve', at('10:00:00'));

      expect((await service.sessionEventCounts('srv', [session])).size).toBe(0);
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

      const session = await openSession('Steve', at('12:00:00'));
      await service.beginSession(session.id);
      await service.snapshotOnline('srv');
      await service.snapshotOnline('srv');
      await service.ingest('srv', [line('12:15:00', 'Steve was slain by Zombie'), line('12:20:00', 'Steve left the game')], at);
      await dataSource.getRepository(PlayerSession).update(session.id, { leftAt: at('12:20:00'), endReason: 'left' });
      await service.finalizeSession(session.id);

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
      await openSession('Ghost', at('12:00:00'));
      await service.snapshotOnline('srv');
      expect(players.readInventory).not.toHaveBeenCalled();
    });
  });

  it('prunes events and snapshots past the retention window but keeps sessions', async () => {
    await service.ingest('srv', [line('10:00:00', 'Steve joined the game'), line('10:10:00', 'Steve left the game')], at);
    await openSession('Steve', at('10:00:00'), { leftAt: at('10:10:00'), endReason: 'left' });

    await service.prune(new Date('2026-10-25T10:15:00Z'));

    expect(await dataSource.getRepository(ActivityEvent).count()).toBe(0);
    expect(await sessions()).toHaveLength(1);
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
