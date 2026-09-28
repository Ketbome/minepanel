import { BadRequestException, ConflictException } from '@nestjs/common';
import { EventEmitter } from 'node:events';
import * as fs from 'fs-extra';
import { FilesController, attachmentHeader } from './files.controller';

jest.mock('fs-extra', () => ({
  pathExists: jest.fn(),
  stat: jest.fn(),
  createReadStream: jest.fn(),
  remove: jest.fn().mockResolvedValue(undefined),
}));

describe('FilesController', () => {
  const req = { user: { userId: 1 }, headers: {} as Record<string, string> };
  let filesService: Record<string, jest.Mock>;
  let accessControl: Record<string, jest.Mock>;
  let uploadSessions: Record<string, jest.Mock>;
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
      saveUpload: jest.fn().mockResolvedValue(undefined),
      rename: jest.fn().mockResolvedValue(undefined),
      deleteFile: jest.fn().mockResolvedValue(undefined),
    };
    accessControl = { assertGlobalFiles: jest.fn(), assertServerFiles: jest.fn(), isAdmin: jest.fn().mockReturnValue(false) };
    const usersService = { getRequiredUserById: jest.fn().mockResolvedValue({ id: 1 }) };
    uploadSessions = {
      create: jest.fn().mockResolvedValue({ id: 'u1', offset: 0 }),
      getOffset: jest.fn().mockResolvedValue({ offset: 5 }),
      append: jest.fn().mockResolvedValue({ offset: 10 }),
      complete: jest.fn().mockResolvedValue({ path: 'dir/big.zip' }),
      abort: jest.fn().mockResolvedValue(undefined),
    };
    controller = new FilesController(filesService as any, uploadSessions as any, usersService as any, accessControl as any);
    res = Object.assign(new EventEmitter(), { destroy: jest.fn(), writableFinished: false, setHeader: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn(), headersSent: false });
  });

  it('routes access checks to global or per-server permissions', async () => {
    await controller.listFiles(req, '_root');
    expect(accessControl.assertGlobalFiles).toHaveBeenCalledWith({ id: 1 }, false);
    await controller.listFiles(req, '.world', 'dir');
    expect(accessControl.assertGlobalFiles).toHaveBeenLastCalledWith({ id: 1 }, false);
    await controller.writeFile(req, 'srv', { path: 'a', content: 'b' });
    expect(accessControl.assertServerFiles).toHaveBeenCalledWith({ id: 1 }, 'srv', true);
    expect(filesService.listFiles).toHaveBeenCalledWith('.world', 'dir', false);
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
    expect(filesService.rename).toHaveBeenCalledWith('srv', 'a', 'b', false);

    accessControl.isAdmin.mockReturnValue(true);
    await controller.deleteFile(req, '_root', 'srv/server.json');
    expect(filesService.deleteFile).toHaveBeenLastCalledWith('_root', 'srv/server.json', true);
  });

  it('downloads a file as an attachment', async () => {
    (fs.pathExists as unknown as jest.Mock).mockResolvedValue(true);
    (fs.stat as unknown as jest.Mock).mockResolvedValue({ isDirectory: () => false, size: 12 });
    const stream = Object.assign(new EventEmitter(), { pipe: jest.fn(), destroy: jest.fn() });
    (fs.createReadStream as jest.Mock).mockReturnValue(stream);

    await controller.downloadFile(req, 'srv', 'dir/a b.txt', res);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', `attachment; filename="a b.txt"; filename*=UTF-8''a%20b.txt`);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Length', 12);
    expect(stream.pipe).toHaveBeenCalledWith(res);

    stream.emit('error', new Error('io'));
    expect(res.status).toHaveBeenCalledWith(500);
    res.headersSent = true;
    res.status.mockClear();
    stream.emit('error', new Error('io'));
    expect(res.status).not.toHaveBeenCalled();

    res.emit('close');
    expect(stream.destroy).toHaveBeenCalled();
  });

  it('names downloads in UTF-8, Latin-1 names included', () => {
    expect(attachmentHeader('büyük dünya.zip')).toBe(`attachment; filename="b_y_k d_nya.zip"; filename*=UTF-8''b%C3%BCy%C3%BCk%20d%C3%BCnya.zip`);
    expect(attachmentHeader('şş.txt')).toBe(`attachment; filename="__.txt"; filename*=UTF-8''%C5%9F%C5%9F.txt`);
    expect(attachmentHeader(`a"b\\c'(1)*.txt`)).toBe(`attachment; filename="a_b_c'(1)*.txt"; filename*=UTF-8''a%22b%5Cc%27%281%29%2A.txt`);
  });

  it('rejects downloads of missing files and directories', async () => {
    (fs.pathExists as unknown as jest.Mock).mockResolvedValue(false);
    await expect(controller.downloadFile(req, 'srv', 'a', res)).rejects.toThrow('File not found');
    (fs.pathExists as unknown as jest.Mock).mockResolvedValue(true);
    (fs.stat as unknown as jest.Mock).mockResolvedValue({ isDirectory: () => true });
    await expect(controller.downloadFile(req, 'srv', 'a', res)).rejects.toThrow('Cannot download a directory');
  });

  it('streams a zip of a directory', async () => {
    const stream = Object.assign(new EventEmitter(), { pipe: jest.fn(), abort: jest.fn() });
    filesService.createZipStream.mockResolvedValue({ stream, name: 'dir.zip' });
    await controller.downloadZip(req, 'srv', 'dir', res);
    expect(filesService.createZipStream).toHaveBeenCalledWith('srv', ['dir'], false);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', `attachment; filename="dir.zip"; filename*=UTF-8''dir.zip`);

    await controller.downloadZip(req, 'srv', ['dir/a', 'dir/b'], res);
    expect(filesService.createZipStream).toHaveBeenLastCalledWith('srv', ['dir/a', 'dir/b'], false);
    expect(stream.pipe).toHaveBeenCalledWith(res);

    stream.emit('warning', new Error('ENOENT'));
    const failure = new Error('EACCES');
    stream.emit('error', failure);
    expect(res.destroy).toHaveBeenCalledWith(failure);
  });

  it('stops zipping when the client leaves before the end, not after it', async () => {
    const stream = Object.assign(new EventEmitter(), { pipe: jest.fn(), abort: jest.fn(), unpipe: jest.fn(), resume: jest.fn() });
    filesService.createZipStream.mockResolvedValue({ stream, name: 'dir.zip' });

    await controller.downloadZip(req, 'srv', 'dir', res);
    res.writableFinished = true;
    res.emit('close');
    expect(stream.abort).not.toHaveBeenCalled();

    res.writableFinished = false;
    res.emit('close');
    expect(stream.abort).toHaveBeenCalled();
    expect(stream.unpipe).toHaveBeenCalledWith(res);
    expect(stream.resume).toHaveBeenCalled();
  });

  it('uploads a single file preserving the relative path', async () => {
    await expect(controller.uploadFile(req, 'srv', '', '', undefined as any)).rejects.toThrow('File is required');

    const file = { originalname: 'orig.txt', path: '/app/servers/.uploads/abc' } as Express.Multer.File;
    expect(await controller.uploadFile(req, 'srv', 'mods', 'sub/a.txt', file)).toEqual({ success: true, path: 'mods/sub/a.txt' });
    expect(await controller.uploadFile(req, 'srv', '', '', file)).toEqual({ success: true, path: 'orig.txt' });
    expect(filesService.saveUpload).toHaveBeenLastCalledWith('srv', 'orig.txt', file.path, false, true);
    await controller.uploadFile(req, 'srv', '', '', file, 'false');
    expect(filesService.saveUpload).toHaveBeenLastCalledWith('srv', 'orig.txt', file.path, false, false);
    expect(fs.remove).toHaveBeenLastCalledWith(file.path);
  });

  it('drops the staged upload when the caller may not write there', async () => {
    accessControl.assertServerFiles.mockImplementation(() => {
      throw new BadRequestException('denied');
    });
    const file = { originalname: 'a.txt', path: '/app/servers/.uploads/abc' } as Express.Multer.File;

    await expect(controller.uploadFile(req, 'srv', '', '', file)).rejects.toThrow('denied');
    await expect(controller.uploadMultipleFiles(req, 'srv', '', [file], {})).rejects.toThrow('denied');
    expect(filesService.saveUpload).not.toHaveBeenCalled();
    expect(fs.remove).toHaveBeenCalledTimes(2);
  });

  it('uploads multiple files and reports skipped and failed ones by name', async () => {
    await expect(controller.uploadMultipleFiles(req, 'srv', '', [], {})).rejects.toThrow('At least one file');

    const files = [{ originalname: 'a.txt', path: '/tmp/a' }, { originalname: 'b.txt', path: '/tmp/b' }, { originalname: 'c.txt', path: '/tmp/c' }] as Express.Multer.File[];
    filesService.saveUpload.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('disk')).mockRejectedValueOnce(new ConflictException('exists'));

    const result = await controller.uploadMultipleFiles(req, 'srv', 'dir', files, { relativePaths: JSON.stringify(['x/a.txt']) }, 'false');

    expect(result).toEqual({ success: true, uploaded: 1, errors: 1, skipped: ['c.txt'], failed: ['b.txt'] });
    expect(filesService.saveUpload).toHaveBeenNthCalledWith(1, 'srv', 'dir/x/a.txt', '/tmp/a', false, false);
    expect(filesService.saveUpload).toHaveBeenNthCalledWith(2, 'srv', 'dir/b.txt', '/tmp/b', false, false);
    expect(fs.remove).toHaveBeenCalledWith('/tmp/b');
  });

  it('checks write access on every chunked upload step and forwards to the sessions', async () => {
    expect(await controller.createUpload(req, 'srv', { path: 'dir', name: 'big.zip', size: 10 })).toEqual({ id: 'u1', offset: 0 });
    expect(uploadSessions.create).toHaveBeenCalledWith(1, 'srv', 'dir/big.zip', 10, false, true);
    await controller.createUpload(req, 'srv', { name: 'top.zip', size: 1, overwrite: false });
    expect(uploadSessions.create).toHaveBeenLastCalledWith(1, 'srv', 'top.zip', 1, false, false);

    expect(await controller.getUpload(req, 'srv', 'u1')).toEqual({ offset: 5 });
    expect(await controller.appendUpload(req, 'srv', 'u1', 5)).toEqual({ offset: 10 });
    expect(uploadSessions.append).toHaveBeenCalledWith(1, 'srv', 'u1', 5, req, undefined);
    const sized = { ...req, headers: { 'content-length': '7' } };
    await controller.appendUpload(sized, 'srv', 'u1', 5);
    expect(uploadSessions.append).toHaveBeenLastCalledWith(1, 'srv', 'u1', 5, sized, 7);
    expect(await controller.completeUpload(req, 'srv', 'u1')).toEqual({ success: true, path: 'dir/big.zip' });
    expect(await controller.abortUpload(req, 'srv', 'u1')).toEqual({ success: true });
    expect(uploadSessions.abort).toHaveBeenCalledWith(1, 'srv', 'u1');

    expect(accessControl.assertServerFiles).toHaveBeenCalledTimes(7);
    for (const call of accessControl.assertServerFiles.mock.calls) expect(call).toEqual([{ id: 1 }, 'srv', true]);
  });
});
