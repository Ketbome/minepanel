import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import { Between, FindOptionsWhere, In, IsNull, LessThan, Like, Repository } from 'typeorm';
import { PlayersService, summarizeStats } from 'src/players/players.service';
import { ActivityEvent } from './entities/activity-event.entity';
import { InventorySnapshot, SnapshotReason } from './entities/inventory-snapshot.entity';
import { PlayerSession, StatsSnapshot } from './entities/player-session.entity';
import { ActivityType, classifyLine, LogLine } from './log-line.parser';
import { localDay, tzOffsetMs } from './log-time';

export const RETENTION_DAYS = 30;
// Minecraft writes the stats file right after the leave line; read it once that has happened.
const STATS_FLUSH_DELAY_MS = 5_000;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_EVENTS_PAGE = 200;
const MAX_SNAPSHOTS_PER_PLAYER = 50;

// Stone-like blocks and valuable ores whose per-session `minecraft:mined` delta is kept for the x-ray report
export const ORE_IDS = [
  'minecraft:stone',
  'minecraft:deepslate',
  'minecraft:netherrack',
  'minecraft:tuff',
  'minecraft:granite',
  'minecraft:diorite',
  'minecraft:andesite',
  'minecraft:diamond_ore',
  'minecraft:deepslate_diamond_ore',
  'minecraft:ancient_debris',
  'minecraft:emerald_ore',
  'minecraft:deepslate_emerald_ore',
  'minecraft:gold_ore',
  'minecraft:deepslate_gold_ore',
  'minecraft:nether_gold_ore',
];

export interface IngestState {
  open: Map<string, PlayerSession>;
  uuids: Map<string, string>;
  lastEventAt: Date | null;
  live: boolean;
}

export interface EventQuery {
  types?: ActivityType[];
  name?: string;
  q?: string;
  from?: Date;
  to?: Date;
  before?: number;
  limit?: number;
}

export interface PlayerRef {
  uuid?: string;
  name?: string;
}

export interface SnapshotListItem {
  id: number;
  reason: SnapshotReason;
  createdAt: Date;
  items: number;
  // Last snapshot saved before a death: vanilla never writes the inventory at the moment of death
  deathMessage: string | null;
}

