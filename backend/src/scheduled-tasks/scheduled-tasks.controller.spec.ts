import { ScheduledTasksController } from './scheduled-tasks.controller';

describe('ScheduledTasksController', () => {
  const req = { user: { userId: 1 } };
  let service: Record<string, jest.Mock>;
  let accessControl: { assertServerAccess: jest.Mock };
  let controller: ScheduledTasksController;

  beforeEach(() => {
    service = {
      listByServer: jest.fn().mockResolvedValue(['t']),
      create: jest.fn().mockResolvedValue({ id: 1 }),
      update: jest.fn().mockResolvedValue({ id: 1, name: 'n' }),
      remove: jest.fn().mockResolvedValue(undefined),
      runNow: jest.fn().mockResolvedValue({ id: 1, lastResult: 'ok' }),
    };
    accessControl = { assertServerAccess: jest.fn() };
    controller = new ScheduledTasksController(service as any, { getRequiredUserById: jest.fn().mockResolvedValue({ id: 1 }) } as any, accessControl as any);
  });

  it('guards every route with server access and delegates', async () => {
    expect(await controller.list(req, 'srv')).toEqual(['t']);
    expect(await controller.create(req, 'srv', { name: 'n', type: 'restart', intervalMinutes: 5 } as any)).toEqual({ id: 1 });
    expect(await controller.update(req, 'srv', 1, { name: 'n' })).toEqual({ id: 1, name: 'n' });
    expect(await controller.remove(req, 'srv', 1)).toEqual({ success: true });
    expect(await controller.runNow(req, 'srv', 1)).toEqual({ id: 1, lastResult: 'ok' });
    expect(accessControl.assertServerAccess).toHaveBeenCalledTimes(5);
    expect(service.update).toHaveBeenCalledWith('srv', 1, { name: 'n' });
  });
});
