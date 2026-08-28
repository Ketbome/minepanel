import { BedrockAddonsController } from './bedrock-addons.controller';

describe('BedrockAddonsController', () => {
  const req = { user: { userId: 3 } };
  let service: Record<string, jest.Mock>;
  let accessControl: { assertServerAccess: jest.Mock };
  let controller: BedrockAddonsController;

  beforeEach(() => {
    service = {
      listAddons: jest.fn().mockResolvedValue('list'),
      importUploadedAddon: jest.fn().mockResolvedValue('uploaded'),
      searchCurseForgeAddons: jest.fn().mockResolvedValue('search'),
      importCurseForgeAddon: jest.fn().mockResolvedValue('imported'),
      reorderAddons: jest.fn().mockResolvedValue('ordered'),
      setAddonEnabled: jest.fn().mockResolvedValue('toggled'),
      deleteAddon: jest.fn().mockResolvedValue('deleted'),
    };
    accessControl = { assertServerAccess: jest.fn() };
    controller = new BedrockAddonsController(service as any, { getRequiredUserById: jest.fn().mockResolvedValue({ id: 3 }) } as any, accessControl as any);
  });

  it('checks server access on every route and delegates', async () => {
    const file = { originalname: 'a.mcaddon' } as Express.Multer.File;
    expect(await controller.listAddons(req, 'bed')).toBe('list');
    expect(await controller.uploadAddon(req, 'bed', file)).toBe('uploaded');
    expect(await controller.searchCurseForgeAddons(req, 'bed', { q: 'x' } as any)).toBe('search');
    expect(service.searchCurseForgeAddons).toHaveBeenCalledWith(3, 'bed', { q: 'x' });
    expect(await controller.importCurseForgeAddon(req, 'bed', { projectId: '1' } as any, 'true')).toBe('imported');
    expect(service.importCurseForgeAddon).toHaveBeenCalledWith(3, 'bed', { projectId: '1' }, true);
    expect(await controller.reorderAddons(req, 'bed', { addonIds: ['a'] })).toBe('ordered');
    expect(await controller.enableAddon(req, 'bed', 'a')).toBe('toggled');
    expect(service.setAddonEnabled).toHaveBeenLastCalledWith('bed', 'a', true);
    expect(await controller.disableAddon(req, 'bed', 'a')).toBe('toggled');
    expect(service.setAddonEnabled).toHaveBeenLastCalledWith('bed', 'a', false);
    expect(await controller.deleteAddon(req, 'bed', 'a')).toBe('deleted');
    expect(accessControl.assertServerAccess).toHaveBeenCalledTimes(8);
    expect(accessControl.assertServerAccess).toHaveBeenCalledWith({ id: 3 }, 'bed');
  });
});
