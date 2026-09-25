import { BadRequestException, ConflictException, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import * as path from 'node:path';
import { gunzipSync } from 'node:zlib';
import * as fs from 'fs-extra';
import { Repository } from 'typeorm';
import { ServerStoreService } from 'src/docker-compose/server-store.service';
import { ActivityService } from './activity.service';
import { LogCursor } from './entities/log-cursor.entity';
import { LogLine, parseLogLine } from './log-line.parser';
import { addDays, resolveLiveTime, resolveTimeAfter, zonedToUtc } from './log-time';

const TICK_MS = 5_000;
const CONFIG_REFRESH_MS = 30_000;
const PRUNE_INTERVAL_MS = 60 * 60 * 1000;
// Vanilla autosaves every 5 minutes; checking every minute catches each one without parsing NBT every tick
const SNAPSHOT_INTERVAL_MS = 60_000;
// Bounds memory when a server wrote a lot since the last tick; the rest is read next tick
const MAX_READ_BYTES = 4 * 1024 * 1024;
const MAX_HEAD_BYTES = 1024;
const ROTATED_CANDIDATES = 3;
const ARCHIVE_NAME = /^(\d{4}-\d{2}-\d{2})-\d+\.log\.gz$/;
const SERVER_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

@Injectable()
export class ActivityTailerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ActivityTailerService.name);
  private readonly serversDir: string;
  private readonly tracked = new Map<string, string>();
  private timer: NodeJS.Timeout | null = null;
  private busy = false;
  private configRefreshedAt = 0;
  private prunedAt = 0;
  private snapshotAt = 0;

  constructor(
    @InjectRepository(LogCursor)
    private readonly cursorRepo: Repository<LogCursor>,
    private readonly activityService: ActivityService,
    private readonly store: ServerStoreService,
    configService: ConfigService,
  ) {
    this.serversDir = configService.get<string>('serversDir');
  }

  onModuleInit(): void {
    this.timer = setInterval(() => void this.tick(), TICK_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async tick(now = new Date()): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    try {
      if (now.getTime() - this.configRefreshedAt >= CONFIG_REFRESH_MS) {
        await this.refreshTracked();
        this.configRefreshedAt = now.getTime();
      }
      const snapshotDue = now.getTime() - this.snapshotAt >= SNAPSHOT_INTERVAL_MS;
      for (const [serverId, tz] of this.tracked) {
        try {
          await this.tailServer(serverId, tz, now);
          if (snapshotDue) await this.activityService.snapshotOnline(serverId);
        } catch (error) {
          this.logger.warn(`Failed to read the log of ${serverId}: ${(error as Error).message}`);
        }
      }
      if (snapshotDue) this.snapshotAt = now.getTime();
      if (now.getTime() - this.prunedAt >= PRUNE_INTERVAL_MS) {
        await this.activityService.prune(now);
        this.prunedAt = now.getTime();
      }
    } catch (error) {
      this.logger.warn(`Activity tick failed: ${(error as Error).message}`);
    } finally {
      this.busy = false;
    }
  }

  // Turning tracking on starts from the end of the current log: earlier lines only carry a time
  // of day and could be days old. Turning it off closes the sessions it can no longer follow.
  async setTracking(serverId: string, enabled: boolean, tz: string): Promise<void> {
    this.assertServerId(serverId);
    if (enabled) {
      const cursor = (await this.cursorRepo.findOne({ where: { serverId } })) ?? this.cursorRepo.create({ serverId, historyImported: false });
      const head = await this.readHead(this.latestLog(serverId));
      cursor.headHash = head?.hash ?? '';
      cursor.offset = head?.size ?? 0;
      await this.cursorRepo.save(cursor);
      this.tracked.set(serverId, tz);
    } else {
      this.tracked.delete(serverId);
      await this.activityService.closeOpenSessions(serverId, new Date());
      this.activityService.forgetLiveState(serverId);
    }
  }

  async getCursor(serverId: string): Promise<LogCursor | null> {
    return this.cursorRepo.findOne({ where: { serverId } });
  }

  // Reads the archived logs that predate tracking; later archives were already read live.
  async importHistory(serverId: string, tz: string): Promise<{ imported: number; files: number }> {
    this.assertServerId(serverId);
    const cursor = await this.cursorRepo.findOne({ where: { serverId } });
    if (!cursor) {
      throw new BadRequestException('Activity tracking is not enabled for this server');
    }
    if (cursor.historyImported) {
      throw new ConflictException('History was already imported');
    }

    const logsDir = this.logsDir(serverId);
    const names = (await fs.readdir(logsDir).catch(() => [] as string[])).filter((name) => ARCHIVE_NAME.test(name)).sort(compareArchives);
    let imported = 0;
    let files = 0;

    for (const name of names) {
      const file = path.join(logsDir, name);
      if ((await fs.stat(file)).mtime >= cursor.createdAt) continue;
      const state = this.activityService.newImportState();
      let day = ARCHIVE_NAME.exec(name)[1];
      let previous = 0;
      // Archives are named after the day they start; a clock that goes backwards crossed midnight
      const toDate = (time: string) => {
        let date = zonedToUtc(day, time, tz);
        if (date.getTime() < previous - 60_000) {
          day = addDays(day, 1);
          date = zonedToUtc(day, time, tz);
        }
        previous = date.getTime();
        return date;
      };
      const lines = toLogLines(gunzipSync(await fs.readFile(file)).toString('utf8'));
      imported += await this.activityService.ingest(serverId, lines, toDate, state);
      await this.activityService.closeOpenSessions(serverId, undefined, state);
      files += 1;
    }

    cursor.historyImported = true;
    await this.cursorRepo.save(cursor);
    return { imported, files };
  }

  private async refreshTracked(): Promise<void> {
    this.tracked.clear();
    for (const serverId of await this.store.listServerDirs()) {
      const config = await this.store.readConfig(serverId).catch(() => null);
      if (config?.activityTracking && config.edition !== 'BEDROCK') {
        this.tracked.set(serverId, config.tz || 'UTC');
      }
    }
  }

  private async tailServer(serverId: string, tz: string, now: Date): Promise<void> {
    const file = this.latestLog(serverId);
    const head = await this.readHead(file);
    if (!head) return;

    const cursor = await this.cursorRepo.findOne({ where: { serverId } });
    if (!cursor) {
      await this.cursorRepo.save(this.cursorRepo.create({ serverId, headHash: head.hash, offset: head.size, historyImported: false }));
      return;
    }

    const offsetBefore = cursor.offset;
    if (cursor.headHash !== head.hash || head.size < cursor.offset) {
      await this.drainRotated(serverId, cursor, tz);
      await this.activityService.closeOpenSessions(serverId);
      cursor.headHash = head.hash;
      cursor.offset = 0;
    }

    if (head.size > cursor.offset) {
      const { text, bytes } = await readCompleteLines(file, cursor.offset, Math.min(head.size, cursor.offset + MAX_READ_BYTES));
      await this.activityService.ingest(serverId, toLogLines(text), (time) => resolveLiveTime(time, now, tz));
      cursor.offset += bytes;
    }

    // sql.js rewrites the whole database on every save, so an idle log must not save anything
    if (cursor.offset !== offsetBefore || cursor.headHash !== head.hash) {
      await this.cursorRepo.save(cursor);
    }
  }

  // The lines written between our last read and the rotation live in the newest archive;
  // they include the leave lines of the shutdown.
  private async drainRotated(serverId: string, cursor: LogCursor, tz: string): Promise<void> {
    const logsDir = this.logsDir(serverId);
    const names = (await fs.readdir(logsDir).catch(() => [] as string[])).filter((name) => ARCHIVE_NAME.test(name));
    const newest = (await Promise.all(names.map(async (name) => ({ name, mtime: (await fs.stat(path.join(logsDir, name))).mtimeMs }))))
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, ROTATED_CANDIDATES);

    for (const { name } of newest) {
      const content = gunzipSync(await fs.readFile(path.join(logsDir, name)));
      if (hashHead(content) !== cursor.headHash) continue;
      let after = cursor.updatedAt ?? new Date();
      const toDate = (time: string) => {
        after = resolveTimeAfter(time, after, tz);
        return after;
      };
      await this.activityService.ingest(serverId, toLogLines(content.subarray(cursor.offset).toString('utf8')), toDate);
      return;
    }
  }

  private async readHead(file: string): Promise<{ hash: string; size: number } | null> {
    let handle: fs.promises.FileHandle | null = null;
    try {
      handle = await fs.promises.open(file, 'r');
      const { size } = await handle.stat();
      const buffer = Buffer.alloc(Math.min(size, MAX_HEAD_BYTES));
      await handle.read(buffer, 0, buffer.length, 0);
      const hash = hashHead(buffer);
      return hash ? { hash, size } : null;
    } catch {
      return null;
    } finally {
      await handle?.close();
    }
  }

  private assertServerId(serverId: string): void {
    if (!SERVER_ID_PATTERN.test(serverId)) {
      throw new BadRequestException('Invalid server ID');
    }
  }

  private logsDir(serverId: string): string {
    return path.join(this.serversDir, serverId, 'mc-data', 'logs');
  }

  private latestLog(serverId: string): string {
    return path.join(this.logsDir(serverId), 'latest.log');
  }
}

