import { BadRequestException, ConflictException, HttpException, NotFoundException, PayloadTooLargeException } from '@nestjs/common';
import fsp from 'node:fs/promises';
import os from 'node:os';
import { PassThrough, Readable } from 'node:stream';
import * as fs from 'fs-extra';
import * as path from 'path';
import { MAX_CHUNK_BYTES, UPLOAD_SESSIONS_DIR, UploadSessionsService } from './upload-sessions.service';

describe('UploadSessionsService', () => {
  let root: string;
  let dir: string;
  let filesService: { assertUploadTarget: jest.Mock; saveUpload: jest.Mock };
  let service: UploadSessionsService;
  let saved: Buffer | null;

  const chunk = (text: string) => Readable.from([Buffer.from(text)]);

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
    await new Promise((resolve) => setTimeout(resolve, 20));
    body.destroy(new Error('client went away'));

    await expect(append).rejects.toThrow('client went away');
    expect(await service.getOffset(1, 'srv', id)).toEqual({ offset: 4 });
  });

  it('allows one chunk at a time per upload', async () => {
    const { id } = await service.create(1, 'srv', 'a.bin', 10, false);
    const body = new PassThrough();
    const first = service.append(1, 'srv', id, 0, body);
    await new Promise((resolve) => setImmediate(resolve));

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
