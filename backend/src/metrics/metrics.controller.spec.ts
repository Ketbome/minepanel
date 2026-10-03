import { MetricsController } from './metrics.controller';

describe('MetricsController', () => {
  const req = { user: { userId: 1 } };
  let metrics: { getHistory: jest.Mock };
  let controller: MetricsController;

  beforeEach(() => {
    metrics = { getHistory: jest.fn().mockResolvedValue(['p']) };
    controller = new MetricsController(metrics as any, { getRequiredUserById: jest.fn().mockResolvedValue({ id: 1 }) } as any, { assertServerAccess: jest.fn() } as any, { getSnapshot: jest.fn().mockResolvedValue({ tps: 20 }) } as any, { record: jest.fn() } as any);
  });

  it('returns live monitoring', async () => {
    expect(await controller.getLive(req, 'srv')).toEqual({ tps: 20 });
  });

  it('denies live monitoring before collecting another user’s server data', async () => {
    const getSnapshot = jest.fn();
    const restricted = new MetricsController(metrics as any,
      { getRequiredUserById: jest.fn().mockResolvedValue({ id: 1 }) } as any,
      { assertServerAccess: jest.fn(() => { throw new Error('Forbidden'); }) } as any,
      { getSnapshot } as any, { record: jest.fn() } as any);
    await expect(restricted.getLive(req, 'other-server')).rejects.toThrow('Forbidden');
    expect(getSnapshot).not.toHaveBeenCalled();
  });

  it('clamps the hours window', async () => {
    expect(await controller.getHistory(req, 'srv')).toEqual({ serverId: 'srv', hours: 24, points: ['p'] });
    expect((await controller.getHistory(req, 'srv', '500')).hours).toBe(168);
    expect((await controller.getHistory(req, 'srv', '0')).hours).toBe(1);
    expect((await controller.getHistory(req, 'srv', 'abc')).hours).toBe(24);
    expect(metrics.getHistory).toHaveBeenLastCalledWith('srv', 24);
  });

  describe('testTickCommand', () => {
    const testTick = jest.fn().mockResolvedValue({ success: true, output: 'x', parsed: null });
    const record = jest.fn();
    const build = (admin: boolean) => new MetricsController(metrics as any, { getRequiredUserById: jest.fn().mockResolvedValue({ id: 1, username: 'root' }) } as any, { isAdmin: jest.fn(() => admin) } as any, { testTickCommand: testTick } as any, { record } as any);

    beforeEach(() => {
      record.mockClear();
      testTick.mockClear();
    });

    it('records the command it ran, like the console does', async () => {
      await build(true).testTickCommand(req, 'srv', { tickCommand: ' tickinfo ' });
      expect(record).toHaveBeenCalledWith(expect.objectContaining({ actorUserId: 1, actorUsername: 'root', category: 'servers', action: 'test_tick_command', outcome: 'success', serverId: 'srv', summary: 'Tested metrics tick command on srv: tickinfo', metadata: { command: 'tickinfo' } }));
    });

    it('records a failed run too, and nothing when it never ran', async () => {
      testTick.mockRejectedValueOnce(new Error('boom'));
      await expect(build(true).testTickCommand(req, 'srv', { tickCommand: 'x' })).rejects.toThrow('boom');
      expect(record).toHaveBeenCalledWith(expect.objectContaining({ action: 'test_tick_command', outcome: 'error' }));
      record.mockClear();
      await expect(build(false).testTickCommand(req, 'srv', { tickCommand: 'x' })).rejects.toThrow('Only admin');
      await expect(build(true).testTickCommand(req, 'srv', { tickCommand: 'x', tickTpsPattern: '(' })).rejects.toThrow('regular expressions');
      expect(record).not.toHaveBeenCalled();
    });

    it('is admin only', async () => {
      await expect(build(false).testTickCommand(req, 'srv', { tickCommand: 'tickinfo' })).rejects.toThrow('Only admin');
      expect(testTick).not.toHaveBeenCalled();
    });

    it('runs the trimmed command with its candidate patterns', async () => {
      await build(true).testTickCommand(req, 'srv', { tickCommand: ' tickinfo ', tickTpsPattern: 'TPS: ([\\d.]+)' });
      expect(testTick).toHaveBeenCalledWith('srv', 'tickinfo', { tps: 'TPS: ([\\d.]+)', mspt: undefined });
    });

    it('rejects a slow pattern before running anything', async () => {
      testTick.mockClear();
      await expect(build(true).testTickCommand(req, 'srv', { tickCommand: 'x', tickTpsPattern: '(a+)+$' })).rejects.toThrow('too slow');
      expect(testTick).not.toHaveBeenCalled();
    });

    it('requires a command and valid patterns', async () => {
      await expect(build(true).testTickCommand(req, 'srv', { tickCommand: '  ' })).rejects.toThrow('tickCommand is required');
      await expect(build(true).testTickCommand(req, 'srv', { tickCommand: 'x', tickMsptPattern: 'no group' })).rejects.toThrow('regular expressions');
    });
  });
});
