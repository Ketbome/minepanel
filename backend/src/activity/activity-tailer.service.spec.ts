import { BadRequestException, ConflictException } from '@nestjs/common';
import * as fs from 'fs-extra';
import os from 'node:os';
import * as path from 'node:path';
import { gzipSync } from 'node:zlib';
import { ActivityTailerService } from './activity-tailer.service';
import { LogCursor } from './entities/log-cursor.entity';

const HEADER = '[08:00:00] [main/INFO]: Starting minecraft server version 1.21.1\n';

describe('ActivityTailerService', () => {
  let serversDir: string;
  let logsDir: string;
  let cursors: Map<string, LogCursor>;
  let cursorRepo: { findOne: jest.Mock; save: jest.Mock; create: jest.Mock };
  let activity: { ingest: jest.Mock; closeOpenSessions: jest.Mock; newImportState: jest.Mock; forgetLiveState: jest.Mock; prune: jest.Mock };
  let store: { listServerDirs: jest.Mock; readConfig: jest.Mock };
  let service: ActivityTailerService;

  const latest = () => path.join(logsDir, 'latest.log');
  const ingestedMessages = (call = 0) => activity.ingest.mock.calls[call][1].map((line) => line.message);

  beforeEach(async () => {
    serversDir = await fs.mkdtemp(path.join(os.tmpdir(), 'minepanel-activity-'));
    logsDir = path.join(serversDir, 'srv', 'mc-data', 'logs');
    await fs.ensureDir(logsDir);
    cursors = new Map();
    cursorRepo = {
      findOne: jest.fn(async ({ where }) => cursors.get(where.serverId) ?? null),
      save: jest.fn(async (cursor) => {
        cursors.set(cursor.serverId, { createdAt: new Date(), updatedAt: new Date('2026-09-25T09:59:00Z'), ...cursor });
        return cursor;
      }),
      create: jest.fn((cursor) => ({ ...cursor })),
    };
    activity = {
      ingest: jest.fn().mockResolvedValue(1),
      closeOpenSessions: jest.fn().mockResolvedValue(undefined),
      newImportState: jest.fn(() => ({ import: true })),
      forgetLiveState: jest.fn(),
      prune: jest.fn().mockResolvedValue(undefined),
    };
    store = {
      listServerDirs: jest.fn().mockResolvedValue(['srv', 'bedrock', 'off', 'broken']),
      readConfig: jest.fn(async (id) => {
        if (id === 'srv') return { activityTracking: true, tz: 'UTC' };
        if (id === 'bedrock') return { activityTracking: true, edition: 'BEDROCK' };
        if (id === 'broken') throw new Error('bad json');
        return { activityTracking: false };
      }),
    };
    service = new ActivityTailerService(cursorRepo as any, activity as any, store as any, { get: () => serversDir } as any);
  });

  afterEach(async () => {
    service.onModuleDestroy();
    await fs.remove(serversDir);
  });

  describe('tick', () => {
    it('starts at the end of the current log and then reads only new complete lines', async () => {
      await fs.writeFile(latest(), `${HEADER}[09:00:00] [Server thread/INFO]: Old joined the game\n`);
      await service.tick(new Date('2026-09-25T10:00:00Z'));

      expect(activity.ingest).not.toHaveBeenCalled();
      expect(cursors.get('srv')?.offset).toBe((await fs.stat(latest())).size);

      await fs.appendFile(latest(), '[09:59:00] [Server thread/INFO]: Steve joined the game\n[09:59:30] [Server thread/INFO]: <Steve> partial');
      await service.tick(new Date('2026-09-25T10:00:00Z'));

      expect(ingestedMessages()).toEqual(['Steve joined the game']);
      expect(activity.ingest.mock.calls[0][2]('09:59:00').toISOString()).toBe('2026-09-25T09:59:00.000Z');

      await fs.appendFile(latest(), ' line\n');
      await service.tick(new Date('2026-09-25T10:00:05Z'));
      expect(ingestedMessages(1)).toEqual(['<Steve> partial line']);
    });

    it('does not save the cursor when nothing changed', async () => {
      await fs.writeFile(latest(), HEADER);
      await service.tick(new Date('2026-09-25T10:00:00Z'));
      cursorRepo.save.mockClear();

      await service.tick(new Date('2026-09-25T10:00:05Z'));

      expect(cursorRepo.save).not.toHaveBeenCalled();
    });

    it('drains the rotated log before reading the new one', async () => {
      await fs.writeFile(latest(), `${HEADER}[09:00:00] [Server thread/INFO]: Steve joined the game\n`);
      await service.tick(new Date('2026-09-25T10:00:00Z'));
      const oldContent = `${HEADER}[09:00:00] [Server thread/INFO]: Steve joined the game\n[10:00:01] [Server thread/INFO]: Stopping server\n[10:00:02] [Server thread/INFO]: Steve left the game\n`;
      await fs.writeFile(path.join(logsDir, '2026-09-25-1.log.gz'), gzipSync(oldContent));
      await fs.writeFile(path.join(logsDir, '2026-09-24-1.log.gz'), gzipSync('[00:00:00] [main/INFO]: other\n'));
      await fs.writeFile(latest(), '[10:05:00] [main/INFO]: Starting minecraft server version 1.21.1\n[10:06:00] [Server thread/INFO]: Alex joined the game\n');

      await service.tick(new Date('2026-09-25T10:07:00Z'));

      expect(ingestedMessages(0)).toEqual(['Stopping server', 'Steve left the game']);
      expect(activity.ingest.mock.calls[0][2]('10:00:02').toISOString()).toBe('2026-09-25T10:00:02.000Z');
      expect(activity.closeOpenSessions).toHaveBeenCalledWith('srv');
      expect(ingestedMessages(1)).toEqual(['Starting minecraft server version 1.21.1', 'Alex joined the game']);
    });

    it('treats a shorter file as rotated even without a matching archive', async () => {
      await fs.writeFile(latest(), `${HEADER}[09:00:00] [Server thread/INFO]: a long line to make the file bigger\n`);
      await service.tick(new Date('2026-09-25T10:00:00Z'));
      await fs.writeFile(latest(), HEADER);

      await service.tick(new Date('2026-09-25T10:00:05Z'));

      expect(activity.closeOpenSessions).toHaveBeenCalled();
      expect(cursors.get('srv')?.offset).toBe(HEADER.length);
    });

    it('skips logs without a complete first line and prunes once an hour', async () => {
      await fs.writeFile(latest(), '[08:00:00] [main/INFO]: Starting');
      await service.tick(new Date('2026-09-25T10:00:00Z'));
      await service.tick(new Date('2026-09-25T10:10:00Z'));

      expect(cursors.size).toBe(0);
      expect(activity.prune).toHaveBeenCalledTimes(1);
    });

    it('keeps going when one server fails and ignores overlapping ticks', async () => {
      await fs.writeFile(latest(), HEADER);
      cursorRepo.findOne.mockRejectedValueOnce(new Error('db locked'));

      await Promise.all([service.tick(new Date('2026-09-25T10:00:00Z')), service.tick(new Date('2026-09-25T10:00:00Z'))]);

      expect(cursorRepo.findOne).toHaveBeenCalledTimes(1);
    });

    it('survives a failing server list', async () => {
      store.listServerDirs.mockRejectedValueOnce(new Error('EACCES'));
      await expect(service.tick(new Date())).resolves.toBeUndefined();
    });

    it('runs on a timer', () => {
      jest.useFakeTimers();
      const tick = jest.spyOn(service, 'tick').mockResolvedValue(undefined);
      service.onModuleInit();
      jest.advanceTimersByTime(5_000);
      expect(tick).toHaveBeenCalled();
      service.onModuleDestroy();
      jest.useRealTimers();
    });
  });

  describe('setTracking', () => {
    it('points the cursor at the end of the log when enabled', async () => {
      await fs.writeFile(latest(), `${HEADER}[09:00:00] [Server thread/INFO]: x\n`);
      await service.setTracking('srv', true, 'UTC');
      expect(cursors.get('srv')?.offset).toBe((await fs.stat(latest())).size);
    });

    it('creates an empty cursor when the server never wrote a log', async () => {
      await service.setTracking('fresh', true, 'UTC');
      expect(cursors.get('fresh')).toMatchObject({ headHash: '', offset: 0 });
    });

    it('closes sessions when disabled', async () => {
      await service.setTracking('srv', false, 'UTC');
      expect(activity.closeOpenSessions).toHaveBeenCalledWith('srv', expect.any(Date));
      expect(activity.forgetLiveState).toHaveBeenCalledWith('srv');
    });

    it('rejects invalid server ids', async () => {
      await expect(service.setTracking('../x', true, 'UTC')).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('importHistory', () => {
    it('imports archives older than tracking, crossing midnight', async () => {
      await fs.writeFile(latest(), HEADER);
      await service.setTracking('srv', true, 'UTC');
      cursors.get('srv').createdAt = new Date(Date.now() + 60_000);
      await fs.writeFile(path.join(logsDir, '2026-09-20-2.log.gz'), gzipSync('[23:59:00] [Server thread/INFO]: Steve joined the game\n[00:01:00] [Server thread/INFO]: Steve left the game\n'));
      await fs.writeFile(path.join(logsDir, '2026-09-20-10.log.gz'), gzipSync('[10:00:00] [Server thread/INFO]: Alex joined the game\n'));
      await fs.writeFile(path.join(logsDir, '2026-09-19-1.log.gz'), gzipSync('[10:00:00] [Server thread/INFO]: Old joined the game\n'));

      const result = await service.importHistory('srv', 'UTC');

      expect(result).toEqual({ imported: 3, files: 3 });
      expect(ingestedMessages(0)).toEqual(['Old joined the game']);
      expect(ingestedMessages(1)).toEqual(['Steve joined the game', 'Steve left the game']);
      const toDate = activity.ingest.mock.calls[1][2];
      expect(toDate('23:59:00').toISOString()).toBe('2026-09-20T23:59:00.000Z');
      expect(toDate('00:01:00').toISOString()).toBe('2026-09-21T00:01:00.000Z');
      expect(ingestedMessages(2)).toEqual(['Alex joined the game']);
      expect(activity.closeOpenSessions).toHaveBeenCalledWith('srv', undefined, { import: true });
      await expect(service.importHistory('srv', 'UTC')).rejects.toBeInstanceOf(ConflictException);
    });

    it('skips archives written after tracking started', async () => {
      await service.setTracking('srv', true, 'UTC');
      cursors.get('srv').createdAt = new Date(Date.now() - 60_000);
      await fs.writeFile(path.join(logsDir, '2026-09-25-1.log.gz'), gzipSync('[10:00:00] [Server thread/INFO]: Steve joined the game\n'));

      expect(await service.importHistory('srv', 'UTC')).toEqual({ imported: 0, files: 0 });
    });

    it('requires tracking to be on', async () => {
      await expect(service.importHistory('srv', 'UTC')).rejects.toBeInstanceOf(BadRequestException);
      expect(await service.getCursor('srv')).toBeNull();
    });
  });
});
