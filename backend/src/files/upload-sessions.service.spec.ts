import { BadRequestException, ConflictException, HttpException, NotFoundException, PayloadTooLargeException } from '@nestjs/common';
import fsp from 'node:fs/promises';
import os from 'node:os';
import { PassThrough, Readable } from 'node:stream';
import * as fs from 'fs-extra';
import * as path from 'path';
import { UPLOAD_SESSIONS_DIR } from './files.service';
import { MAX_CHUNK_BYTES, MAX_SESSIONS_PER_USER, UploadSessionsService } from './upload-sessions.service';

describe('UploadSessionsService', () => {
  let root: string;
  let dir: string;
  let filesService: { assertUploadTarget: jest.Mock; saveUpload: jest.Mock };
  let service: UploadSessionsService;
  let saved: Buffer | null;

  const chunk = (text: string) => Readable.from([Buffer.from(text)]);

  // Waits for what a test needs to have happened instead of for a while: how long a file
  // read takes is up to the machine, and a slow runner reorders two requests otherwise.
  const until = async (condition: () => boolean | Promise<boolean>) => {
    for (let attempt = 0; attempt < 400; attempt++) {
      if (await condition()) return;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    throw new Error('condition not reached');
  };
  const lockHeld = (id: string) => until(() => (service as unknown as { busy: Set<string> }).busy.has(id));
  const partSize = (id: string) => fs.stat(path.join(dir, `${id}.part`)).then((stat) => stat.size, () => -1);

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'upload-sessions-'));
    dir = path.join(root, UPLOAD_SESSIONS_DIR);
    saved = null;
    filesService = {
      assertUploadTarget: jest.fn().mockResolvedValue(undefined),
      saveUpload: jest.fn(async (_serverId: string, _path: string, staged: string) => {
        saved = await fs.readFile(staged);
        await fs.remove(staged);
      }),
    };
    service = new UploadSessionsService({ get: () => root } as any, filesService as any);
  });

  afterEach(async () => {
    service.onModuleDestroy();
    jest.restoreAllMocks();
    await fs.remove(root);
  });

  it('appends chunks in order and moves the finished file into place', async () => {
    const { id, offset } = await service.create(1, 'srv', 'world/big.zip', 11, false);
    expect(offset).toBe(0);
    expect(filesService.assertUploadTarget).toHaveBeenCalledWith('srv', 'world/big.zip', false, true);

    expect(await service.append(1, 'srv', id, 0, chunk('hello '))).toEqual({ offset: 6 });
    expect(await service.getOffset(1, 'srv', id)).toEqual({ offset: 6 });
    expect(await service.append(1, 'srv', id, 6, chunk('world'))).toEqual({ offset: 11 });

    expect(await service.complete(1, 'srv', id, true)).toEqual({ path: 'world/big.zip' });
    expect(filesService.saveUpload).toHaveBeenCalledWith('srv', 'world/big.zip', path.join(dir, `${id}.part`), true, true);
    expect(saved?.toString()).toBe('hello world');
    expect(await fs.readdir(dir)).toEqual([]);
  });

  it('refuses a chunk at the wrong offset and reports where the file ends', async () => {
    const { id } = await service.create(1, 'srv', 'a.bin', 10, false);
    await service.append(1, 'srv', id, 0, chunk('abc'));

    // A retried chunk the server already has must not be written twice.
    const error = await service.append(1, 'srv', id, 0, chunk('abc')).catch((e) => e);
    expect(error).toBeInstanceOf(ConflictException);
    expect(error.getResponse()).toMatchObject({ offset: 3 });
    expect(await service.getOffset(1, 'srv', id)).toEqual({ offset: 3 });
  });

  it('cuts back a chunk that runs past the declared size', async () => {
    const { id } = await service.create(1, 'srv', 'a.bin', 4, false);
    await service.append(1, 'srv', id, 0, chunk('ab'));

    await expect(service.append(1, 'srv', id, 2, chunk('cdef'))).rejects.toThrow(PayloadTooLargeException);
    expect(await service.getOffset(1, 'srv', id)).toEqual({ offset: 2 });
  });

  it('refuses an oversized chunk from its declared length, before reading it', async () => {
    const { id } = await service.create(1, 'srv', 'a.bin', 4, false);
    const body = new PassThrough();

    await expect(service.append(1, 'srv', id, 0, body, 5)).rejects.toThrow(PayloadTooLargeException);
    expect(body.readableFlowing).toBeNull();
    expect(await service.append(1, 'srv', id, 0, chunk('abcd'), 4)).toEqual({ offset: 4 });
  });

  it('caps a single chunk even when the file is larger', async () => {
    const { id } = await service.create(1, 'srv', 'a.bin', MAX_CHUNK_BYTES * 2, false);
    const body = Readable.from([Buffer.alloc(MAX_CHUNK_BYTES), Buffer.alloc(1)]);

    await expect(service.append(1, 'srv', id, 0, body)).rejects.toThrow(PayloadTooLargeException);
    expect(await service.getOffset(1, 'srv', id)).toEqual({ offset: 0 });
  });

  it('keeps the bytes of a chunk cut short so the client can resume from them', async () => {
    const { id } = await service.create(1, 'srv', 'a.bin', 10, false);
    const body = new PassThrough();
    const append = service.append(1, 'srv', id, 0, body);

    body.write('abcd');
    await until(async () => (await partSize(id)) === 4);
    body.destroy(new Error('client went away'));

    await expect(append).rejects.toThrow('client went away');
    expect(await service.getOffset(1, 'srv', id)).toEqual({ offset: 4 });
  });

  it('allows one chunk at a time per upload', async () => {
    const { id } = await service.create(1, 'srv', 'a.bin', 10, false);
    const body = new PassThrough();
    const first = service.append(1, 'srv', id, 0, body);
    await lockHeld(id);

    await expect(service.append(1, 'srv', id, 0, chunk('x'))).rejects.toThrow(ConflictException);
    await expect(service.complete(1, 'srv', id, false)).rejects.toThrow(ConflictException);

    body.end('abc');
    expect(await first).toEqual({ offset: 3 });
  });

  it('completes only a full upload', async () => {
    const { id } = await service.create(1, 'srv', 'a.bin', 5, false);
    await service.append(1, 'srv', id, 0, chunk('abc'));

    await expect(service.complete(1, 'srv', id, false)).rejects.toThrow(ConflictException);
    expect(filesService.saveUpload).not.toHaveBeenCalled();
  });

  it('keeps the overwrite choice until the file is moved into place', async () => {
    const { id } = await service.create(1, 'srv', 'a.txt', 0, false, false);
    expect(filesService.assertUploadTarget).toHaveBeenCalledWith('srv', 'a.txt', false, false);
    await service.complete(1, 'srv', id, false);
    expect(filesService.saveUpload).toHaveBeenCalledWith('srv', 'a.txt', expect.any(String), false, false);
  });

  it('completes an empty file without any chunk', async () => {
    const { id } = await service.create(1, 'srv', 'empty.txt', 0, false);
    await service.complete(1, 'srv', id, false);
    expect(saved?.length).toBe(0);
  });

  it('keeps sessions private to their user and server', async () => {
    const { id } = await service.create(1, 'srv', 'a.bin', 5, false);

    await expect(service.getOffset(2, 'srv', id)).rejects.toThrow(NotFoundException);
    await expect(service.getOffset(1, 'other', id)).rejects.toThrow(NotFoundException);
    await expect(service.getOffset(1, 'srv', '../../etc/passwd')).rejects.toThrow(BadRequestException);
    await expect(service.getOffset(1, 'srv', '00000000-0000-0000-0000-000000000000')).rejects.toThrow(NotFoundException);
  });

  it('aborts by removing the staged file', async () => {
    const { id } = await service.create(1, 'srv', 'a.bin', 5, false);
    await service.append(1, 'srv', id, 0, chunk('abc'));

    await service.abort(1, 'srv', id);
    expect(await fs.readdir(dir)).toEqual([]);
  });

  it('refuses an upload the disk cannot hold, before any byte is sent', async () => {
    jest.spyOn(fsp, 'statfs').mockResolvedValue({ bavail: 10, bsize: 4096 } as any);

    const error = await service.create(1, 'srv', 'a.bin', 10 * 4096 + 1, false).catch((e) => e);
    expect(error).toBeInstanceOf(HttpException);
    expect(error.getStatus()).toBe(507);
    expect(await fs.readdir(dir)).toEqual([]);
  });

  it('does not open a session for a target it may not write', async () => {
    filesService.assertUploadTarget.mockRejectedValue(new BadRequestException('Invalid path'));
    await expect(service.create(1, 'srv', '../x', 1, false)).rejects.toThrow(BadRequestException);
    expect(await fs.readdir(dir)).toEqual([]);
  });

  describe('disk limits', () => {
    const open = async (userId: number, count: number) => {
      const ids: string[] = [];
      for (let i = 0; i < count; i++) ids.push((await service.create(userId, 'srv', `f${i}.bin`, 5, false)).id);
      return ids;
    };
    const age = async (id: string) => {
      const meta = path.join(dir, `${id}.json`);
      await fs.writeJson(meta, { ...(await fs.readJson(meta)), updatedAt: Date.now() - 20 * 60 * 1000 });
    };

    it('caps the uploads in progress per user', async () => {
      const ids = await open(1, MAX_SESSIONS_PER_USER);

      const error = await service.create(1, 'srv', 'more.bin', 5, false).catch((e) => e);
      expect(error).toBeInstanceOf(HttpException);
      expect(error.getStatus()).toBe(429);

      // The limit is per user, and cancelling one gives the slot back.
      await service.create(2, 'srv', 'other.bin', 5, false);
      await service.abort(1, 'srv', ids[0]);
      await service.create(1, 'srv', 'more.bin', 5, false);
    });

    it('holds the limit when creates arrive together', async () => {
      const results = await Promise.allSettled(Array.from({ length: MAX_SESSIONS_PER_USER + 3 }, (_, i) => service.create(1, 'srv', `f${i}.bin`, 5, false)));

      expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(MAX_SESSIONS_PER_USER);
      expect(results.filter((result) => result.status === 'rejected')).toHaveLength(3);
    });

    it('replaces an abandoned session instead of leaving its owner stuck at the limit', async () => {
      const ids = await open(1, MAX_SESSIONS_PER_USER);
      await age(ids[0]);

      const fresh = await service.create(1, 'srv', 'more.bin', 5, false);
      const left = (await fs.readdir(dir)).filter((name) => name.endsWith('.json')).map((name) => name.replace('.json', ''));
      expect(left.sort()).toEqual([...ids.slice(1), fresh.id].sort());
      await expect(service.getOffset(1, 'srv', ids[0])).rejects.toThrow(NotFoundException);
    });

    it('never replaces a session that has a chunk in flight, however idle it looks', async () => {
      const ids = await open(1, MAX_SESSIONS_PER_USER);
      const body = new PassThrough();
      const chunkInFlight = service.append(1, 'srv', ids[0], 0, body);
      await lockHeld(ids[0]);
      await Promise.all(ids.map(age));

      await service.create(1, 'srv', 'more.bin', 5, false);
      expect(await fs.pathExists(path.join(dir, `${ids[0]}.json`))).toBe(true);

      body.end('abc');
      await chunkInFlight;
    });

    it('counts what other sessions still have to write against the free space', async () => {
      jest.spyOn(fsp, 'statfs').mockResolvedValue({ bavail: 100, bsize: 1 } as any);

      const first = await service.create(1, 'srv', 'a.bin', 60, false);
      const refused = await service.create(2, 'srv', 'b.bin', 60, false).catch((e) => e);
      expect(refused.getStatus()).toBe(507);

      // Bytes already written are gone from the free space; only the rest is promised.
      await service.append(1, 'srv', first.id, 0, chunk('x'.repeat(50)));
      await service.create(2, 'srv', 'b.bin', 60, false);
    });

    it('ignores a session record it cannot read', async () => {
      await fs.writeFile(path.join(dir, 'broken.json'), '{oops');
      await service.create(1, 'srv', 'a.bin', 5, false);
    });
  });

  it('lets one complete through and turns the other away', async () => {
    const { id } = await service.create(1, 'srv', 'a.bin', 3, false);
    await service.append(1, 'srv', id, 0, chunk('abc'));

    let release = () => {};
    filesService.saveUpload.mockImplementationOnce(async (_serverId: string, _path: string, staged: string) => {
      await new Promise<void>((resolve) => (release = resolve));
      saved = await fs.readFile(staged);
      await fs.remove(staged);
    });

    const first = service.complete(1, 'srv', id, false);
    await lockHeld(id);
    await expect(service.complete(1, 'srv', id, false)).rejects.toThrow(ConflictException);

    release();
    await first;
    expect(filesService.saveUpload).toHaveBeenCalledTimes(1);
    expect(saved?.toString()).toBe('abc');
    await expect(service.complete(1, 'srv', id, false)).rejects.toThrow(NotFoundException);
  });

  it('does not bring an aborted session back when its last chunk finishes', async () => {
    const { id } = await service.create(1, 'srv', 'a.bin', 10, false);
    const body = new PassThrough();
    const chunkInFlight = service.append(1, 'srv', id, 0, body);
    body.write('abc');
    await until(async () => (await partSize(id)) === 3);

    await service.abort(1, 'srv', id);
    body.end('def');

    await expect(chunkInFlight).rejects.toThrow(NotFoundException);
    expect(await fs.readdir(dir)).toEqual([]);
  });

  it('sweeps idle sessions and orphaned parts but keeps active ones', async () => {
    const stale = await service.create(1, 'srv', 'old.bin', 5, false);
    const fresh = await service.create(1, 'srv', 'new.bin', 5, false);
    await fs.writeFile(path.join(dir, 'orphan.part'), 'x');

    const meta = path.join(dir, `${stale.id}.json`);
    await fs.writeJson(meta, { ...(await fs.readJson(meta)), updatedAt: 0 });

    await service.sweep(Date.now());
    expect((await fs.readdir(dir)).sort()).toEqual([`${fresh.id}.json`, `${fresh.id}.part`].sort());
  });

  it('logs instead of throwing when the sessions folder is gone', async () => {
    await fs.remove(dir);
    await expect(service.sweep()).resolves.toBeUndefined();
  });
});
