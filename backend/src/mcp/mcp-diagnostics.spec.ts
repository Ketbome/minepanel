import { diagnose, waitForServer } from './mcp-diagnostics';
import { PanelApiError } from './panel-api';

const routes = (table: Record<string, unknown>) => ({
  request: jest.fn(async ({ path }: { path: string }) => {
    const value = table[path];
    if (value instanceof Error) throw value;
    if (value === undefined) throw new PanelApiError(404, '404: Not found');
    return typeof value === 'function' ? value() : value;
  }),
});

const diagnosis = (kind = 'port_in_use') => ({ status: 'stopped', problems: [{ kind, evidence: 'line', mods: [] }], errorLines: [], crashReport: null, logTail: '' });

describe('diagnose', () => {
  it('adds the agent fix to each problem from the panel diagnosis', async () => {
    const api = routes({ '/servers/srv/diagnosis': diagnosis('client_only_mod') });
    const result = await diagnose(api as any, 'srv');

    expect(result).toMatchObject({ status: 'stopped', problems: [{ kind: 'client_only_mod', fix: expect.stringContaining('remove_mods') }] });
  });

  it('surfaces API errors', async () => {
    await expect(diagnose(routes({ '/servers/srv/diagnosis': new PanelApiError(403, '403: no logs') }) as any, 'srv')).rejects.toThrow('403');
  });
});

describe('waitForServer', () => {
  it('returns ready once the game answers', async () => {
    const stats = [{ status: 'starting' }, { status: 'running', gameReachable: false }, { status: 'running', gameReachable: true, version: '1.21.1', playersOnline: 0 }];
    const api = routes({ '/servers/srv/runtime-stats': () => stats.shift() });

    expect(await waitForServer(api as any, 'srv', 60_000, 0)).toEqual({ state: 'ready', status: 'running', version: '1.21.1', playersOnline: 0 });
  });

  it('diagnoses a server that stopped', async () => {
    const api = routes({ '/servers/srv/runtime-stats': { status: 'stopped' }, '/servers/srv/diagnosis': diagnosis() });
    const result = await waitForServer(api as any, 'srv', 60_000, 0);

    expect(result).toMatchObject({ state: 'stopped', problems: [expect.objectContaining({ kind: 'port_in_use' })] });
  });

  it('gives up at the timeout with what it found so far', async () => {
    const api = routes({ '/servers/srv/runtime-stats': { status: 'running', gameReachable: false }, '/servers/srv/diagnosis': diagnosis() });
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
