import { ModrinthController } from './modrinth.controller';

describe('ModrinthController', () => {
  let service: Record<string, jest.Mock>;
  let controller: ModrinthController;

  beforeEach(() => {
    service = {
      searchMods: jest.fn().mockResolvedValue('search'),
      getModCategories: jest.fn().mockResolvedValue(['c']),
      resolveProjects: jest.fn().mockResolvedValue(['p']),
      getLatestVersions: jest.fn().mockResolvedValue(['l']),
      resolveVersions: jest.fn().mockResolvedValue(['v']),
      getProjectVersions: jest.fn().mockResolvedValue(['pv']),
    };
    controller = new ModrinthController(service as any);
  });

  it('forwards queries and splits comma lists', async () => {
    const query = { q: 'sodium', limit: 5, offset: 0, minecraftVersion: '1.21', loader: 'fabric', projectType: 'mod', sort: 'relevance', category: 'x' } as any;
    expect(await controller.searchMods(query)).toBe('search');
    expect(service.searchMods).toHaveBeenCalledWith(query);
    expect(await controller.getModCategories({} as any)).toEqual({ data: ['c'] });
    expect(service.getModCategories).toHaveBeenCalledWith('mod');
    expect(await controller.resolveProjects('a,b')).toEqual({ data: ['p'] });
    expect(service.resolveProjects).toHaveBeenCalledWith(['a', 'b']);
    expect(await controller.resolveProjects()).toEqual({ data: ['p'] });
    expect(await controller.getLatestProjectVersions({ minecraftVersion: '1.21' } as any, 'a')).toEqual({ data: ['l'] });
    expect(await controller.getLatestProjectVersions({} as any)).toEqual({ data: ['l'] });
    expect(await controller.resolveVersions('v1')).toEqual({ data: ['v'] });
    expect(await controller.resolveVersions()).toEqual({ data: ['v'] });
    expect(await controller.getProjectVersions('sodium', { loader: 'fabric' } as any)).toEqual({ data: ['pv'] });
    expect(service.getProjectVersions).toHaveBeenCalledWith('sodium', { minecraftVersion: undefined, loader: 'fabric' });
  });
});
