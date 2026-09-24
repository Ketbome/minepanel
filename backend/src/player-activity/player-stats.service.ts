import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServerStoreService } from 'src/docker-compose/server-store.service';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export interface SavedPlayerStats {
  uuid: string;
  world: string;
  savedAt: string;
  playSeconds: number | null;
  deaths: number | null;
  mobKills: number | null;
  playerKills: number | null;
  blocksMined: number | null;
}

const numberValue = (value: unknown): number | null => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;

@Injectable()
export class PlayerStatsService {
  constructor(private readonly config: ConfigService, private readonly store: ServerStoreService) {}

  private async readFile(base: string, relative: string) {
    const root = await fs.realpath(base);
    const target = await fs.realpath(path.resolve(base, relative));
    if (!target.startsWith(root + path.sep)) throw new Error('Outside server directory');
    const stat = await fs.stat(target);
    if (!stat.isFile() || stat.size > 2 * 1024 * 1024) throw new Error('Unsupported statistics file');
    return { text: await fs.readFile(target, 'utf8'), savedAt: stat.mtime.toISOString() };
  }

  async getStats(serverId: string, name: string): Promise<SavedPlayerStats | null> {
    if (!/^[a-zA-Z0-9_-]+$/.test(serverId)) return null;
    try {
      const config = await this.store.readConfig(serverId);
      if (!config || config.edition === 'BEDROCK') return null;
      const serversRoot = await fs.realpath(this.config.getOrThrow<string>('serversDir'));
      const base = path.join(serversRoot, serverId, 'mc-data');
      if (!(await fs.realpath(base)).startsWith(path.join(serversRoot, serverId) + path.sep)) return null;
      const cache = JSON.parse((await this.readFile(base, 'usercache.json')).text);
      if (!Array.isArray(cache)) return null;
      const player = cache.find((entry) => typeof entry?.name === 'string' && entry.name.toLowerCase() === name.toLowerCase());
      if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(player?.uuid ?? '')) return null;
      // server.properties reflects the world's actual directory, including custom LEVEL overrides.
      const properties = (await this.readFile(base, 'server.properties')).text;
      const world = /^level-name=(.+)$/m.exec(properties)?.[1].trim() || config.worldLevelName || 'world';
      const file = await this.readFile(base, path.join(world, 'stats', `${player.uuid}.json`));
      const stats = JSON.parse(file.text)?.stats;
      if (!stats || typeof stats !== 'object') return null;
      const custom = stats['minecraft:custom'] ?? {};
      const playTicks = numberValue(custom['minecraft:play_time'] ?? custom['minecraft:play_one_minute']);
      const mined = stats['minecraft:mined'];
      const minedValues = mined && typeof mined === 'object' && !Array.isArray(mined) ? Object.values(mined).map(numberValue) : null;
      return {
        uuid: player.uuid, world, savedAt: file.savedAt,
        playSeconds: playTicks === null ? null : Math.floor(playTicks / 20),
        deaths: numberValue(custom['minecraft:deaths']),
        mobKills: numberValue(custom['minecraft:mob_kills']),
        playerKills: numberValue(custom['minecraft:player_kills']),
        blocksMined: minedValues && minedValues.every((value) => value !== null) ? minedValues.reduce((sum, value) => sum + value, 0) : null,
      };
    } catch {
      return null;
    }
  }
}
