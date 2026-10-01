import { BadRequestException } from '@nestjs/common';
import { ModpacksController } from './modpacks.controller';

describe('ModpacksController', () => {
  const req = { user: { userId: 1 } };
  let service: Record<string, jest.Mock>;
  let accessControl: { assertServerFiles: jest.Mock };
  let controller: ModpacksController;
  let uploadSessions: { createFor: jest.Mock; completeFor: jest.Mock };

  beforeEach(() => {
    service = {
      list: jest.fn().mockResolvedValue(['m']),
      save: jest.fn().mockResolvedValue({ name: 'a.zip' }),
      remove: jest.fn().mockResolvedValue(undefined),
      inspect: jest.fn().mockResolvedValue({ kind: 'generic' }),
      scanMods: jest.fn().mockResolvedValue({ mods: [], truncated: false }),
      stripMods: jest.fn().mockResolvedValue({ name: 'a-server.zip' }),
      assertUploadTarget: jest.fn().mockResolvedValue(undefined),
      saveStaged: jest.fn().mockResolvedValue({ name: 'big.zip' }),
    };
    uploadSessions = {
      createFor: jest.fn(async (_kind, _userId, _serverId, _path, _size, assertTarget: () => Promise<void>) => {
        await assertTarget();
        return { id: 'u1', offset: 0 };
      }),
      completeFor: jest.fn(async (_kind, _userId, _serverId, _id, move: (staged: string, session: { path: string }) => Promise<unknown>) => move('/staged.part', { path: 'big.zip' })),
    };
    accessControl = { assertServerFiles: jest.fn() };
    controller = new ModpacksController(service as any, { getRequiredUserById: jest.fn().mockResolvedValue({ id: 1 }) } as any, accessControl as any, uploadSessions as any);
  });

  it('uses read access for listing and write access for changes', async () => {
    expect(await controller.list(req, 'srv')).toEqual(['m']);
    expect(accessControl.assertServerFiles).toHaveBeenLastCalledWith({ id: 1 }, 'srv', false);
    const file = { originalname: 'a.zip' } as Express.Multer.File;
    expect(await controller.upload(req, 'srv', file)).toEqual({ name: 'a.zip' });
    expect(accessControl.assertServerFiles).toHaveBeenLastCalledWith({ id: 1 }, 'srv', true);
    expect(await controller.inspect(req, 'srv', 'a.zip')).toEqual({ kind: 'generic' });
    expect(accessControl.assertServerFiles).toHaveBeenLastCalledWith({ id: 1 }, 'srv', false);
    expect(await controller.scanMods(req, 'srv', 'a.zip')).toEqual({ mods: [], truncated: false });
    expect(await controller.stripMods(req, 'srv', 'a.zip', { entries: ['mods/x.jar'] })).toEqual({ name: 'a-server.zip' });
    expect(accessControl.assertServerFiles).toHaveBeenLastCalledWith({ id: 1 }, 'srv', true);
    expect(await controller.remove(req, 'srv', 'a.zip')).toEqual({ success: true });
    expect(service.remove).toHaveBeenCalledWith('srv', 'a.zip');
  });

  it('opens and finishes chunked modpack uploads with write access', async () => {
    expect(await controller.createUpload(req, 'srv', { name: 'big.zip', size: 10 })).toEqual({ id: 'u1', offset: 0 });
    expect(uploadSessions.createFor).toHaveBeenCalledWith('modpack', 1, 'srv', 'big.zip', 10, expect.any(Function));
    expect(service.assertUploadTarget).toHaveBeenCalledWith('srv', 'big.zip');
    expect(accessControl.assertServerFiles).toHaveBeenLastCalledWith({ id: 1 }, 'srv', true);

    accessControl.assertServerFiles.mockClear();
    expect(await controller.completeUpload(req, 'srv', 'u1')).toEqual({ name: 'big.zip' });
    expect(uploadSessions.completeFor).toHaveBeenCalledWith('modpack', 1, 'srv', 'u1', expect.any(Function));
    expect(service.saveStaged).toHaveBeenCalledWith('srv', 'big.zip', '/staged.part');
    expect(accessControl.assertServerFiles).toHaveBeenLastCalledWith({ id: 1 }, 'srv', true);
  });

  it('rejects a strip request that is not a list of paths', async () => {
    await expect(controller.stripMods(req, 'srv', 'a.zip', {})).rejects.toThrow(BadRequestException);
    await expect(controller.stripMods(req, 'srv', 'a.zip', { entries: [1] as unknown as string[] })).rejects.toThrow(BadRequestException);
  });
});