export interface SessionSummary {
  sessions: number;
  totalMs: number;
  averageMs: number;
  longestMs: number;
  deaths: number;
  playMsByWeekday: number[];
  streakDays: number;
}

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);
  private readonly liveStates = new Map<string, IngestState>();

  constructor(
    @InjectRepository(ActivityEvent)
    private readonly eventRepo: Repository<ActivityEvent>,
    @InjectRepository(PlayerSession)
    private readonly sessionRepo: Repository<PlayerSession>,
    @InjectRepository(InventorySnapshot)
    private readonly snapshotRepo: Repository<InventorySnapshot>,
    private readonly playersService: PlayersService,
  ) {}

  // Imports run on their own state so they never touch the sessions of players online right now.
  newImportState(): IngestState {
    return { open: new Map(), uuids: new Map(), lastEventAt: null, live: false };
  }

  async ingest(serverId: string, lines: LogLine[], toDate: (time: string) => Date, state?: IngestState): Promise<number> {
    const current = state ?? (await this.getLiveState(serverId));
    const events: ActivityEvent[] = [];
    const touched = new Set<PlayerSession>();

    for (const line of lines) {
      const signal = classifyLine(line, new Set(current.open.keys()));
      if (!signal) continue;
      const at = toDate(line.time);

      if (signal.kind === 'uuid') {
        current.uuids.set(signal.name.toLowerCase(), signal.uuid);
        continue;
      }
      if (signal.kind === 'stop') {
        await this.closeOpenSessions(serverId, at, current);
        continue;
      }

      const key = signal.name.toLowerCase();
      const uuid = current.uuids.get(key) ?? current.open.get(key)?.uuid ?? null;
      events.push(this.eventRepo.create({ serverId, type: signal.type, name: signal.name, uuid, message: signal.message, createdAt: at }));
      current.lastEventAt = at;

      if (signal.type === 'join') {
        await this.openSession(serverId, current, signal.name, uuid, at);
      } else if (signal.type === 'leave') {
        await this.closeSession(serverId, current, key, at);
      } else {
        const session = current.open.get(key);
        if (!session) continue;
        if (signal.type === 'chat') session.chatCount += 1;
        if (signal.type === 'advancement') session.advancements += 1;
        if (signal.type === 'death') session.loggedDeaths += 1;
        touched.add(session);
      }
    }

    if (events.length > 0) await this.eventRepo.save(events);
    if (touched.size > 0) await this.sessionRepo.save([...touched]);
    return events.length;
  }

  // Sessions still open when a log ends without leave lines (crash, rotation, tracking turned off)
  async closeOpenSessions(serverId: string, at?: Date, state?: IngestState): Promise<void> {
    const current = state ?? (await this.getLiveState(serverId));
    const end = at ?? current.lastEventAt ?? new Date();
    for (const key of [...current.open.keys()]) {
      await this.closeSession(serverId, current, key, end);
    }
  }

  forgetLiveState(serverId: string): void {
    this.liveStates.delete(serverId);
  }

  // Runs once Minecraft has written the player's files after a leave
  async finalizeSession(sessionId: number): Promise<void> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session?.uuid) return;
    await this.snapshotInventory(session.serverId, session.uuid, session.name, 'leave');
    if (!session.baseline) return;
    try {
      const current = await this.playersService.readStats(session.serverId, session.uuid);
      if (current) Object.assign(session, sessionDeltas(session.baseline, current));
    } catch (error) {
      this.logger.warn(`Failed to read stats for session ${sessionId}: ${(error as Error).message}`);
    }
    session.baseline = null;
    await this.sessionRepo.save(session);
  }

  // Picks up autosaves of online players; unchanged inventories are skipped by hash
  async snapshotOnline(serverId: string): Promise<void> {
    const state = await this.getLiveState(serverId);
    for (const session of state.open.values()) {
      if (session.uuid) await this.snapshotInventory(serverId, session.uuid, session.name, 'autosave');
    }
  }

  async snapshotInventory(serverId: string, uuid: string, name: string, reason: SnapshotReason): Promise<void> {
    try {
      const saved = await this.playersService.readInventory(serverId, uuid);
      if (!saved) return;
      const hash = createHash('sha1').update(JSON.stringify(saved.inventory)).digest('hex');
      const latest = await this.snapshotRepo.findOne({ where: { serverId, uuid }, order: { createdAt: 'DESC', id: 'DESC' } });
      if (latest?.hash === hash) return;
      await this.snapshotRepo.save(this.snapshotRepo.create({ serverId, uuid, name, reason, hash, data: saved.inventory, createdAt: saved.savedAt }));

      const overflow = await this.snapshotRepo.find({ select: { id: true }, where: { serverId, uuid }, order: { createdAt: 'DESC', id: 'DESC' }, skip: MAX_SNAPSHOTS_PER_PLAYER });
      if (overflow.length > 0) await this.snapshotRepo.delete({ id: In(overflow.map((row) => row.id)) });
    } catch (error) {
      this.logger.warn(`Failed to snapshot the inventory of ${name} on ${serverId}: ${(error as Error).message}`);
    }
  }

  async listSnapshots(serverId: string, uuid: string): Promise<SnapshotListItem[]> {
    const key = uuid.toLowerCase();
    const [snapshots, deaths] = await Promise.all([
      this.snapshotRepo.find({ where: { serverId, uuid: key }, order: { createdAt: 'DESC', id: 'DESC' } }),
      this.eventRepo.find({ where: { serverId, uuid: key, type: 'death' }, order: { createdAt: 'ASC' } }),
    ]);
    const deathBySnapshot = new Map<number, string>();
    for (const death of deaths) {
      const before = snapshots.find((snapshot) => snapshot.createdAt.getTime() <= death.createdAt.getTime());
      if (before) deathBySnapshot.set(before.id, death.message);
    }
    return snapshots.map((snapshot) => ({
      id: snapshot.id,
      reason: snapshot.reason,
      createdAt: snapshot.createdAt,
      items: snapshot.data.inventory.length + snapshot.data.armor.length + snapshot.data.enderChest.length + (snapshot.data.offhand ? 1 : 0),
      deathMessage: deathBySnapshot.get(snapshot.id) ?? null,
    }));
  }

  async getSnapshot(serverId: string, id: number): Promise<InventorySnapshot> {
    const snapshot = await this.snapshotRepo.findOne({ where: { serverId, id } });
    if (!snapshot) {
      throw new NotFoundException(`Snapshot ${id} not found`);
    }
    return snapshot;
  }

  async listEvents(serverId: string, query: EventQuery): Promise<{ events: ActivityEvent[]; nextCursor: number | null }> {
    const limit = Math.min(Math.max(query.limit ?? 50, 1), MAX_EVENTS_PAGE);
    const where: FindOptionsWhere<ActivityEvent> = { serverId };
    if (query.types?.length) where.type = In(query.types);
    if (query.name) where.name = query.name;
    if (query.q) where.message = Like(`%${query.q}%`);
    if (query.from || query.to) where.createdAt = Between(query.from ?? new Date(0), query.to ?? new Date());
    if (query.before) where.id = LessThan(query.before);

    const rows = await this.eventRepo.find({ where, order: { id: 'DESC' }, take: limit + 1 });
    const hasMore = rows.length > limit;
    const events = hasMore ? rows.slice(0, limit) : rows;
    return { events, nextCursor: hasMore ? events[events.length - 1].id : null };
  }

  async listSessions(serverId: string, player: PlayerRef, limit = 100): Promise<PlayerSession[]> {
    const where = this.playerWhere(serverId, player);
    if (!where) return [];
    const sessions = await this.sessionRepo.find({ where, order: { startAt: 'DESC' }, take: limit });
    return sessions.map((session) => ({ ...session, baseline: null }));
  }

  async summarize(serverId: string, player: PlayerRef, tz: string, now = new Date()): Promise<SessionSummary> {
    const where = this.playerWhere(serverId, player);
    const sessions = where ? await this.sessionRepo.find({ where }) : [];
    const durations = sessions.map((session) => Math.max(0, (session.endAt ?? now).getTime() - session.startAt.getTime()));
    const totalMs = durations.reduce((sum, ms) => sum + ms, 0);
    const playMsByWeekday = [0, 0, 0, 0, 0, 0, 0];
    const days = new Set<string>();

    sessions.forEach((session, index) => {
      const local = new Date(session.startAt.getTime() + tzOffsetMs(session.startAt, tz));
      playMsByWeekday[local.getUTCDay()] += durations[index];
      days.add(localDay(session.startAt, tz));
    });

    let streakDays = 0;
    for (let day = now.getTime(); days.has(localDay(new Date(day), tz)); day -= DAY_MS) {
      streakDays += 1;
    }

    return {
      sessions: sessions.length,
      totalMs,
      averageMs: sessions.length ? Math.round(totalMs / sessions.length) : 0,
      longestMs: durations.length ? Math.max(...durations) : 0,
      deaths: sessions.reduce((sum, session) => sum + (session.deaths ?? session.loggedDeaths), 0),
      playMsByWeekday,
      streakDays,
    };
  }

  async prune(now = new Date()): Promise<void> {
    const cutoff = new Date(now.getTime() - RETENTION_DAYS * DAY_MS);
    await this.eventRepo.delete({ createdAt: LessThan(cutoff) });
    await this.sessionRepo.delete({ endAt: LessThan(cutoff) });
    await this.snapshotRepo.delete({ createdAt: LessThan(cutoff) });
  }

  // Sessions recorded before the player's UUID was known only carry the name
  private playerWhere(serverId: string, player: PlayerRef): FindOptionsWhere<PlayerSession>[] | null {
    const where: FindOptionsWhere<PlayerSession>[] = [];
    if (player.uuid) where.push({ serverId, uuid: player.uuid.toLowerCase() });
    if (player.name) where.push({ serverId, name: player.name, ...(player.uuid ? { uuid: IsNull() } : {}) });
    return where.length ? where : null;
  }

  private async getLiveState(serverId: string): Promise<IngestState> {
    let state = this.liveStates.get(serverId);
    if (!state) {
      const open = await this.sessionRepo.find({ where: { serverId, endAt: IsNull() } });
      state = { open: new Map(open.map((session) => [session.name.toLowerCase(), session])), uuids: new Map(), lastEventAt: null, live: true };
      this.liveStates.set(serverId, state);
    }
    return state;
  }

  private async openSession(serverId: string, state: IngestState, name: string, knownUuid: string | null, at: Date): Promise<void> {
    const key = name.toLowerCase();
    if (state.open.has(key)) {
      await this.closeSession(serverId, state, key, at);
    }
    const uuid = knownUuid ?? (await this.playersService.findUuid(serverId, name).catch(() => null));
    const baseline = state.live && uuid ? await this.playersService.readStats(serverId, uuid).catch(() => null) : null;
    const session = await this.sessionRepo.save(
      this.sessionRepo.create({ serverId, name, uuid, startAt: at, endAt: null, loggedDeaths: 0, advancements: 0, chatCount: 0, baseline: baseline ?? {} }),
    );
    state.open.set(key, session);
    if (state.live && uuid) {
      await this.snapshotInventory(serverId, uuid, name, 'join');
    }
  }

  private async closeSession(serverId: string, state: IngestState, key: string, at: Date): Promise<void> {
    const session = state.open.get(key);
    if (!session) return;
    state.open.delete(key);
    session.endAt = at;
    session.deaths = session.loggedDeaths;
    const awaitFiles = state.live && session.uuid;
    if (!awaitFiles) session.baseline = null;
    const saved = await this.sessionRepo.save(session);
    if (awaitFiles) {
      setTimeout(() => void this.finalizeSession(saved.id), STATS_FLUSH_DELAY_MS).unref();
    }
  }
}

export function sessionDeltas(before: StatsSnapshot, after: StatsSnapshot): Partial<PlayerSession> {
  const start = summarizeStats(before);
  const end = summarizeStats(after);
  // A negative delta means the stats were reset or the world swapped mid-session
  const delta = (a: number, b: number) => Math.max(0, a - b);
  const oreDeltas: Record<string, number> = {};
  for (const id of ORE_IDS) {
    const mined = delta(after['minecraft:mined']?.[id] ?? 0, before['minecraft:mined']?.[id] ?? 0);
    if (mined > 0) oreDeltas[id] = mined;
  }
  return {
    deaths: delta(end.deaths, start.deaths),
    mobKills: delta(end.mobKills, start.mobKills),
    playerKills: delta(end.playerKills, start.playerKills),
    blocksMined: delta(end.blocksMined, start.blocksMined),
    distanceCm: delta(end.distanceCm, start.distanceCm),
    oreDeltas,
  };
}
