import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs-extra';
import * as path from 'node:path';
import { PlayerItem, PlayerLocation, readPlayerNbt } from './player-nbt';

const SERVER_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_FILE_PATTERN = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(dat|json)$/i;

export interface PlayerStatsSummary {
  playTimeTicks: number;
  deaths: number;
  mobKills: number;
  playerKills: number;
  distanceCm: number;
  blocksMined: number;
}

export interface PlayerSummary {
  uuid: string;
  name: string | null;
  whitelisted: boolean;
  op: boolean;
  opLevel: number | null;
  banned: boolean;
  lastSeen: string | null;
  stats: PlayerStatsSummary;
  advancements: number;
}

export interface PlayerAdvancement {
  id: string;
  done: boolean;
  doneAt: string | null;
}

export interface PlayerProfile extends PlayerSummary {
  statsByCategory: Record<string, Record<string, number>>;
  advancementList: PlayerAdvancement[];
  inventory: PlayerItem[];
  armor: PlayerItem[];
  offhand: PlayerItem | null;
  enderChest: PlayerItem[];
  position: PlayerLocation | null;
  spawn: PlayerLocation | null;
}

interface NamedEntry {
  uuid?: string;
  name?: string;
  level?: number;
}

interface ServerPlayerFiles {
  worldDir: string;
  names: Map<string, string>;
  whitelist: Set<string>;
  ops: Map<string, number>;
  banned: Set<string>;
  uuids: Set<string>;
}

type StatsFile = { stats?: Record<string, Record<string, number>> };
type AdvancementsFile = Record<string, { done?: boolean; criteria?: Record<string, string> } | number>;

@Injectable()
export class PlayersService {
  private readonly logger = new Logger(PlayersService.name);
  private readonly serversDir: string;

  constructor(configService: ConfigService) {
    this.serversDir = configService.get<string>('serversDir');
  }

  async list(serverId: string): Promise<PlayerSummary[]> {
    const files = await this.readServerFiles(serverId);
    const players = await Promise.all([...files.uuids].map((uuid) => this.buildSummary(files, uuid)));
    return players.sort((a, b) => (b.lastSeen ?? '').localeCompare(a.lastSeen ?? ''));
  }

  async profile(serverId: string, uuid: string): Promise<PlayerProfile> {
    if (!UUID_PATTERN.test(uuid)) {
      throw new BadRequestException('Invalid player UUID');
    }
    const files = await this.readServerFiles(serverId);
    const key = uuid.toLowerCase();
    if (!files.uuids.has(key)) {
      throw new NotFoundException(`Player ${uuid} not found`);
    }

    const summary = await this.buildSummary(files, key);
    const stats = await this.readJson<StatsFile>(this.playerFile(files, 'stats', key, 'json'));
    const advancements = await this.readJson<AdvancementsFile>(this.playerFile(files, 'advancements', key, 'json'));
    const nbt = await this.readNbt(this.playerFile(files, 'playerdata', key, 'dat'));

    return {
      ...summary,
      statsByCategory: stats?.stats ?? {},
      advancementList: toAdvancementList(advancements),
      inventory: nbt?.inventory ?? [],
      armor: nbt?.armor ?? [],
      offhand: nbt?.offhand ?? null,
      enderChest: nbt?.enderChest ?? [],
      position: nbt?.position ?? null,
      spawn: nbt?.spawn ?? null,
    };
  }

  private async buildSummary(files: ServerPlayerFiles, uuid: string): Promise<PlayerSummary> {
    const [stats, advancements, lastSeen] = await Promise.all([
      this.readJson<StatsFile>(this.playerFile(files, 'stats', uuid, 'json')),
      this.readJson<AdvancementsFile>(this.playerFile(files, 'advancements', uuid, 'json')),
      this.readMtime(this.playerFile(files, 'playerdata', uuid, 'dat')),
    ]);

    return {
      uuid,
      name: files.names.get(uuid) ?? null,
      whitelisted: files.whitelist.has(uuid),
      op: files.ops.has(uuid),
      opLevel: files.ops.get(uuid) ?? null,
      banned: files.banned.has(uuid),
      lastSeen,
      stats: summarizeStats(stats?.stats ?? {}),
      advancements: toAdvancementList(advancements).filter((advancement) => advancement.done).length,
    };
  }

