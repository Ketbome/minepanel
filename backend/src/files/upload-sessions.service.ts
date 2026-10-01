import { BadRequestException, ConflictException, HttpException, HttpStatus, Injectable, Logger, NotFoundException, OnModuleDestroy, PayloadTooLargeException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import fsp from 'node:fs/promises';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import * as fs from 'fs-extra';
import * as path from 'path';
import { FilesService, UPLOAD_SESSIONS_DIR } from './files.service';

// The client sends 8 MB; the cap leaves room without letting one request run past
// proxy body limits or Node's 5-minute request timeout on a slow link.
export const MAX_CHUNK_BYTES = 16 * 1024 * 1024;

// ponytail: an idle session is only swept after a day, so abandoned uploads hold disk until then.
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const SWEEP_INTERVAL_MS = 60 * 60 * 1000;

// A full disk takes the worlds down with it, so what one user can hold is capped. The UI
// sends one large file at a time; the rest of the headroom is for a second tab or two.
export const MAX_SESSIONS_PER_USER = 5;
// A session untouched this long is treated as abandoned (a closed tab sends no abort) and
// is replaced instead of blocking its owner at the limit.
const STALE_MS = 15 * 60 * 1000;

const SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export interface UploadSession {
  id: string;
  userId: number;
  serverId: string;
  path: string;
  size: number;
  overwrite: boolean;
  updatedAt: number;
  // Set by uploads that land outside the file manager (modpacks); absent for the file manager.
  kind?: string;
}

type SessionFields = Pick<UploadSession, 'userId' | 'serverId' | 'path' | 'size' | 'overwrite' | 'kind'>;

// Large files arrive as a series of appends to one staged file, so no single request
// has to carry the whole upload. Session files live on disk next to the servers: a
// backend restart does not lose an upload in progress, and completing one is a rename.
@Injectable()
export class UploadSessionsService implements OnModuleDestroy {
  private readonly logger = new Logger(UploadSessionsService.name);
  private readonly dir: string;
  private readonly busy = new Set<string>();
  // An abort must not land while complete is moving the file: with overwrite the move
  // removes the target first, and losing the part file then would lose both.
  private readonly completing = new Set<string>();
  private readonly sweepTimer: NodeJS.Timeout;
  // Creates run one at a time: the limit and the free-space check read every session, so
  // two at once would both pass on the same numbers.
  private createQueue: Promise<unknown> = Promise.resolve();

  constructor(
    configService: ConfigService,
    private readonly filesService: FilesService,
  ) {
    this.dir = path.join(configService.get('serversDir'), UPLOAD_SESSIONS_DIR);
    fs.ensureDirSync(this.dir);
    void this.sweep();
    this.sweepTimer = setInterval(() => void this.sweep(), SWEEP_INTERVAL_MS);
    this.sweepTimer.unref();
  }

  onModuleDestroy(): void {
    clearInterval(this.sweepTimer);
  }

  create(userId: number, serverId: string, filePath: string, size: number, admin: boolean, overwrite = true): Promise<{ id: string; offset: number }> {
    return this.open({ userId, serverId, path: filePath, size, overwrite }, () => this.filesService.assertUploadTarget(serverId, filePath, admin, overwrite));
  }

  // Uploads that land outside the file manager share the chunk handling; the caller checks
  // the target before the first byte and moves the finished file itself (completeFor).
  createFor(kind: string, userId: number, serverId: string, filePath: string, size: number, assertTarget: () => Promise<void>): Promise<{ id: string; offset: number }> {
    return this.open({ userId, serverId, path: filePath, size, overwrite: true, kind }, assertTarget);
  }

  private open(fields: SessionFields, assertTarget: () => Promise<void>): Promise<{ id: string; offset: number }> {
    const run = this.createQueue.then(() => this.createSession(fields, assertTarget));
    this.createQueue = run.catch(() => undefined);
    return run;
  }

  private async createSession(fields: SessionFields, assertTarget: () => Promise<void>): Promise<{ id: string; offset: number }> {
    const { userId, size } = fields;
    // Fail before the first byte, not after gigabytes: the target must be writable...
    await assertTarget();

    const now = Date.now();
    let live = await this.readSessions();
    if (live.filter(({ session }) => session.userId === userId).length >= MAX_SESSIONS_PER_USER) {
      const stale = live.filter(({ session }) => session.userId === userId && now - session.updatedAt > STALE_MS && !this.busy.has(session.id));
      await Promise.all(stale.map(({ session }) => this.discard(session.id)));
      live = live.filter((entry) => !stale.includes(entry));

      if (live.filter(({ session }) => session.userId === userId).length >= MAX_SESSIONS_PER_USER) {
        throw new HttpException(`Too many uploads in progress (${MAX_SESSIONS_PER_USER}): finish or cancel one first`, HttpStatus.TOO_MANY_REQUESTS);
      }
    }

    // ...and the disk must hold the file on top of what the other sessions still have to
    // write: what they already wrote is gone from the free space, the rest is promised.
    // Only while they are moving, so a session left idle cannot hold the disk for a day.
    const { bavail, bsize } = await fsp.statfs(this.dir);
    const reserved = live
      .filter(({ session }) => now - session.updatedAt <= STALE_MS)
      .reduce((total, { session, offset }) => total + Math.max(0, session.size - offset), 0);
    if (bavail * bsize - reserved < size) {
      throw new HttpException('Not enough free disk space for this upload', HttpStatus.INSUFFICIENT_STORAGE);
    }

    const session: UploadSession = { ...fields, id: randomUUID(), updatedAt: Date.now() };
    // Metadata first: the sweeper discards a part file that has none.
    await fs.writeJson(this.metaPath(session.id), session);
    await fs.writeFile(this.partPath(session.id), '');
    return { id: session.id, offset: 0 };
  }

  async getOffset(userId: number, serverId: string, id: string): Promise<{ offset: number }> {
    await this.load(userId, serverId, id);
    return { offset: await this.currentOffset(id) };
  }

  // The offset makes a retried chunk harmless: anything but the current end of the file
  // is refused with that end, so the client resumes exactly where the server stands.
  async append(userId: number, serverId: string, id: string, offset: number, body: Readable, declaredLength?: number): Promise<{ offset: number }> {
    const session = await this.load(userId, serverId, id);

    if (this.busy.has(id)) {
      throw new ConflictException('A chunk for this upload is already being written');
    }
    this.busy.add(id);

    try {
      const current = await this.currentOffset(id);
      if (offset !== current) {
        throw new ConflictException({ message: 'Offset does not match the upload', offset: current });
      }

      const limit = Math.min(MAX_CHUNK_BYTES, session.size - current);
      // Refused before reading: failing mid-body tears the socket down, and the client
      // sees a network error instead of the 413.
      if (declaredLength !== undefined && declaredLength > limit) {
        throw new PayloadTooLargeException('Chunk exceeds the upload size or the chunk limit');
      }

      let received = 0;
      const guard = new Transform({
        transform(chunk: Buffer, _encoding, callback) {
          received += chunk.length;
          callback(received > limit ? new PayloadTooLargeException('Chunk exceeds the upload size or the chunk limit') : null, chunk);
        },
      });

      try {
        await pipeline(body, guard, fs.createWriteStream(this.partPath(id), { flags: 'a' }));
      } catch (error) {
        // A client that drops mid-chunk leaves valid bytes behind and resumes from them;
        // an oversized chunk is cut back, since what it wrote belongs to no offset.
        if (error instanceof PayloadTooLargeException) {
          await fs.truncate(this.partPath(id), current);
        }
        throw error;
      }

      // An abort that landed while this chunk was in flight already removed the session:
      // writing it again would bring back a record with no file behind it.
      if (await fs.pathExists(this.metaPath(id))) {
        await fs.writeJson(this.metaPath(id), { ...session, updatedAt: Date.now() });
      }
      return { offset: await this.currentOffset(id) };
    } finally {
      this.busy.delete(id);
    }
  }

  complete(userId: number, serverId: string, id: string, admin: boolean): Promise<{ path: string }> {
    return this.completeFor(undefined, userId, serverId, id, async (staged, session) => {
      // Checked again: the file may have appeared while the chunks were on their way.
      await this.filesService.saveUpload(serverId, session.path, staged, admin, session.overwrite);
      return { path: session.path };
    });
  }

  async completeFor<T>(kind: string | undefined, userId: number, serverId: string, id: string, move: (staged: string, session: UploadSession) => Promise<T>): Promise<T> {
    const session = await this.load(userId, serverId, id);
    // A session only completes where it was opened for: a modpack must not land in mc-data.
    if (session.kind !== kind) {
      throw new NotFoundException('Upload not found');
    }
    // The same lock as a chunk: a second complete, or a chunk landing right before the
    // move, would otherwise end in a missing file halfway through.
    if (this.busy.has(id)) {
      throw new ConflictException('This upload is still being written or completed');
    }
    this.busy.add(id);
    this.completing.add(id);

    try {
      const offset = await this.currentOffset(id);
      if (offset !== session.size) {
        throw new ConflictException({ message: 'Upload is incomplete', offset });
      }

      const result = await move(this.partPath(id), session);
      await fs.remove(this.metaPath(id));
      return result;
    } finally {
      this.busy.delete(id);
      this.completing.delete(id);
    }
  }

  async abort(userId: number, serverId: string, id: string): Promise<void> {
    await this.load(userId, serverId, id);
    if (this.completing.has(id)) {
      throw new ConflictException('This upload is being completed');
    }
    await this.discard(id);
  }

  // Sessions are private to the user who opened them, on the server they were opened for.
  private async load(userId: number, serverId: string, id: string): Promise<UploadSession> {
    if (!SESSION_ID_PATTERN.test(id)) {
      throw new BadRequestException('Invalid upload id');
    }

    const session: UploadSession | null = await fs.readJson(this.metaPath(id)).catch(() => null);
    if (!session || session.userId !== userId || session.serverId !== serverId) {
      throw new NotFoundException('Upload not found');
    }
    return session;
  }

  // A missing file means the session was aborted or swept since it was loaded.
  private async currentOffset(id: string): Promise<number> {
    try {
      return (await fs.stat(this.partPath(id))).size;
    } catch {
      throw new NotFoundException('Upload not found');
    }
  }

  private async readSessions(): Promise<Array<{ session: UploadSession; offset: number }>> {
    const names = await fs.readdir(this.dir);
    const sessions = await Promise.all(
      names
        .filter((name) => name.endsWith('.json'))
        .map(async (name) => {
          const id = name.slice(0, -'.json'.length);
          const session: UploadSession | null = await fs.readJson(this.metaPath(id)).catch(() => null);
          if (!session) return null;
          return { session, offset: await fs.stat(this.partPath(id)).then((stat) => stat.size, () => 0) };
        }),
    );
    return sessions.filter((entry): entry is { session: UploadSession; offset: number } => entry !== null);
  }

  private async discard(id: string): Promise<void> {
    await Promise.all([fs.remove(this.metaPath(id)), fs.remove(this.partPath(id))]);
  }

  async sweep(now = Date.now()): Promise<void> {
    try {
      const names = await fs.readdir(this.dir);
      const ids = new Set(names.map((name) => name.replace(/\.(json|part)$/, '')));

      for (const id of ids) {
        if (this.busy.has(id)) continue;
        const session: UploadSession | null = await fs.readJson(this.metaPath(id)).catch(() => null);
        if (!session || now - session.updatedAt > SESSION_TTL_MS) {
          await this.discard(id);
        }
      }
    } catch (error) {
      this.logger.warn(`Could not sweep upload sessions: ${(error as Error).message}`);
    }
  }

  private metaPath(id: string): string {
    return path.join(this.dir, `${id}.json`);
  }

  private partPath(id: string): string {
    return path.join(this.dir, `${id}.part`);
  }
}
