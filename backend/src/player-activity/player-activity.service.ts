import { Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { ActivityService } from 'src/activity/activity.service';
import { localDay, tzOffsetMs } from 'src/activity/log-time';
import { ServerStoreService } from 'src/docker-compose/server-store.service';
import { ServerManagementService } from 'src/server-management/server-management.service';
import { PlayerSession, PlayerTracking } from './entities/player-session.entity';
import { parsePlayerEvents } from './player-events';
import { PlayerStatsService } from './player-stats.service';

const PAGE_SIZE = 25;
const INTERVAL_MS = 30_000;
const MAX_GAP_MS = 120_000;
const DAY_MS = 86_400_000;
// Minecraft writes the stats file right after the leave line; read it once that has happened.
const STATS_FLUSH_DELAY_MS = 5_000;

// The panel no longer knows what happened after the last observation, so stat deltas are unknown.
const interrupt = (session: PlayerSession) => {
  session.leftAt = session.lastSeenAt;
  session.endReason = 'interrupted';
  session.baseline = null;
};

@Injectable()
export class PlayerActivityService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PlayerActivityService.name);
  private timer: NodeJS.Timeout | null = null;
  private collecting = false;

  constructor(
    @InjectRepository(PlayerSession) private readonly sessions: Repository<PlayerSession>,
    @InjectRepository(PlayerTracking) private readonly tracking: Repository<PlayerTracking>,
    private readonly store: ServerStoreService,
    private readonly management: ServerManagementService,
    private readonly stats: PlayerStatsService,
    private readonly activity: ActivityService,
  ) {}

  onModuleInit() {
    void this.collect();
    this.timer = setInterval(() => { void this.collect(); }, INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async collect(): Promise<void> {
    if (this.collecting) return;
    this.collecting = true;
    try {
      for (const serverId of await this.store.listServerDirs()) {
        if (!/^[a-zA-Z0-9_-]+$/.test(serverId)) continue;
        try { await this.collectServer(serverId); }
        catch { this.logger.warn(`Could not collect player activity for ${serverId}`); }
      }
    } catch {
      this.logger.warn('Could not enumerate servers for player activity');
    } finally { this.collecting = false; }
  }

  private async collectServer(serverId: string) {
    const config = await this.store.readConfig(serverId);
    if (!config) return;
    const previous = await this.tracking.findOneBy({ serverId });
    const until = new Date(Date.now() - 2_000);
    // First activation recovers at most one day of retained Docker logs.
    const since = previous?.cursor ?? new Date(until.getTime() - 86_400_000);
    if (until <= since) return;
    const window = await this.management.readPlayerLogWindow(serverId, since, until);
    // A transient read failure must not consume the window: Docker still has those lines,
    // so keep the cursor and retry. Only an outage longer than MAX_GAP_MS closes sessions.
    if (!window && previous && until.getTime() - since.getTime() <= MAX_GAP_MS) {
      await this.tracking.save({ ...previous, status: 'unavailable' });
      return;
    }
    // Java servers with the activity log on also get stat deltas and inventory snapshots per session
    const enrich = Boolean(config.activityTracking) && config.edition !== 'BEDROCK';
    const begun: number[] = [];
    const finished: number[] = [];
    await this.sessions.manager.transaction(async (manager) => {
      const sessions = manager.getRepository(PlayerSession);
      const tracking = manager.getRepository(PlayerTracking);
      const open = await sessions.findBy({ serverId, leftAt: IsNull() });
      const gap = !window || window.truncated || (previous && (previous.runId !== window.runId || until.getTime() - since.getTime() > MAX_GAP_MS));
      if (gap) {
        open.forEach(interrupt);
        if (open.length) await sessions.save(open);
      }
      const active = new Map((gap ? [] : open).map((session) => [session.playerKey, session]));
      const events = window && !window.truncated ? parsePlayerEvents(window.logs, config.edition === 'BEDROCK') : [];
      for (const event of events) {
        if (event.at <= since || event.at > until) continue;
        const existing = active.get(event.key);
        if (event.joined && (!existing || event.at > existing.joinedAt)) {
          // A new join without a recorded leave must not bridge a missed disconnect/restart.
          if (existing) {
            interrupt(existing);
            await sessions.save(existing);
          }
          const session = await sessions.save(sessions.create({ serverId, playerKey: event.key, name: event.name, joinedAt: event.at, lastSeenAt: event.at, leftAt: null, endReason: null }));
          active.set(event.key, session);
          // A join recovered from older logs has no stats baseline worth taking now
          if (enrich && until.getTime() - event.at.getTime() <= MAX_GAP_MS) begun.push(session.id);
        } else if (!event.joined && existing) {
          existing.lastSeenAt = event.at;
          existing.leftAt = event.at;
          existing.endReason = 'left';
          await sessions.save(existing);
          active.delete(event.key);
          if (enrich) finished.push(existing.id);
        }
      }
      for (const session of active.values()) {
        if (window?.running) session.lastSeenAt = until;
        else interrupt(session);
      }
      if (active.size) await sessions.save([...active.values()]);
      await tracking.save({ serverId, cursor: until, runId: window?.runId ?? previous?.runId ?? '', status: !window || window.truncated ? 'unavailable' : window.running ? 'collecting' : 'offline' });
    });
    for (const id of begun) await this.activity.beginSession(id);
    for (const id of finished) setTimeout(() => void this.activity.finalizeSession(id), STATS_FLUSH_DELAY_MS).unref();
  }

  private summaryQuery(serverId: string) {
    return this.sessions.createQueryBuilder('s')
      .select('s.playerKey', 'key').addSelect('(SELECT latest.name FROM player_sessions latest WHERE latest.serverId = s.serverId AND latest.playerKey = s.playerKey ORDER BY latest.joinedAt DESC, latest.id DESC LIMIT 1)', 'name')
      .addSelect('MIN(s.joinedAt)', 'firstSeen').addSelect('MAX(s.lastSeenAt)', 'lastSeen')
      .addSelect('COUNT(*)', 'sessionCount')
      .addSelect("MAX(CASE WHEN s.endReason = 'interrupted' THEN s.lastSeenAt ELSE NULL END)", 'interruptedAt')
      .addSelect('SUM(MAX(0, (julianday(s.lastSeenAt) - julianday(s.joinedAt)) * 86400))', 'totalSeconds')
      .addSelect('MAX(CASE WHEN s.leftAt IS NULL THEN 1 ELSE 0 END)', 'open')
      .where('s.serverId = :serverId', { serverId }).groupBy('s.playerKey');
  }

  private async trackingState(serverId: string) {
    const state = await this.tracking.findOneBy({ serverId });
    return { status: !state || Date.now() - state.cursor.getTime() > MAX_GAP_MS ? 'unavailable' : state.status, sampledAt: state?.cursor.toISOString() ?? null };
  }

  private profile(row: any, status: string) {
    return { key: row.key as string, name: row.name as string, firstSeen: new Date(`${row.firstSeen}Z`).toISOString(), lastSeen: new Date(`${row.lastSeen}Z`).toISOString(), sessionCount: Number(row.sessionCount), totalSeconds: Math.round(Number(row.totalSeconds)), online: status === 'offline' ? false : status !== 'collecting' ? null : Number(row.open) ? true : row.interruptedAt === row.lastSeen ? null : false };
  }

  async list(serverId: string, page: number) {
    const state = await this.trackingState(serverId);
    const rows = await this.summaryQuery(serverId).orderBy('MAX(s.lastSeenAt)', 'DESC').addOrderBy('s.playerKey', 'ASC').offset(page * PAGE_SIZE).limit(PAGE_SIZE + 1).getRawMany();
    return { ...state, page, hasMore: rows.length > PAGE_SIZE, players: rows.slice(0, PAGE_SIZE).map((row) => this.profile(row, state.status)) };
  }

  async detail(serverId: string, key: string, page: number) {
    const state = await this.trackingState(serverId);
    const row = await this.summaryQuery(serverId).andWhere('s.playerKey = :key', { key }).getRawOne();
    if (!row) throw new NotFoundException('Player not found');
    const [rows, stats, all, config] = await Promise.all([
      this.sessions.find({ where: { serverId, playerKey: key }, order: { joinedAt: 'DESC', id: 'DESC' }, skip: page * PAGE_SIZE, take: PAGE_SIZE + 1 }),
      this.stats.getStats(serverId, row.name),
      this.sessions.find({ select: { joinedAt: true, lastSeenAt: true, deaths: true }, where: { serverId, playerKey: key } }),
      this.store.readConfig(serverId),
    ]);
    const sessions = rows.slice(0, PAGE_SIZE);
    const counts = config?.activityTracking ? await this.activity.sessionEventCounts(serverId, sessions) : new Map();
    return {
      ...state, profile: this.profile(row, state.status), stats, summary: summarizeSessions(all, config?.tz || 'UTC'), page, hasMore: rows.length > PAGE_SIZE,
      sessions: sessions.map((session) => ({
        id: session.id, joinedAt: session.joinedAt.toISOString(), lastSeenAt: session.lastSeenAt.toISOString(), leftAt: session.leftAt?.toISOString() ?? null, endReason: session.endReason, durationSeconds: seconds(session),
        deaths: session.deaths, mobKills: session.mobKills, playerKills: session.playerKills, blocksMined: session.blocksMined, distanceCm: session.distanceCm,
        events: counts.get(session.id) ?? null,
      })),
    };
  }
}

const seconds = (session: Pick<PlayerSession, 'joinedAt' | 'lastSeenAt'>) => Math.max(0, Math.round((session.lastSeenAt.getTime() - session.joinedAt.getTime()) / 1000));

export function summarizeSessions(sessions: Pick<PlayerSession, 'joinedAt' | 'lastSeenAt' | 'deaths'>[], tz: string, now = new Date()) {
  const durations = sessions.map(seconds);
  const playSecondsByWeekday = [0, 0, 0, 0, 0, 0, 0];
  const days = new Set<string>();
  sessions.forEach((session, index) => {
    const local = new Date(session.joinedAt.getTime() + tzOffsetMs(session.joinedAt, tz));
    playSecondsByWeekday[local.getUTCDay()] += durations[index];
    days.add(localDay(session.joinedAt, tz));
  });
  let streakDays = 0;
  for (let day = now.getTime(); days.has(localDay(new Date(day), tz)); day -= DAY_MS) streakDays += 1;
  const deaths = sessions.filter((session) => session.deaths !== null);
  return {
    averageSeconds: sessions.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / sessions.length) : 0,
    longestSeconds: durations.length ? Math.max(...durations) : 0,
    // Only sessions recorded with the activity log on know their deaths
    deaths: deaths.length ? deaths.reduce((sum, session) => sum + session.deaths, 0) : null,
    playSecondsByWeekday,
    streakDays,
  };
}