  private async readServerFiles(serverId: string): Promise<ServerPlayerFiles> {
    if (!SERVER_ID_PATTERN.test(serverId)) {
      throw new BadRequestException('Invalid server ID');
    }
    const mcDataDir = path.join(this.serversDir, serverId, 'mc-data');
    const worldDir = await this.resolveWorldDir(mcDataDir);

    const [usercache, whitelist, ops, banned] = await Promise.all(
      ['usercache.json', 'whitelist.json', 'ops.json', 'banned-players.json'].map(async (file) => (await this.readJson<NamedEntry[]>(path.join(mcDataDir, file))) ?? []),
    );

    const names = new Map<string, string>();
    for (const entry of [...usercache, ...whitelist, ...ops, ...banned]) {
      if (entry?.uuid && entry.name) names.set(entry.uuid.toLowerCase(), entry.name);
    }

    const toUuids = (entries: NamedEntry[]) => entries.filter((entry) => entry?.uuid).map((entry) => entry.uuid.toLowerCase());
    const files: ServerPlayerFiles = {
      worldDir,
      names,
      whitelist: new Set(toUuids(whitelist)),
      ops: new Map(ops.filter((entry) => entry?.uuid).map((entry) => [entry.uuid.toLowerCase(), entry.level ?? 4])),
      banned: new Set(toUuids(banned)),
      uuids: new Set<string>(),
    };

    // usercache only names players; it also holds names looked up by commands, so it does not add members.
    for (const uuid of [...files.whitelist, ...files.ops.keys(), ...files.banned]) files.uuids.add(uuid);
    for (const dir of ['playerdata', 'stats', 'advancements']) {
      for (const uuid of await this.listUuidFiles(path.join(worldDir, dir))) files.uuids.add(uuid);
    }
    return files;
  }

  // `level-name` can point anywhere; a value escaping mc-data falls back to the default world.
  private async resolveWorldDir(mcDataDir: string): Promise<string> {
    let levelName = 'world';
    try {
      const properties = await fs.readFile(path.join(mcDataDir, 'server.properties'), 'utf8');
      const line = properties.split('\n').find((entry) => entry.trim().startsWith('level-name='));
      levelName = line?.trim().slice('level-name='.length).trim() || 'world';
    } catch {
      // No server.properties yet: the server never started, so the default applies.
    }
    const worldDir = path.resolve(mcDataDir, levelName);
    return worldDir.startsWith(path.resolve(mcDataDir) + path.sep) ? worldDir : path.join(mcDataDir, 'world');
  }

  private async listUuidFiles(dir: string): Promise<string[]> {
    try {
      const entries = await fs.readdir(dir);
      return entries.map((entry) => UUID_FILE_PATTERN.exec(entry)?.[1]?.toLowerCase()).filter((uuid): uuid is string => Boolean(uuid));
    } catch {
      return [];
    }
  }

  private playerFile(files: ServerPlayerFiles, dir: string, uuid: string, extension: string): string {
    return path.join(files.worldDir, dir, `${uuid}.${extension}`);
  }

  private async readJson<T>(file: string): Promise<T | null> {
    try {
      return JSON.parse(await fs.readFile(file, 'utf8')) as T;
    } catch {
      return null;
    }
  }

  private async readMtime(file: string): Promise<string | null> {
    try {
      return (await fs.stat(file)).mtime.toISOString();
    } catch {
      return null;
    }
  }

  private async readNbt(file: string) {
    try {
      return await readPlayerNbt(await fs.readFile(file));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.logger.warn(`Failed to read player data ${file}: ${(error as Error).message}`);
      }
      return null;
    }
  }
}

export function summarizeStats(stats: Record<string, Record<string, number>>): PlayerStatsSummary {
  const custom = stats['minecraft:custom'] ?? {};
  const sum = (values: Record<string, number>, filter: (key: string) => boolean = () => true) =>
    Object.entries(values).reduce((total, [key, value]) => (filter(key) ? total + (Number(value) || 0) : total), 0);

  return {
    // Renamed from play_one_minute (still counted in ticks) in 1.17
    playTimeTicks: custom['minecraft:play_time'] ?? custom['minecraft:play_one_minute'] ?? 0,
    deaths: custom['minecraft:deaths'] ?? 0,
    mobKills: custom['minecraft:mob_kills'] ?? 0,
    playerKills: custom['minecraft:player_kills'] ?? 0,
    distanceCm: sum(custom, (key) => key.endsWith('_one_cm')),
    blocksMined: sum(stats['minecraft:mined'] ?? {}),
  };
}

function toAdvancementList(file: AdvancementsFile | null): PlayerAdvancement[] {
  if (!file) {
    return [];
  }
  return Object.entries(file)
    .filter(([id, value]) => typeof value === 'object' && !id.includes(':recipes/'))
    .map(([id, value]) => {
      const entry = value as { done?: boolean; criteria?: Record<string, string> };
      const dates = Object.values(entry.criteria ?? {}).sort();
      return { id, done: entry.done === true, doneAt: entry.done && dates.length ? toIso(dates[dates.length - 1]) : null };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

// Criteria dates look like "2024-03-14 18:02:11 +0000"
function toIso(value: string): string | null {
  const date = new Date(value.replace(/^(\S+) (\S+) ([+-]\d{2})(\d{2})$/, '$1T$2$3:$4'));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
