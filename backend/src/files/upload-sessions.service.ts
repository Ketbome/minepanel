import { BadRequestException, ConflictException, HttpException, HttpStatus, Injectable, Logger, NotFoundException, OnModuleDestroy, PayloadTooLargeException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import fsp from 'node:fs/promises';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import * as fs from 'fs-extra';
import * as path from 'path';
import { FilesService } from './files.service';

export const UPLOAD_SESSIONS_DIR = '.upload-sessions';

// The client sends 8 MB; the cap leaves room without letting one request run past
// proxy body limits or Node's 5-minute request timeout on a slow link.
export const MAX_CHUNK_BYTES = 16 * 1024 * 1024;

// ponytail: an idle session is only swept after a day, so abandoned uploads hold disk until then.
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const SWEEP_INTERVAL_MS = 60 * 60 * 1000;

const SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

interface UploadSession {
  id: string;
  userId: number;
  serverId: string;
  path: string;
  size: number;
  overwrite: boolean;
  updatedAt: number;
}

// Large files arrive as a series of appends to one staged file, so no single request
// has to carry the whole upload. Session files live on disk next to the servers: a
// backend restart does not lose an upload in progress, and completing one is a rename.
@Injectable()
export class UploadSessionsService implements OnModuleDestroy {
  private readonly logger = new Logger(UploadSessionsService.name);
  private readonly dir: string;
  private readonly busy = new Set<string>();
  private readonly sweepTimer: NodeJS.Timeout;

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

  async create(userId: number, serverId: string, filePath: string, size: number, admin: boolean, overwrite = true): Promise<{ id: string; offset: number }> {
    // Fail before the first byte, not after gigabytes: the target must be writable...
    await this.filesService.assertUploadTarget(serverId, filePath, admin, overwrite);

    // ...and the disk must hold the file. ponytail: other sessions in progress are not reserved.
    const { bavail, bsize } = await fsp.statfs(this.dir);
    if (bavail * bsize < size) {
      throw new HttpException('Not enough free disk space for this upload', HttpStatus.INSUFFICIENT_STORAGE);
    }

    const session: UploadSession = { id: randomUUID(), userId, serverId, path: filePath, size, overwrite, updatedAt: Date.now() };
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

      await fs.writeJson(this.metaPath(id), { ...session, updatedAt: Date.now() });
      return { offset: await this.currentOffset(id) };
    } finally {
      this.busy.delete(id);
    }
  }

  async complete(userId: number, serverId: string, id: string, admin: boolean): Promise<{ path: string }> {
    const session = await this.load(userId, serverId, id);
    if (this.busy.has(id)) {
      throw new ConflictException('A chunk for this upload is still being written');
    }

    const offset = await this.currentOffset(id);
    if (offset !== session.size) {
      throw new ConflictException({ message: 'Upload is incomplete', offset });
    }

    // Checked again: the file may have appeared while the chunks were on their way.
    await this.filesService.saveUpload(serverId, session.path, this.partPath(id), admin, session.overwrite);
    await fs.remove(this.metaPath(id));
    return { path: session.path };
  }

  async abort(userId: number, serverId: string, id: string): Promise<void> {
    await this.load(userId, serverId, id);
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

  private async currentOffset(id: string): Promise<number> {
    return (await fs.stat(this.partPath(id))).size;
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
