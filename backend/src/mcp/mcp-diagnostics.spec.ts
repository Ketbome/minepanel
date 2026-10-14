import { diagnose, errorLines, findProblems, waitForServer } from './mcp-diagnostics';
import { PanelApiError } from './panel-api';

const routes = (table: Record<string, unknown>) => ({
  request: jest.fn(async ({ path }: { path: string }) => {
    const value = table[path];
    if (value instanceof Error) throw value;
    if (value === undefined) throw new PanelApiError(404, '404: Not found');
    return typeof value === 'function' ? value() : value;
  }),
});

describe('findProblems', () => {
  it('names the client-only mod in a NeoForge crash', () => {
    const log = [
      '[main/ERROR] Failed to load mods',
      '-- Mod loading issue for: oculus --',
      'Mod File: /data/mods/oculus-mc1.21-1.7.0.jar',
      'java.lang.RuntimeException: Attempted to load class net/minecraft/client/gui/screens/Screen for invalid dist DEDICATED_SERVER',
    ].join('\n');

    expect(findProblems(log)).toEqual([expect.objectContaining({ kind: 'client_only_mod', mods: ['oculus', 'oculus-mc1.21-1.7.0.jar'], evidence: expect.stringContaining('invalid dist') })]);
  });

  it('reads Fabric dependency errors and mixin failures', () => {
    const log = [
      'Incompatible mods found!',
      " - Mod 'Sodium Extra' (sodium-extra) 0.5.4 requires any version of sodium, which is missing!",
      'Mixin apply failed iris.mixins.json:MixinGameRenderer -> net.minecraft.class_757: from mod iris',
    ].join('\n');

    const problems = findProblems(log);
    expect(problems.map((problem) => problem.kind)).toEqual(['missing_dependency', 'mixin_failure']);
    expect(problems[0].mods).toEqual(expect.arrayContaining(['sodium-extra', 'sodium']));
    expect(problems[1].mods).toEqual(['iris']);
  });

  it('names both the mod and the dependency it lacks', () => {
    const log = [
      '[main/ERROR]: Incompatible mods found!',
      " - Mod 'Chunky' (chunky) 1.4.23 requires any version of fabric-api, which is missing!",
      'A potential solution has been determined, this may resolve your problem:',
      '\t - Install fabric-api, any version.',
    ].join('\n');

    expect(findProblems(log)[0].mods).toEqual(['chunky', 'fabric-api']);
  });

  it.each([
    ['java_version', 'java.lang.UnsupportedClassVersionError: has been compiled by a more recent version of the Java Runtime'],
    ['out_of_memory', 'java.lang.OutOfMemoryError: Java heap space'],
    ['port_in_use', '**** FAILED TO BIND TO PORT!'],
    ['duplicate_mod', 'Found duplicate mods: jei'],
  ])('recognises %s', (kind, line) => {
    expect(findProblems(`noise\n${line}`)).toEqual([expect.objectContaining({ kind, mods: [] })]);
  });

  it('finds nothing in a clean log', () => {
    expect(findProblems('[Server thread/INFO]: Done (3.2s)! For help, type "help"')).toEqual([]);
  });
});

describe('errorLines', () => {
  it('keeps the last error-looking lines', () => {
    expect(errorLines('ok\n[ERROR] a\nCaused by: b\nfine')).toEqual(['[ERROR] a', 'Caused by: b']);
  });
});

describe('diagnose', () => {
  it('combines status, problems, errors and the newest crash report', async () => {
    const api = routes({
      '/servers/srv/status': { status: 'stopped' },
      '/servers/srv/logs': { logs: 'boot\n[ERROR] OutOfMemoryError: Java heap space' },
      '/files/srv/list': [
        { name: 'crash-2026-10-01.txt', modified: '2026-10-01T00:00:00.000Z', isDirectory: false },
        { name: 'crash-2026-10-02.txt', modified: '2026-10-02T00:00:00.000Z', isDirectory: false },
        { name: 'old', isDirectory: true },
      ],
      '/files/srv/read': { content: 'Description: Mod loading\nAttempted to load class net/minecraft/client/Minecraft for invalid dist DEDICATED_SERVER' },
    });

    const result = await diagnose(api as any, 'srv');

    expect(result.status).toBe('stopped');
    expect(result.problems.map((problem) => problem.kind)).toEqual(['out_of_memory', 'client_only_mod']);
    expect(result.errorLines).toEqual(['[ERROR] OutOfMemoryError: Java heap space']);
    expect(result.crashReport).toMatchObject({ file: 'crash-2026-10-02.txt' });
    expect(api.request).toHaveBeenCalledWith({ method: 'GET', path: '/files/srv/read', query: { path: 'crash-reports/crash-2026-10-02.txt' } });
  });

  it('copes with missing logs, status and crash reports', async () => {
    const result = await diagnose(routes({}) as any, 'srv');
    expect(result).toMatchObject({ status: 'unknown', problems: [], errorLines: [], crashReport: null });

    const unreadable = await diagnose(routes({ '/files/srv/list': [{ name: 'c.txt', isDirectory: false }], '/files/srv/read': new Error('403') }) as any, 'srv');
    expect(unreadable.crashReport).toBeNull();
  });
});

describe('waitForServer', () => {
  it('returns ready once the game answers', async () => {
    const stats = [{ status: 'starting' }, { status: 'running', gameReachable: false }, { status: 'running', gameReachable: true, version: '1.21.1', playersOnline: 0 }];
    const api = routes({ '/servers/srv/runtime-stats': () => stats.shift() });

    expect(await waitForServer(api as any, 'srv', 60_000, 0)).toEqual({ state: 'ready', status: 'running', version: '1.21.1', playersOnline: 0 });
  });

  it('diagnoses a server that stopped', async () => {
    const api = routes({ '/servers/srv/runtime-stats': { status: 'stopped' }, '/servers/srv/logs': { logs: '**** FAILED TO BIND TO PORT!' } });
    const result = await waitForServer(api as any, 'srv', 60_000, 0);

    expect(result).toMatchObject({ state: 'stopped', problems: [expect.objectContaining({ kind: 'port_in_use' })] });
  });

  it('gives up at the timeout with what it found so far', async () => {
    const api = routes({ '/servers/srv/runtime-stats': { status: 'running', gameReachable: false } });
    const result = await waitForServer(api as any, 'srv', 0, 1);

    expect(result).toMatchObject({ state: 'still_starting', hint: expect.stringContaining('wait_for_server again') });
  });

  it('keeps polling while stats are unavailable', async () => {
    const stats: unknown[] = [new Error('busy'), { status: 'running', gameReachable: true }];
    const api = routes({
      '/servers/srv/runtime-stats': () => {
        const next = stats.shift();
        if (next instanceof Error) throw next;
        return next;
      },
    });

    expect((await waitForServer(api as any, 'srv', 60_000, 1)).state).toBe('ready');
  });
});
