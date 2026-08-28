import { BadRequestException } from '@nestjs/common';
import { CurseforgeController } from './curseforge.controller';

describe('CurseforgeController', () => {
  const req = { user: { userId: 1 } };
  let service: Record<string, jest.Mock>;
  let settings: { getCfApiKey: jest.Mock };
  let controller: CurseforgeController;

  beforeEach(() => {
    service = {
      searchModpacks: jest.fn().mockResolvedValue('search'),
      getFeaturedModpacks: jest.fn().mockResolvedValue('featured'),
      getPopularModpacks: jest.fn().mockResolvedValue('popular'),
      searchMods: jest.fn().mockResolvedValue('mods'),
      getModCategories: jest.fn().mockResolvedValue(['c']),
      resolveMods: jest.fn().mockResolvedValue(['m']),
      resolveModpack: jest.fn().mockResolvedValue({ id: 1 }),
      getModpackFiles: jest.fn().mockResolvedValue(['f']),
      getLatestVersions: jest.fn().mockResolvedValue(['l']),
      resolveModFiles: jest.fn().mockResolvedValue(['r']),
      getModVersions: jest.fn().mockResolvedValue(['v']),
      getModpack: jest.fn().mockResolvedValue({ id: 2 }),
    };
    settings = { getCfApiKey: jest.fn().mockResolvedValue('key') };
    controller = new CurseforgeController(service as any, settings as any);
  });

  it('rejects when no api key is configured', async () => {
    settings.getCfApiKey.mockResolvedValue('');
    await expect(controller.searchModpacks(req)).rejects.toThrow(BadRequestException);
  });

  it('parses modpack search params with defaults', async () => {
    expect(await controller.searchModpacks(req)).toBe('search');
    expect(service.searchModpacks).toHaveBeenCalledWith('key', undefined, 20, 0, 2, 'desc');
    await controller.searchModpacks(req, 'atm', '5', '10', '4', 'asc');
    expect(service.searchModpacks).toHaveBeenLastCalledWith('key', 'atm', 5, 10, 4, 'asc');
  });

  it('parses featured/popular limits', async () => {
    expect(await controller.getFeaturedModpacks(req)).toBe('featured');
    expect(service.getFeaturedModpacks).toHaveBeenCalledWith('key', 10);
    expect(await controller.getPopularModpacks(req, '3')).toBe('popular');
    expect(service.getPopularModpacks).toHaveBeenCalledWith('key', 3);
  });

  it('forwards mod queries', async () => {
    const query = { q: 'jei', pageSize: 5, index: 0, minecraftVersion: '1.20.1', loader: 'forge', sort: 'relevance', category: '1' } as any;
    expect(await controller.searchMods(req, query)).toBe('mods');
    expect(service.searchMods).toHaveBeenCalledWith('key', query);

    expect(await controller.getModCategories(req)).toEqual({ data: ['c'] });
    expect(await controller.resolveMods(req, 'a,b')).toEqual({ data: ['m'] });
    expect(service.resolveMods).toHaveBeenCalledWith('key', ['a', 'b']);
    expect(await controller.resolveMods(req)).toEqual({ data: ['m'] });
    expect(service.resolveMods).toHaveBeenLastCalledWith('key', ['']);
  });

  it('forwards modpack and version lookups', async () => {
    expect(await controller.resolveModpack(req, 'atm')).toEqual({ id: 1 });
    expect(await controller.getModpackFiles(req, 'atm')).toEqual({ data: ['f'] });
    expect(await controller.getLatestModVersions(req, { minecraftVersion: '1.20.1', loader: 'forge' } as any, '1,2')).toEqual({ data: ['l'] });
    expect(service.getLatestVersions).toHaveBeenCalledWith('key', ['1', '2'], { minecraftVersion: '1.20.1', loader: 'forge' });
    expect(await controller.getLatestModVersions(req, {} as any)).toEqual({ data: ['l'] });
    expect(await controller.resolveModFiles(req, '7')).toEqual({ data: ['r'] });
    expect(await controller.resolveModFiles(req)).toEqual({ data: ['r'] });
    expect(await controller.getModVersions(req, 'jei', { minecraftVersion: '1.20.1' } as any)).toEqual({ data: ['v'] });
    expect(await controller.getModpack(req, '2')).toEqual({ id: 2 });
    expect(service.getModpack).toHaveBeenCalledWith('key', 2);
  });
});
