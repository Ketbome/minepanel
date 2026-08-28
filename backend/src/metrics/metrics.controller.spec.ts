import { MetricsController } from './metrics.controller';

describe('MetricsController', () => {
  const req = { user: { userId: 1 } };
  let metrics: { getHistory: jest.Mock };
  let controller: MetricsController;

  beforeEach(() => {
    metrics = { getHistory: jest.fn().mockResolvedValue(['p']) };
    controller = new MetricsController(metrics as any, { getRequiredUserById: jest.fn().mockResolvedValue({ id: 1 }) } as any, { assertServerAccess: jest.fn() } as any);
  });

  it('clamps the hours window', async () => {
    expect(await controller.getHistory(req, 'srv')).toEqual({ serverId: 'srv', hours: 24, points: ['p'] });
    expect((await controller.getHistory(req, 'srv', '500')).hours).toBe(168);
    expect((await controller.getHistory(req, 'srv', '0')).hours).toBe(1);
    expect((await controller.getHistory(req, 'srv', 'abc')).hours).toBe(24);
    expect(metrics.getHistory).toHaveBeenLastCalledWith('srv', 24);
  });
});
