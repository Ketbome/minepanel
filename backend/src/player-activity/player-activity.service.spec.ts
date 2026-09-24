import { DataSource } from 'typeorm';
import { PlayerSession, PlayerTracking } from './entities/player-session.entity';
import { PlayerActivityService } from './player-activity.service';

const start = Date.parse('2026-09-24T12:00:00Z');
const line = (seconds: number, message: string) => `${new Date(start + seconds * 1000).toISOString()} [12:00:00] [Server thread/INFO]: ${message}`;

describe('Player activity persistence', () => {
  let db: DataSource;
  let service: PlayerActivityService;
  const store = { listServerDirs: jest.fn(), readConfig: jest.fn() };
  const management = { readPlayerLogWindow: jest.fn() };
  const stats = { getStats: jest.fn().mockResolvedValue(null) };
  let now: jest.SpyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();
    now = jest.spyOn(Date, 'now').mockReturnValue(start + 32_000);
    db = await new DataSource({ type: 'sqljs', entities: [PlayerSession, PlayerTracking], synchronize: true }).initialize();
    store.listServerDirs.mockResolvedValue(['survival']);
    store.readConfig.mockResolvedValue({ edition: 'JAVA' });
    management.readPlayerLogWindow.mockResolvedValue({ runId: 'container:boot', running: true, logs: line(0, 'Alex joined the game'), truncated: false });
    service = new PlayerActivityService(db.getRepository(PlayerSession), db.getRepository(PlayerTracking), store as any, management as any, stats as any);
  });
  afterEach(async () => { service.onModuleDestroy(); now.mockRestore(); await db.destroy(); });

  it('persists sessions, deduplicates joins, and aggregates only observed time', async () => {
    await service.collect();
    let result = await service.list('survival', 0);
    expect(result.players[0]).toMatchObject({ key: 'java:alex', name: 'Alex', totalSeconds: 30, online: true, sessionCount: 1 });
    now.mockReturnValue(start + 62_000);
    management.readPlayerLogWindow.mockResolvedValue({ runId: 'container:boot', running: true, logs: [line(0, 'Alex joined the game'), line(45, 'Alex left the game'), line(50, 'Alex joined the game')].join('\n'), truncated: false });
    await service.collect();
    result = await service.list('survival', 0);
    expect(result.players[0]).toMatchObject({ totalSeconds: 55, sessionCount: 2, online: true });
    const detail = await service.detail('survival', 'java:alex', 0);
    expect(detail.sessions.map((session) => session.durationSeconds)).toEqual([10, 45]);
    expect(detail.sessions[1].endReason).toBe('left');
    expect(stats.getStats).toHaveBeenCalledWith('survival', 'Alex');
    expect((await service.list('other', 0)).players).toEqual([]);
    await expect(service.detail('other', 'java:alex', 0)).rejects.toThrow('Player not found');
  });

  it.each(['restart', 'missing', 'truncated', 'gap'])('closes at last observation on %s and never counts the outage', async (reason) => {
    await service.collect();
    // A missing window only closes sessions once the outage outlasts the gap limit.
    now.mockReturnValue(start + (reason === 'gap' || reason === 'missing' ? 300_000 : 62_000));
    management.readPlayerLogWindow.mockResolvedValue(reason === 'missing' ? null : { runId: reason === 'restart' ? 'container:next' : 'container:boot', running: true, logs: '', truncated: reason === 'truncated' });
    await service.collect();
    const detail = await service.detail('survival', 'java:alex', 0);
    expect(detail.profile.totalSeconds).toBe(30);
    expect(detail.sessions[0]).toMatchObject({ endReason: 'interrupted', leftAt: new Date(start + 30_000).toISOString() });
    if (reason === 'missing' || reason === 'truncated') expect(detail.profile.online).toBeNull();
  });

  it('retries a transiently unreadable window instead of consuming it', async () => {
    await service.collect();
    now.mockReturnValue(start + 62_000);
    management.readPlayerLogWindow.mockResolvedValue(null);
    await service.collect();
    expect((await service.detail('survival', 'java:alex', 0)).sessions[0]).toMatchObject({ leftAt: null, endReason: null });
    expect((await service.list('survival', 0)).players[0].online).toBeNull();
    now.mockReturnValue(start + 92_000);
    management.readPlayerLogWindow.mockResolvedValue({ runId: 'container:boot', running: true, logs: line(40, 'Alex left the game'), truncated: false });
    await service.collect();
    expect(management.readPlayerLogWindow).toHaveBeenLastCalledWith('survival', new Date(start + 30_000), new Date(start + 90_000));
    expect((await service.detail('survival', 'java:alex', 0)).sessions[0]).toMatchObject({ endReason: 'left', durationSeconds: 40 });
  });

  it('keeps persisted history across panel restart and marks stale status unknown', async () => {
    await service.collect();
    now.mockReturnValue(start + 300_000);
    expect((await service.list('survival', 0)).players[0].online).toBeNull();
    const restarted = new PlayerActivityService(db.getRepository(PlayerSession), db.getRepository(PlayerTracking), store as any, management as any, stats as any);
    management.readPlayerLogWindow.mockResolvedValue({ runId: 'container:boot', running: true, logs: '', truncated: false });
    await restarted.collect();
    expect((await restarted.detail('survival', 'java:alex', 0)).sessions[0].endReason).toBe('interrupted');
  });

  it('closes open sessions when stopped and handles Bedrock XUIDs and renamed players', async () => {
    store.readConfig.mockResolvedValue({ edition: 'BEDROCK' });
    management.readPlayerLogWindow.mockResolvedValue({ runId: 'container:boot', running: false, logs: `${new Date(start).toISOString()} [2026-09-24 12:00:00:000 INFO] Player connected: Alex One, xuid: 12345, pfid: abc`, truncated: false });
    await service.collect();
    expect((await service.list('survival', 0)).players[0]).toMatchObject({ key: 'bedrock:12345', online: false });
    expect((await service.detail('survival', 'bedrock:12345', 0)).sessions[0].endReason).toBe('interrupted');
  });

  it('paginates profiles and sessions without crossing server boundaries', async () => {
    const repo = db.getRepository(PlayerSession);
    for (let index = 0; index < 26; index++) {
      await repo.save({ serverId: 'survival', playerKey: `java:p${index}`, name: `p${index}`, joinedAt: new Date(start), lastSeenAt: new Date(start), leftAt: new Date(start), endReason: 'left' });
    }
    expect((await service.list('survival', 0)).hasMore).toBe(true);
    expect((await service.list('survival', 1)).players).toHaveLength(1);
    for (let index = 0; index < 26; index++) await repo.save({ serverId: 'survival', playerKey: 'java:alex', name: 'Alex', joinedAt: new Date(start + index), lastSeenAt: new Date(start + index), leftAt: null, endReason: null });
    expect((await service.detail('survival', 'java:alex', 0)).hasMore).toBe(true);
    expect((await service.detail('survival', 'java:alex', 1)).sessions).toHaveLength(1);
  });

  it('skips invalid/missing configs, isolates per-server failures, and skips overlapping scans', async () => {
    store.listServerDirs.mockResolvedValue(['../bad', 'missing', 'broken', 'survival']);
    store.readConfig.mockImplementation(async (id) => { if (id === 'broken') throw Error(); return id === 'missing' ? null : {}; });
    await Promise.all([service.collect(), service.collect()]);
    expect(management.readPlayerLogWindow).toHaveBeenCalledTimes(1);
    expect((await service.list('survival', 0)).players).toHaveLength(1);
  });

  it('splits a rejoin with a missing leave instead of counting unknown downtime', async () => {
    await service.collect();
    now.mockReturnValue(start + 62_000);
    management.readPlayerLogWindow.mockResolvedValue({ runId: 'container:boot', running: true, logs: line(40, 'Alex joined the game'), truncated: false });
    await service.collect();
    const detail = await service.detail('survival', 'java:alex', 0);
    expect(detail.profile).toMatchObject({ totalSeconds: 50, sessionCount: 2 });
    expect(detail.sessions[1].endReason).toBe('interrupted');
  });

  it('starts/stops the background timer', async () => {
    const collect = jest.spyOn(service, 'collect').mockResolvedValue();
    jest.useFakeTimers();
    service.onModuleInit();
    jest.advanceTimersByTime(30_000);
    expect(collect).toHaveBeenCalledTimes(2);
    service.onModuleDestroy();
    jest.advanceTimersByTime(30_000);
    expect(collect).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });
});
