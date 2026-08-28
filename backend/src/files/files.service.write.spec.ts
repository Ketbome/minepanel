import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as fs from 'fs-extra';
import { FilesService } from './files.service';

jest.mock('fs-extra', () => ({
  ensureDirSync: jest.fn(),
  ensureDir: jest.fn().mockResolvedValue(undefined),
  pathExists: jest.fn(),
  stat: jest.fn(),
  readdir: jest.fn(),
  writeFile: jest.fn().mockResolvedValue(undefined),
  remove: jest.fn().mockResolvedValue(undefined),
  rename: jest.fn().mockResolvedValue(undefined),
}));

const mockArchive = { directory: jest.fn(), finalize: jest.fn() };
jest.mock('archiver', () => jest.fn(() => mockArchive));

describe('FilesService writes', () => {
  let service: FilesService;
  const BASE = '/app/servers/srv/mc-data';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FilesService({ get: () => '/app/servers' } as any);
  });

  it('writes text and buffers under the server directory', async () => {
    await service.writeFile('srv', 'config/a.txt', 'hello');
    expect(fs.ensureDir).toHaveBeenCalledWith(`${BASE}/config`);
    expect(fs.writeFile).toHaveBeenCalledWith(`${BASE}/config/a.txt`, 'hello', 'utf-8');

    const buffer = Buffer.from('x');
    await service.writeFileBuffer('srv', 'b.bin', buffer);
    expect(fs.writeFile).toHaveBeenLastCalledWith(`${BASE}/b.bin`, buffer);

    await expect(service.writeFile('srv', '../../etc/passwd', 'x')).rejects.toThrow(BadRequestException);
  });

  it('deletes existing paths only', async () => {
    (fs.pathExists as unknown as jest.Mock).mockResolvedValueOnce(false);
    await expect(service.deleteFile('srv', 'a')).rejects.toThrow(NotFoundException);

    (fs.pathExists as unknown as jest.Mock).mockResolvedValueOnce(true);
    await service.deleteFile('srv', 'a');
    expect(fs.remove).toHaveBeenCalledWith(`${BASE}/a`);
  });

  it('creates directories', async () => {
    await service.createDirectory('srv', 'new/dir');
    expect(fs.ensureDir).toHaveBeenCalledWith(`${BASE}/new/dir`);
  });

  it('renames within the same directory', async () => {
    (fs.pathExists as unknown as jest.Mock).mockResolvedValueOnce(false);
    await expect(service.rename('srv', 'dir/a', 'b')).rejects.toThrow(NotFoundException);

    (fs.pathExists as unknown as jest.Mock).mockResolvedValueOnce(true).mockResolvedValueOnce(true);
    await expect(service.rename('srv', 'dir/a', 'b')).rejects.toThrow('already exists');

    (fs.pathExists as unknown as jest.Mock).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    await service.rename('srv', 'dir/a', 'b');
    expect(fs.rename).toHaveBeenCalledWith(`${BASE}/dir/a`, `${BASE}/dir/b`);

    await expect(service.rename('srv', 'a', '../../../x')).rejects.toThrow(BadRequestException);
  });

  it('describes files and directories', async () => {
    (fs.pathExists as unknown as jest.Mock).mockResolvedValueOnce(false);
    await expect(service.getFileInfo('srv', 'a')).rejects.toThrow(NotFoundException);

    const mtime = new Date();
    (fs.pathExists as unknown as jest.Mock).mockResolvedValue(true);
    (fs.stat as unknown as jest.Mock).mockResolvedValueOnce({ isDirectory: () => false, size: 3, mtime });
    expect(await service.getFileInfo('srv', 'dir/a.txt')).toEqual({ name: 'a.txt', path: 'dir/a.txt', isDirectory: false, size: 3, modified: mtime, extension: 'txt' });

    (fs.stat as unknown as jest.Mock).mockResolvedValueOnce({ isDirectory: () => true, size: 0, mtime });
    expect(await service.getFileInfo('srv', 'dir')).toMatchObject({ isDirectory: true, extension: undefined });
  });

  it('zips directories', async () => {
    (fs.pathExists as unknown as jest.Mock).mockResolvedValueOnce(false);
    await expect(service.createZipStream('srv', 'dir')).rejects.toThrow(NotFoundException);

    (fs.pathExists as unknown as jest.Mock).mockResolvedValue(true);
    (fs.stat as unknown as jest.Mock).mockResolvedValueOnce({ isDirectory: () => false });
    await expect(service.createZipStream('srv', 'file')).rejects.toThrow(BadRequestException);

    (fs.stat as unknown as jest.Mock).mockResolvedValueOnce({ isDirectory: () => true });
    const result = await service.createZipStream('srv', 'world');
    expect(result).toEqual({ stream: mockArchive, name: 'world.zip' });
    expect(mockArchive.directory).toHaveBeenCalledWith(`${BASE}/world`, 'world');
    expect(mockArchive.finalize).toHaveBeenCalled();
  });

  it('listFiles rejects non-directories and skips entries it cannot stat', async () => {
    (fs.pathExists as unknown as jest.Mock).mockResolvedValue(true);
    (fs.stat as unknown as jest.Mock).mockResolvedValueOnce({ isDirectory: () => false });
    await expect(service.listFiles('srv', 'file')).rejects.toThrow(BadRequestException);

    (fs.stat as unknown as jest.Mock).mockResolvedValueOnce({ isDirectory: () => true }).mockRejectedValueOnce(new Error('eacces')).mockResolvedValueOnce({ size: 1, mtime: new Date() });
    (fs.readdir as unknown as jest.Mock).mockResolvedValue([
      { name: 'broken', isDirectory: () => false },
      { name: 'noext', isDirectory: () => false },
    ]);
    const files = await service.listFiles('srv', '');
    expect(files.map((f) => f.name)).toEqual(['noext']);
    expect(files[0].extension).toBeUndefined();
  });
});
