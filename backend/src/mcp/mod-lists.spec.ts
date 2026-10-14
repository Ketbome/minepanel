import { addMods, entryRef, removeMods, splitEntries } from './mod-lists';
import { PanelApiError } from './panel-api';

const panel = (config: Record<string, unknown>, installed: unknown = { mods: [] }) => {
  const calls: Array<{ method: string; path: string; query?: unknown; body?: unknown }> = [];
  const failures = new Map<string, Error>();
  const api = {
    calls,
    failures,
    request: jest.fn(async (call: { method: string; path: string; query?: any; body?: unknown }) => {
      calls.push(call);
      const failure = failures.get(`${call.method} ${call.path}${call.query?.path ? `?${call.query.path}` : ''}`) ?? failures.get(`${call.method} ${call.path}`);
      if (failure) throw failure;
      if (call.method === 'GET' && call.path === '/servers/srv') return config;
      if (call.method === 'GET' && call.path === '/servers/srv/installed-mods') {
        if (installed instanceof Error) throw installed;
        return installed;
      }
      return { success: true };
    }),
  };
  return api;
};
const puts = (api: ReturnType<typeof panel>) => api.calls.filter((call) => call.method === 'PUT').map((call) => call.body);

describe('mod list grammar', () => {
  it('splits on commas and newlines', () => {
    expect(splitEntries(' a, b\n\nc ')).toEqual(['a', 'b', 'c']);
    expect(splitEntries(undefined)).toEqual([]);
  });

  it('extracts the project reference', () => {
    expect(entryRef('fabric-api:0.119.2')).toBe('fabric-api');
    expect(entryRef('datapack:terralith')).toBe('terralith');
    expect(entryRef('fabric:sodium?@beta')).toBe('sodium');
    expect(entryRef('jei:5101366')).toBe('jei');
    expect(entryRef('https://cdn.example/mod.jar')).toBe('https://cdn.example/mod.jar');
    expect(entryRef('@/data/mods.txt')).toBe('@/data/mods.txt');
  });
});

describe('addMods', () => {
  it('adds new mods and re-pins listed ones', async () => {
    const api = panel({ modrinthProjects: 'sodium\nfabric-api:0.100.0' });

    const result = await addMods(api as any, 'srv', 'modrinth', ['lithium', 'fabric-api:0.119.2', 'sodium']);

    expect(result.mods).toEqual([
      { mod: 'lithium', action: 'added' },
      { mod: 'fabric-api:0.119.2', action: 'replaced fabric-api:0.100.0' },
      { mod: 'sodium', action: 'already listed' },
    ]);
    expect(puts(api)).toEqual([{ modrinthProjects: 'sodium\nfabric-api:0.119.2\nlithium' }]);
  });

  it('writes CurseForge mods to cfFiles', async () => {
    const api = panel({});
    await addMods(api as any, 'srv', 'curseforge', ['jei:5101366']);
    expect(puts(api)).toEqual([{ cfFiles: 'jei:5101366' }]);
  });
});

describe('removeMods', () => {
  it('drops listed mods and deletes their jars', async () => {
    const api = panel({ serverType: 'FABRIC', modrinthProjects: 'sodium\nzoomify:2.1', cfFiles: 'jei' }, { mods: [{ fileName: 'zoomify-2.1.jar', modId: 'zoomify' }] });

    const result = await removeMods(api as any, 'srv', ['Zoomify']);

    expect(result.mods).toEqual([{ mod: 'Zoomify', actions: ['removed from modrinthProjects', 'deleted mods/zoomify-2.1.jar'] }]);
    expect(puts(api)).toEqual([{ modrinthProjects: 'sodium' }]);
    expect(api.calls).toContainEqual({ method: 'DELETE', path: '/files/srv/delete', query: { path: 'mods/zoomify-2.1.jar' } });
  });

  it('excludes CurseForge modpack mods and matches jars by file name', async () => {
    const api = panel({ serverType: 'AUTO_CURSEFORGE', cfExclude: 'blur' }, { mods: [{ fileName: 'oculus-mc1.21-1.7.0.jar' }] });

    const result = await removeMods(api as any, 'srv', ['oculus', 'blur']);

    expect(result.mods).toEqual([
      { mod: 'oculus', actions: ['added to cfExclude (modpack mod)', 'deleted mods/oculus-mc1.21-1.7.0.jar'] },
      { mod: 'blur', actions: ['not found in the mod lists or in mods/'] },
    ]);
    expect(puts(api)).toEqual([{ cfExclude: 'blur,oculus' }]);
  });

  it('excludes Modrinth modpack files through the env vars', async () => {
    const api = panel({ serverType: 'MODRINTH', envVars: 'FOO=1\nMODRINTH_EXCLUDE_FILES=a' });

    const result = await removeMods(api as any, 'srv', ['iris']);

    expect(result.mods[0].actions).toEqual(['added to MODRINTH_EXCLUDE_FILES (modpack mod)']);
    expect(puts(api)).toEqual([{ envVars: 'FOO=1\nMODRINTH_EXCLUDE_FILES=a,iris' }]);

    const fresh = panel({ serverType: 'MODRINTH' });
    await removeMods(fresh as any, 'srv', ['iris']);
    expect(puts(fresh)).toEqual([{ envVars: 'MODRINTH_EXCLUDE_FILES=iris' }]);
  });

  it('reports what it could not do', async () => {
    const api = panel({ serverType: 'MODRINTH' }, { mods: [{ fileName: 'iris-1.8.jar', modId: 'iris' }] });
    api.failures.set('PUT /servers/srv', new PanelApiError(403, '403: Only admins can change envVars'));
    api.failures.set('DELETE /files/srv/delete', new PanelApiError(403, '403: You do not have permission to manage server files'));

    const result = await removeMods(api as any, 'srv', ['iris']);

    expect(result.mods[0].actions).toEqual(['could not exclude from the modpack: 403: Only admins can change envVars', 'could not delete mods/iris-1.8.jar: 403: You do not have permission to manage server files']);
  });

  it('still edits the lists without access to the mods folder', async () => {
    const api = panel({ serverType: 'FABRIC', modrinthProjects: 'sodium' }, new PanelApiError(403, '403'));
    const result = await removeMods(api as any, 'srv', ['sodium']);
    expect(result.mods[0].actions).toEqual(['removed from modrinthProjects']);
  });
});
