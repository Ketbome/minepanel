import { InstalledModsController } from './installed-mods.controller';

describe('InstalledModsController', () => {
  it('scans installed mods behind read access to server files', async () => {
    const service = { scanInstalledMods: jest.fn().mockResolvedValue({ mods: [], truncated: false }) };
    const users = { getRequestUser: jest.fn().mockResolvedValue({ id: 1 }) };
    const accessControl = { assertServerFiles: jest.fn() };
    const controller = new InstalledModsController(service as any, users as any, accessControl as any);

    expect(await controller.list({ user: { userId: 1 } }, 'srv')).toEqual({ mods: [], truncated: false });
    expect(accessControl.assertServerFiles).toHaveBeenCalledWith({ id: 1 }, 'srv', false);
    expect(service.scanInstalledMods).toHaveBeenCalledWith('srv');
  });
});