// The first line carries the server start time, so it identifies one log file. It is only
// hashed once complete: a partial first line would change as the file grows.
function hashHead(buffer: Buffer): string | null {
  const end = buffer.indexOf(0x0a);
  if (end < 0 || end >= MAX_HEAD_BYTES) return null;
  return createHash('sha1').update(buffer.subarray(0, end)).digest('hex');
}

async function readCompleteLines(file: string, start: number, end: number): Promise<{ text: string; bytes: number }> {
  const handle = await fs.promises.open(file, 'r');
  try {
    const buffer = Buffer.alloc(end - start);
    await handle.read(buffer, 0, buffer.length, start);
    const bytes = buffer.lastIndexOf(0x0a) + 1;
    return { text: buffer.subarray(0, bytes).toString('utf8'), bytes };
  } finally {
    await handle.close();
  }
}

function toLogLines(text: string): LogLine[] {
  return text
    .split('\n')
    .map((line) => parseLogLine(line.replace(/\r$/, '')))
    .filter((line): line is LogLine => line !== null);
}

// "2026-09-01-2.log.gz" after "2026-09-01-1.log.gz", numerically
function compareArchives(a: string, b: string): number {
  const [dayA, indexA] = [a.slice(0, 10), Number.parseInt(a.slice(11), 10)];
  const [dayB, indexB] = [b.slice(0, 10), Number.parseInt(b.slice(11), 10)];
  return dayA === dayB ? indexA - indexB : dayA.localeCompare(dayB);
}
