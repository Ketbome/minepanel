import { AlertsController } from './alerts.controller';

describe('AlertsController', () => {
  it('reads and updates per-server alert config behind server access', async () => {
    const alerts = { getConfig: jest.fn().mockResolvedValue({ enabled: true }), updateConfig: jest.fn().mockResolvedValue({ enabled: false }) };
    const accessControl = { assertServerAccess: jest.fn() };
    const controller = new AlertsController(alerts as any, { getRequiredUserById: jest.fn().mockResolvedValue({ id: 1 }) } as any, accessControl as any);
    const req = { user: { userId: 1 } };

    expect(await controller.getConfig(req, 'srv')).toEqual({ enabled: true });
    expect(await controller.updateConfig(req, 'srv', { enabled: false } as any)).toEqual({ enabled: false });
    expect(alerts.updateConfig).toHaveBeenCalledWith('srv', { enabled: false });
    expect(accessControl.assertServerAccess).toHaveBeenCalledTimes(2);
  });
});
