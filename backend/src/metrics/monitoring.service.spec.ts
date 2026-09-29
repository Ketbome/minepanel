import { CUSTOM_TICK_FAILURE_LIMIT, CUSTOM_TICK_PAUSE_MS, MonitoringService } from './monitoring.service';

const output = '> TPS from last 5s, 10s, 1m, 5m, 15m:\n20, 20, 19.5, 20, 20\n> Tick durations (min/med/95%ile/max ms) from last 10s, 1m:\n1/25/65/120; 1/20/50/100';
const tabTps = 'TPS: 20.00 (5s), 19.50 (1m), 20.00 (5m)MSPT - Average, Minimum, Maximum └─ 60s - 0.20, 0.04, 38.49';
const runtime = { status: 'running', cpuUsage: '150%', memoryUsage: '2GiB', memoryLimit: '8GiB', playersOnline: 3, playersMax: 20, uptimeSeconds: 100 } as any;

describe('MonitoringService', () => {
  let management: { getServerRuntimeStats: jest.Mock; readTickStats: jest.Mock; readTickCommand: jest.Mock };
  let store: { readConfig: jest.Mock };
  let service: MonitoringService;

  beforeEach(() => {
    management = { getServerRuntimeStats: jest.fn().mockResolvedValue(runtime), readTickStats: jest.fn().mockResolvedValue({ success: true, output }), readTickCommand: jest.fn().mockResolvedValue({ success: true, output: tabTps }) };
    store = { readConfig: jest.fn().mockResolvedValue({ edition: 'JAVA', serverType: 'FABRIC', enableRcon: true, rconPort: '25575', rconPassword: 'secret' }) };
    service = new MonitoringService(management as any, store as any);
  });

  afterEach(() => jest.restoreAllMocks());

  it('monitors CurseForge without treating AUTO_CURSEFORGE as a loader or exposing credentials', async () => {
    store.readConfig.mockResolvedValue({ edition: 'JAVA', serverType: 'AUTO_CURSEFORGE', enableRcon: true, rconPort: '25575', rconPassword: 'secret' });
    management.readTickStats.mockResolvedValueOnce({ success: true, output: 'Unknown command' });
    expect(await service.getSnapshot('atm10')).toMatchObject({ cpuPercent: 150, memoryMb: 2048, memoryLimitMb: 8192, tps: 19.5, msptMedian: 25, msptP95: 65, tickStatus: 'available', playersOnline: 3 });
    expect(management.readTickStats).toHaveBeenCalledWith('atm10', 'spark', '25575', 'secret');
  });

  it('prefers native NeoForge data for ATM10 and labels its estimated TPS source', async () => {
    store.readConfig.mockResolvedValue({ edition: 'JAVA', serverType: 'AUTO_CURSEFORGE', enableRcon: true, rconPort: '25575', rconPassword: 'secret' });
    management.readTickStats.mockResolvedValue({ success: true, output: 'minecraft:overworld: 20 TPS (1 ms/tick) Overall: 16 TPS (62.5 ms/tick)' });
    expect(await service.getSnapshot('atm10')).toMatchObject({ tickSource: 'neoforge', tps: 16, msptMean: 62.5, msptMedian: null, msptP95: null });
    expect(management.readTickStats).toHaveBeenCalledTimes(1);
    expect(management.readTickStats).toHaveBeenCalledWith('atm10', 'neoforge', '25575', 'secret');
  });

  it('falls back to the default RCON port when none is configured', async () => {
    store.readConfig.mockResolvedValue({ edition: 'JAVA', serverType: 'FABRIC', enableRcon: true });
    await service.getSnapshot('atm10');
    expect(management.readTickStats).toHaveBeenCalledWith('atm10', 'spark', '25575', undefined);
  });

  it('falls back to spark after a failed native NeoForge probe', async () => {
    store.readConfig.mockResolvedValue({ edition: 'JAVA', serverType: 'NEOFORGE', enableRcon: true, rconPort: '25575', rconPassword: 'secret' });
    management.readTickStats.mockResolvedValue({ success: false, output: '' });
    expect(await service.getSnapshot('atm10')).toMatchObject({ tickStatus: 'unavailable', tickSource: null });
    expect(management.readTickStats).toHaveBeenCalledTimes(2);
    expect(management.readTickStats).toHaveBeenNthCalledWith(1, 'atm10', 'neoforge', '25575', 'secret');
    expect(management.readTickStats).toHaveBeenNthCalledWith(2, 'atm10', 'spark', '25575', 'secret');
  });

  it('deduplicates concurrent live/history requests and caches the result', async () => {
    const [first, second] = await Promise.all([service.getSnapshot('atm10'), service.getSnapshot('atm10')]);
    expect(first).toBe(second);
    expect(await service.getSnapshot('atm10')).toBe(first);
    expect(management.readTickStats).toHaveBeenCalledTimes(1);
  });

  it('expires results and evicts old cache entries', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(100_000);
    await service.getSnapshot('old');
    now.mockReturnValue(111_000);
    await service.getSnapshot('new');
    expect((service as any).cache.has('old')).toBe(false);
    await service.getSnapshot('old');
    expect(management.readTickStats).toHaveBeenCalledTimes(3);
  });

  it('accepts batched runtime data and invalidates cached values when the server stops', async () => {
    await service.getSnapshot('atm10', runtime);
    const result = await service.getSnapshot('atm10', { ...runtime, status: 'stopped', playersOnline: null });
    expect(result).toMatchObject({ tickStatus: 'offline', tps: null, cpuPercent: null, memoryMb: null });
    expect(management.getServerRuntimeStats).not.toHaveBeenCalled();
    expect(management.readTickStats).toHaveBeenCalledTimes(1);
  });

  it.each([
    [{ edition: 'BEDROCK', enableRcon: false }, 'unsupported'],
    [{ edition: 'JAVA', enableRcon: false }, 'rcon_disabled'],
    [null, 'unavailable'],
  ])('skips RCON for unsupported configurations', async (config, tickStatus) => {
    store.readConfig.mockResolvedValue(config);
    expect(await service.getSnapshot('atm10')).toMatchObject({ tickStatus, tps: null });
    expect(management.readTickStats).not.toHaveBeenCalled();
  });

  it.each([
    [{ success: true, output: 'Unknown or incomplete command, see below for error' }, 'spark_missing'],
    [{ success: true, output: 'You do not have permission' }, 'unavailable'],
    [{ success: true, output: 'different spark version' }, 'unavailable'],
    [{ success: false, output: 'connection refused' }, 'unavailable'],
  ])('keeps missing/failed game metrics null while preserving resource data', async (response, tickStatus) => {
    management.readTickStats.mockResolvedValue(response);
    expect(await service.getSnapshot('atm10')).toMatchObject({ tickStatus, tps: null, msptMedian: null, cpuPercent: 150 });
  });

  it('preserves container data if config or probe fails', async () => {
    store.readConfig.mockRejectedValue(new Error('disk read failed'));
    expect(await service.getSnapshot('atm10')).toMatchObject({ tickStatus: 'unavailable', memoryMb: 2048 });
  });

  it('clears in-flight state after a failed runtime request so retry works', async () => {
    management.getServerRuntimeStats.mockRejectedValueOnce(new Error('offline'));
    await expect(service.getSnapshot('atm10')).rejects.toThrow('offline');
    expect((await service.getSnapshot('atm10')).tickStatus).toBe('available');
  });

  it.each(['../data', '.world', 'a/b', ''])('rejects invalid server ids before IO', async (id) => {
    await expect(service.getSnapshot(id)).rejects.toThrow('Invalid server ID');
    expect(management.getServerRuntimeStats).not.toHaveBeenCalled();
  });

  describe('custom tick command', () => {
    const customConfig = { edition: 'JAVA', serverType: 'PAPER', enableRcon: true, rconPort: '25580', rconPassword: 'secret', tickCommand: 'tickinfo' };

    it('replaces the built-in probes and auto-detects the reply format', async () => {
      store.readConfig.mockResolvedValue(customConfig);
      expect(await service.getSnapshot('atm10')).toMatchObject({ tickStatus: 'available', tickSource: 'tabtps', tps: 19.5, msptMean: 0.2, msptMedian: null });
      expect(management.readTickCommand).toHaveBeenCalledWith('atm10', 'tickinfo', '25580', 'secret');
      expect(management.readTickStats).not.toHaveBeenCalled();
    });

    it('uses explicit patterns and reports the source as custom', async () => {
      store.readConfig.mockResolvedValue({ ...customConfig, tickTpsPattern: '1m\\)?: ?([\\d.]+)' });
      management.readTickCommand.mockResolvedValue({ success: true, output: 'tps 1m: 18.5' });
      expect(await service.getSnapshot('atm10')).toMatchObject({ tickSource: 'custom', tps: 18.5, msptMean: null });
    });

    it.each([{ success: false, output: '' }, { success: true, output: '' }, { success: true, output: 'Unknown command' }])('reports unavailable, never guesses: %j', async (reply) => {
      store.readConfig.mockResolvedValue(customConfig);
      management.readTickCommand.mockResolvedValue(reply);
      expect(await service.getSnapshot('atm10')).toMatchObject({ tickStatus: 'unavailable', tickSource: null, tps: null });
      expect(management.readTickStats).not.toHaveBeenCalled();
    });
  });

  describe('custom tick circuit breaker', () => {
    const config = { edition: 'JAVA', serverType: 'PAPER', enableRcon: true, rconPort: '25575', tickCommand: 'tickinfo' };
    // getSnapshot caches for 10s; go through the private collector to poll on every call.
    const poll = (id = 'atm10') => (service as any).collect(id, runtime);
    let now: number;

    beforeEach(() => {
      store.readConfig.mockResolvedValue(config);
      now = 1_000_000;
      jest.spyOn(Date, 'now').mockImplementation(() => now);
    });

    const failLimitTimes = async (reply: any) => {
      management.readTickCommand.mockResolvedValue(reply);
      for (let i = 0; i < CUSTOM_TICK_FAILURE_LIMIT; i++) expect((await poll()).tickStatus).toBe('unavailable');
    };

    it.each([{ success: true, output: '' }, { success: true, output: 'Unknown command' }])('pauses after repeated unusable replies: %j', async (reply) => {
      await failLimitTimes(reply);
      management.readTickCommand.mockClear();
      expect(await poll()).toMatchObject({ tickStatus: 'custom_paused', tps: null });
      expect(management.readTickCommand).not.toHaveBeenCalled();
    });

    it('pauses a pattern that times out', async () => {
      store.readConfig.mockResolvedValue({ ...config, tickTpsPattern: '(a+)+$' });
      await failLimitTimes({ success: true, output: `${'a'.repeat(40)}!` });
      expect((await poll()).tickStatus).toBe('custom_paused');
    });

    it('does not count RCON connection failures, which is what a booting server looks like', async () => {
      management.readTickCommand.mockResolvedValue({ success: false, output: '' });
      for (let i = 0; i < CUSTOM_TICK_FAILURE_LIMIT * 2; i++) expect((await poll()).tickStatus).toBe('unavailable');
    });

    it('retries once after the pause and goes straight back to paused if it still fails', async () => {
      await failLimitTimes({ success: true, output: '' });
      now += CUSTOM_TICK_PAUSE_MS + 1;
      management.readTickCommand.mockClear();
      expect((await poll()).tickStatus).toBe('unavailable');
      expect(management.readTickCommand).toHaveBeenCalledTimes(1);
      expect((await poll()).tickStatus).toBe('custom_paused');
    });

    it('recovers on success and forgets earlier failures', async () => {
      await failLimitTimes({ success: true, output: '' });
      now += CUSTOM_TICK_PAUSE_MS + 1;
      management.readTickCommand.mockResolvedValue({ success: true, output: tabTps });
      expect((await poll()).tickStatus).toBe('available');
      management.readTickCommand.mockResolvedValue({ success: true, output: '' });
      for (let i = 0; i < CUSTOM_TICK_FAILURE_LIMIT - 1; i++) expect((await poll()).tickStatus).toBe('unavailable');
    });

    it('starts over when the command or a pattern changes', async () => {
      await failLimitTimes({ success: true, output: '' });
      store.readConfig.mockResolvedValue({ ...config, tickCommand: 'tps' });
      expect((await poll()).tickStatus).toBe('unavailable');
    });

    it('keeps servers independent, and a passing test resumes a paused command', async () => {
      await failLimitTimes({ success: true, output: '' });
      expect((await poll('other')).tickStatus).toBe('unavailable');
      store.readConfig.mockResolvedValue({ edition: 'JAVA', enableRcon: true });
      management.readTickCommand.mockResolvedValue({ success: true, output: tabTps });
      await service.testTickCommand('atm10', 'tickinfo');
      store.readConfig.mockResolvedValue(config);
      expect((await poll()).tickStatus).toBe('available');
    });
  });

  describe('testTickCommand', () => {
    beforeEach(() => store.readConfig.mockResolvedValue({ edition: 'JAVA', enableRcon: true, rconPassword: 'secret' }));

    it('returns the raw reply and what was parsed, using the default port', async () => {
      expect(await service.testTickCommand('atm10', 'tickinfo')).toMatchObject({ success: true, output: tabTps, parsed: { source: 'tabtps', tps: 19.5 } });
      expect(management.readTickCommand).toHaveBeenCalledWith('atm10', 'tickinfo', '25575', 'secret');
    });

    it('shows an empty reply as unparsed (the spark-over-RCON case) and a failure without parsing', async () => {
      management.readTickCommand.mockResolvedValueOnce({ success: true, output: '' });
      expect((await service.testTickCommand('atm10', 'spark tps')).parsed).toBeNull();
      management.readTickCommand.mockResolvedValueOnce({ success: false, output: '' });
      expect(await service.testTickCommand('atm10', 'x')).toEqual({ success: false, output: '', parsed: null });
    });

    it('rejects a candidate pattern that times out', async () => {
      management.readTickCommand.mockResolvedValueOnce({ success: true, output: `${'a'.repeat(40)}!` });
      await expect(service.testTickCommand('atm10', 'x', { tps: '(a+)+$' })).rejects.toThrow('too slow');
    });

    it('applies candidate patterns', async () => {
      management.readTickCommand.mockResolvedValueOnce({ success: true, output: 'tps=17' });
      expect((await service.testTickCommand('atm10', 'x', { tps: 'tps=(\\d+)' })).parsed).toMatchObject({ source: 'custom', tps: 17 });
    });

    it('rejects bad ids, missing servers, Bedrock and disabled RCON', async () => {
      await expect(service.testTickCommand('../x', 'x')).rejects.toThrow('Invalid server ID');
      store.readConfig.mockResolvedValueOnce(null);
      await expect(service.testTickCommand('atm10', 'x')).rejects.toThrow('not found');
      store.readConfig.mockResolvedValueOnce({ edition: 'BEDROCK', enableRcon: true });
      await expect(service.testTickCommand('atm10', 'x')).rejects.toThrow('RCON is required');
      store.readConfig.mockResolvedValueOnce({ edition: 'JAVA', enableRcon: false });
      await expect(service.testTickCommand('atm10', 'x')).rejects.toThrow('RCON is required');
    });
  });
});
