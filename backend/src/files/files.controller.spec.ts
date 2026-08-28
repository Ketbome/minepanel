import { BadRequestException } from '@nestjs/common';
import { EventEmitter } from 'node:events';
import * as fs from 'fs-extra';
import { FilesController } from './files.controller';

jest.mock('fs-extra', () => ({
  pathExists: jest.fn(),
  stat: jest.fn(),
  createReadStream: jest.fn(),
}));

describe('FilesController', () => {
  const req = { user: { userId: 1 } };
  let filesService: Record<string, jest.Mock>;
  let accessControl: Record<string, jest.Mock>;
  let controller: FilesController;
  let res: any;

  beforeEach(() => {
    jest.clearAllMocks();
    filesService = {
      listFiles: jest.fn().mockResolvedValue(['list']),
      readFile: jest.fn().mockResolvedValue({ content: 'x', encoding: 'utf-8' }),
      getFullPath: jest.fn().mockReturnValue('/app/servers/s/mc-data/a.txt'),
      createZipStream: jest.fn(),
      getFileInfo: jest.fn().mockResolvedValue({ name: 'a' }),
      writeFile: jest.fn().mockResolvedValue(undefined),
      createDirectory: jest.fn().mockResolvedValue(undefined),
      writeFileBuffer: jest.fn().mockResolvedValue(undefined),
      rename: jest.fn().mockResolvedValue(undefined),
      deleteFile: jest.fn().mockResolvedValue(undefined),
    };
    accessControl = { assertGlobalFiles: jest.fn(), assertServerFiles: jest.fn() };
    const usersService = { getRequiredUserById: jest.fn().mockResolvedValue({ id: 1 }) };
    controller = new FilesController(filesService as any, usersService as any, accessControl as any);
    res = { setHeader: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn(), headersSent: false };
  });

  it('routes access checks to global or per-server permissions', async () => {
    await controller.listFiles(req, '_root');
    expect(accessControl.assertGlobalFiles).toHaveBeenCalledWith({ id: 1 }, false);
    await controller.listFiles(req, '.world', 'dir');
    expect(accessControl.assertGlobalFiles).toHaveBeenLastCalledWith({ id: 1 }, false);
    await controller.writeFile(req, 'srv', { path: 'a', content: 'b' });
    expect(accessControl.assertServerFiles).toHaveBeenCalledWith({ id: 1 }, 'srv', true);
    expect(filesService.listFiles).toHaveBeenCalledWith('.world', 'dir');
  });

  it('requires a path for read, info, write, mkdir and delete', async () => {
    await expect(controller.readFile(req, 'srv', '')).rejects.toThrow(BadRequestException);
    await expect(controller.getFileInfo(req, 'srv', '')).rejects.toThrow(BadRequestException);
    await expect(controller.writeFile(req, 'srv', { path: '', content: '' })).rejects.toThrow(BadRequestException);
    await expect(controller.createDirectory(req, 'srv', { path: '' })).rejects.toThrow(BadRequestException);
    await expect(controller.deleteFile(req, 'srv', '')).rejects.toThrow(BadRequestException);
    await expect(controller.rename(req, 'srv', { path: 'a', newName: '' })).rejects.toThrow(BadRequestException);
    await expect(controller.downloadFile(req, 'srv', '', res)).rejects.toThrow(BadRequestException);
    await expect(controller.downloadZip(req, 'srv', '', res)).rejects.toThrow(BadRequestException);
  });

  it('forwards simple operations to the service', async () => {
    expect(await controller.readFile(req, 'srv', 'a.txt')).toEqual({ content: 'x', encoding: 'utf-8' });
    expect(await controller.getFileInfo(req, 'srv', 'a.txt')).toEqual({ name: 'a' });
    expect(await controller.createDirectory(req, 'srv', { path: 'dir' })).toEqual({ success: true });
    expect(await controller.rename(req, 'srv', { path: 'a', newName: 'b' })).toEqual({ success: true });
    expect(await controller.deleteFile(req, 'srv', 'a')).toEqual({ success: true });
    expect(filesService.rename).toHaveBeenCalledWith('srv', 'a', 'b');
  });

  it('downloads a file as an attachment', async () => {
    (fs.pathExists as unknown as jest.Mock).mockResolvedValue(true);
    (fs.stat as unknown as jest.Mock).mockResolvedValue({ isDirectory: () => false, size: 12 });
    const stream = Object.assign(new EventEmitter(), { pipe: jest.fn() });
    (fs.createReadStream as jest.Mock).mockReturnValue(stream);

    await controller.downloadFile(req, 'srv', 'dir/a b.txt', res);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="a%20b.txt"');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Length', 12);
    expect(stream.pipe).toHaveBeenCalledWith(res);

    stream.emit('error', new Error('io'));
    expect(res.status).toHaveBeenCalledWith(500);
    res.headersSent = true;
    res.status.mockClear();
    stream.emit('error', new Error('io'));
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects downloads of missing files and directories', async () => {
    (fs.pathExists as unknown as jest.Mock).mockResolvedValue(false);
    await expect(controller.downloadFile(req, 'srv', 'a', res)).rejects.toThrow('File not found');
    (fs.pathExists as unknown as jest.Mock).mockResolvedValue(true);
    (fs.stat as unknown as jest.Mock).mockResolvedValue({ isDirectory: () => true });
    await expect(controller.downloadFile(req, 'srv', 'a', res)).rejects.toThrow('Cannot download a directory');
  });

  it('streams a zip of a directory', async () => {
    const stream = { pipe: jest.fn() };
    filesService.createZipStream.mockResolvedValue({ stream, name: 'dir.zip' });
    await controller.downloadZip(req, 'srv', 'dir', res);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="dir.zip"');
    expect(stream.pipe).toHaveBeenCalledWith(res);
  });

  it('uploads a single file preserving the relative path', async () => {
    await expect(controller.uploadFile(req, 'srv', '', '', undefined as any)).rejects.toThrow('File is required');

    const file = { originalname: 'orig.txt', buffer: Buffer.from('x') } as Express.Multer.File;
    expect(await controller.uploadFile(req, 'srv', 'mods', 'sub/a.txt', file)).toEqual({ success: true, path: 'mods/sub/a.txt' });
    expect(await controller.uploadFile(req, 'srv', '', '', file)).toEqual({ success: true, path: 'orig.txt' });
    expect(filesService.writeFileBuffer).toHaveBeenLastCalledWith('srv', 'orig.txt', file.buffer);
  });

  it('uploads multiple files and counts failures', async () => {
    await expect(controller.uploadMultipleFiles(req, 'srv', '', [], {})).rejects.toThrow('At least one file');

    const files = [{ originalname: 'a.txt', buffer: Buffer.from('a') }, { originalname: 'b.txt', buffer: Buffer.from('b') }] as Express.Multer.File[];
    filesService.writeFileBuffer.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('disk'));

    const result = await controller.uploadMultipleFiles(req, 'srv', 'dir', files, { relativePaths: JSON.stringify(['x/a.txt']) });

    expect(result).toEqual({ success: true, uploaded: 1, errors: 1 });
    expect(filesService.writeFileBuffer).toHaveBeenNthCalledWith(1, 'srv', 'dir/x/a.txt', files[0].buffer);
    expect(filesService.writeFileBuffer).toHaveBeenNthCalledWith(2, 'srv', 'dir/b.txt', files[1].buffer);
  });
});
