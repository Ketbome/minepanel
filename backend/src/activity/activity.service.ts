import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import { Between, FindOptionsWhere, In, IsNull, LessThan, Like, Not, Repository } from 'typeorm';
import { PlayersService, summarizeStats } from 'src/players/players.service';
import { PlayerSession, StatsSnapshot } from 'src/player-activity/entities/player-session.entity';
import { ActivityEvent } from './entities/activity-event.entity';
import { InventorySnapshot, SnapshotReason } from './entities/inventory-snapshot.entity';
import { LogCursor } from './entities/log-cursor.entity';
import { ActivityType, classifyLine, LogLine } from './log-line.parser';

export const RETENTION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_EVENTS_PAGE = 200;
const MAX_SNAPSHOTS_PER_PLAYER = 50;
// Safety net on top of the TTL: a chat-heavy server cannot grow the database past this in 30 days.
// sql.js keeps the whole database in memory, so this bounds RAM as well as disk.
export const MAX_EVENTS_PER_SERVER = 100_000;

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

export interface OnlinePlayer {
  name: string;
  uuid: string | null;
  joinedAt: Date;
}

export interface ImportedSession {
  name: string;
  uuid: string | null;
  joinedAt: Date;
  leftAt: Date;
  endReason: 'left' | 'interrupted';
}

// Who is online is only needed to recognise death lines; live sessions belong to player-activity.
export interface IngestState {
  online: Map<string, OnlinePlayer>;
  uuids: Map<string, string>;
  lastEventAt: Date | null;
  // History imports rebuild the sessions of logs older than player-activity's first session
  closed: ImportedSession[] | null;
}

