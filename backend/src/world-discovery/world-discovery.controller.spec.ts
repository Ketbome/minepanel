import { WorldDiscoveryController } from './world-discovery.controller';

describe('WorldDiscoveryController', () => {
  const req = { user: { userId: 7 } };
  let service: Record<string, jest.Mock>;
  let controller: WorldDiscoveryController;

  beforeEach(() => {
    service = {
      listLibraryWorlds: jest.fn().mockResolvedValue(['w']),
      searchCurseForgeWorlds: jest.fn().mockResolvedValue('cf'),
      importFromCurseForge: jest.fn().mockResolvedValue('imported-cf'),
      importFromUrl: jest.fn().mockResolvedValue('imported-url'),
      getCurseForgeWorldDetails: jest.fn().mockResolvedValue('details'),
    };
    controller = new WorldDiscoveryController(service as any);
  });

  it('lists the library and searches CurseForge only', async () => {
    expect(await controller.listLibraryWorlds()).toEqual(['w']);
    expect(await controller.searchWorlds(req, { provider: 'curseforge', q: 'sky', pageSize: 5, index: 0 } as any)).toBe('cf');
    expect(service.searchCurseForgeWorlds).toHaveBeenCalledWith(7, { q: 'sky', pageSize: 5, index: 0 });
    expect(await controller.searchWorlds(req, { provider: 'other' } as any)).toEqual({ data: [], pagination: { index: 0, pageSize: 0, resultCount: 0, totalCount: 0 } });
  });

  it('routes imports by provider', async () => {
    expect(await controller.importWorld(req, { provider: 'curseforge', projectId: '1', fileId: 2, targetFolder: 'f' } as any)).toBe('imported-cf');
    expect(service.importFromCurseForge).toHaveBeenCalledWith(7, { projectId: '1', fileId: 2, targetFolder: 'f' });
    expect(await controller.importWorld(req, { provider: 'url', downloadUrl: 'https://x/w.zip', fileName: 'w.zip' } as any)).toBe('imported-url');
    expect(service.importFromUrl).toHaveBeenCalledWith({ downloadUrl: 'https://x/w.zip', fileName: 'w.zip', targetFolder: undefined });
    expect(await controller.getCurseForgeWorldDetails(req, '9')).toBe('details');
    expect(service.getCurseForgeWorldDetails).toHaveBeenCalledWith(7, '9');
  });
});
