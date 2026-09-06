import { BadRequestException } from '@nestjs/common';
import { ModpacksController } from './modpacks.controller';

describe('ModpacksController', () => {
  const req = { user: { userId: 1 } };
  let service: Record<string, jest.Mock>;
  let accessControl: { assertServerFiles: jest.Mock };
  let controller: ModpacksController;

  beforeEach(() => {
    service = {
      list: jest.fn().mockResolvedValue(['m']),
      save: jest.fn().mockResolvedValue({ name: 'a.zip' }),
      remove: jest.fn().mockResolvedValue(undefined),
      inspect: jest.fn().mockResolvedValue({ kind: 'generic' }),
      scanMods: jest.fn().mockResolvedValue({ mods: [], truncated: false }),
      stripMods: jest.fn().mockResolvedValue({ name: 'a-server.zip' }),
    };
    accessControl = { assertServerFiles: jest.fn() };
    controller = new ModpacksController(service as any, { getRequiredUserById: jest.fn().mockResolvedValue({ id: 1 }) } as any, accessControl as any);
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

  it('rejects a strip request that is not a list of paths', async () => {
    await expect(controller.stripMods(req, 'srv', 'a.zip', {})).rejects.toThrow(BadRequestException);
    await expect(controller.stripMods(req, 'srv', 'a.zip', { entries: [1] as unknown as string[] })).rejects.toThrow(BadRequestException);
  });
});