export interface SessionEventCounts {
  chat: number;
  advancements: number;
  deaths: number;
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
    @InjectRepository(LogCursor)
    private readonly cursorRepo: Repository<LogCursor>,
    private readonly playersService: PlayersService,
  ) {}

  newImportState(): IngestState {
    return { online: new Map(), uuids: new Map(), lastEventAt: null, closed: [] };
  }

  async ingest(serverId: string, lines: LogLine[], toDate: (time: string) => Date, state?: IngestState): Promise<number> {
    const current = state ?? (await this.getLiveState(serverId));
    const events: ActivityEvent[] = [];

    for (const line of lines) {
      const signal = classifyLine(line, new Set(current.online.keys()));
      if (!signal) continue;
      const at = toDate(line.time);

      if (signal.kind === 'uuid') {
        current.uuids.set(signal.name.toLowerCase(), signal.uuid);
        continue;
      }
      if (signal.kind === 'stop') {
        endEveryone(current, at);
        continue;
      }

      const key = signal.name.toLowerCase();
      const uuid = current.uuids.get(key) ?? current.online.get(key)?.uuid ?? null;
      events.push(this.eventRepo.create({ serverId, type: signal.type, name: signal.name, uuid, message: signal.message, createdAt: at }));
      current.lastEventAt = at;

      if (signal.type === 'join') {
        if (current.online.has(key)) endPlayer(current, key, at, 'interrupted');
        current.online.set(key, { name: signal.name, uuid, joinedAt: at });
      } else if (signal.type === 'leave') {
        endPlayer(current, key, at, 'left');
      }
    }

    if (events.length > 0) await this.eventRepo.save(events);
    return events.length;
  }

  // A log that ends without leave lines (crash, rotation) leaves nobody we can still follow
  endLog(state: IngestState, at?: Date): void {
    endEveryone(state, at ?? state.lastEventAt ?? new Date());
  }

  resetLive(serverId: string): void {
    this.liveStates.delete(serverId);
  }

  // Imported sessions only fill the time before player-activity started recording, so the two
  // sources never describe the same stretch twice.
  async saveImportedSessions(serverId: string, sessions: ImportedSession[]): Promise<number> {
    const [first] = await this.sessionRepo.find({ select: { joinedAt: true }, where: { serverId }, order: { joinedAt: 'ASC' }, take: 1 });
    const kept = sessions.filter((session) => !first || session.joinedAt < first.joinedAt);
    if (kept.length === 0) return 0;
    await this.sessionRepo.save(
      kept.map((session) =>
        this.sessionRepo.create({
          serverId,
          playerKey: `java:${session.name.toLowerCase()}`,
          name: session.name,
          uuid: session.uuid,
          joinedAt: session.joinedAt,
          lastSeenAt: session.leftAt,
          leftAt: session.leftAt,
          endReason: session.endReason,
        }),
      ),
    );
    return kept.length;
  }

  // Runs right after player-activity opens a live session on a Java server with the log on.
  // A player without a stats file yet is new, so everything they earn counts for this session.
  async beginSession(sessionId: number): Promise<void> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) return;
    const uuid = await this.playersService.findUuid(session.serverId, session.name).catch(() => null);
    if (!uuid) return;
    const baseline = await this.playersService.readStats(session.serverId, uuid).catch(() => null);
    session.uuid = uuid;
    session.baseline = baseline ?? {};
    await this.sessionRepo.save(session);
    await this.snapshotInventory(session.serverId, uuid, session.name, 'join');
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

  // Chat, advancements and logged deaths per session; unknown (absent) where the log was not
  // being read at the time
  async sessionEventCounts(serverId: string, sessions: PlayerSession[], now = new Date()): Promise<Map<number, SessionEventCounts>> {
    const counts = new Map<number, SessionEventCounts>();
    const cursor = await this.cursorRepo.findOne({ where: { serverId } });
    const covered = cursor ? sessions.filter((session) => cursor.historyImported || session.joinedAt >= cursor.createdAt) : [];
    if (covered.length === 0) return counts;

    const from = new Date(Math.min(...covered.map((session) => session.joinedAt.getTime())));
    const to = new Date(Math.max(...covered.map((session) => (session.leftAt ?? now).getTime())));
    const names = [...new Set(covered.map((session) => session.name))];
    const events = await this.eventRepo.find({
      select: { type: true, name: true, createdAt: true },
      where: { serverId, name: In(names), type: In(['chat', 'advancement', 'death']), createdAt: Between(from, to) },
    });
    for (const session of covered) {
      const end = (session.leftAt ?? now).getTime();
      const mine = events.filter((event) => event.name === session.name && event.createdAt >= session.joinedAt && event.createdAt.getTime() <= end);
      counts.set(session.id, {
        chat: mine.filter((event) => event.type === 'chat').length,
        advancements: mine.filter((event) => event.type === 'advancement').length,
        deaths: mine.filter((event) => event.type === 'death').length,
      });
    }
    return counts;
  }

  // Picks up autosaves of online players; unchanged inventories are skipped by hash
  async snapshotOnline(serverId: string): Promise<void> {
    const online = await this.sessionRepo.find({ where: { serverId, leftAt: IsNull(), uuid: Not(IsNull()) } });
    for (const session of online) {
      await this.snapshotInventory(serverId, session.uuid, session.name, 'autosave');
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

  async prune(now = new Date(), maxEventsPerServer = MAX_EVENTS_PER_SERVER): Promise<void> {
    const cutoff = new Date(now.getTime() - RETENTION_DAYS * DAY_MS);
    await this.eventRepo.delete({ createdAt: LessThan(cutoff) });
    await this.snapshotRepo.delete({ createdAt: LessThan(cutoff) });
    await this.capEvents(maxEventsPerServer);
  }

  private async capEvents(max: number): Promise<void> {
    const crowded: Array<{ serverId: string }> = await this.eventRepo
      .createQueryBuilder('event')
      .select('event.serverId', 'serverId')
      .groupBy('event.serverId')
      .having('COUNT(*) > :max', { max })
      .getRawMany();
    for (const { serverId } of crowded) {
      const [oldestKept] = await this.eventRepo.find({ select: { id: true }, where: { serverId }, order: { id: 'DESC' }, skip: max - 1, take: 1 });
      await this.eventRepo.delete({ serverId, id: LessThan(oldestKept.id) });
    }
  }

  // After a panel restart, the players still online come from player-activity's open sessions
  private async getLiveState(serverId: string): Promise<IngestState> {
    let state = this.liveStates.get(serverId);
    if (!state) {
      const open = await this.sessionRepo.find({ where: { serverId, leftAt: IsNull() } });
      state = {
        online: new Map(open.map((session) => [session.name.toLowerCase(), { name: session.name, uuid: session.uuid, joinedAt: session.joinedAt }])),
        uuids: new Map(open.filter((session) => session.uuid).map((session) => [session.name.toLowerCase(), session.uuid])),
        lastEventAt: null,
        closed: null,
      };
      this.liveStates.set(serverId, state);
    }
    return state;
  }
}

function endPlayer(state: IngestState, key: string, at: Date, endReason: ImportedSession['endReason']): void {
  const player = state.online.get(key);
  if (!player) return;
  state.online.delete(key);
  state.closed?.push({ name: player.name, uuid: player.uuid, joinedAt: player.joinedAt, leftAt: at, endReason });
}

function endEveryone(state: IngestState, at: Date): void {
  for (const key of [...state.online.keys()]) endPlayer(state, key, at, 'interrupted');
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
