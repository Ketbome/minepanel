import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ActivityController } from './activity.controller';

describe('ActivityController', () => {
  const req = { user: { userId: 1 } };
  const user = { id: 1 };
  let activity: { listEvents: jest.Mock; listSnapshots: jest.Mock; getSnapshot: jest.Mock };
  let tailer: { setTracking: jest.Mock; getCursor: jest.Mock; importHistory: jest.Mock };
  let store: { readConfig: jest.Mock; updateConfig: jest.Mock };
  let access: { assertServerAccess: jest.Mock; assertViewLogs: jest.Mock };
  let controller: ActivityController;

  beforeEach(() => {
    activity = {
      listEvents: jest.fn().mockResolvedValue({ events: [] }),
      listSnapshots: jest.fn().mockResolvedValue([]),
      getSnapshot: jest.fn().mockResolvedValue({ id: 3 }),
    };
    tailer = { setTracking: jest.fn(), getCursor: jest.fn().mockResolvedValue({ historyImported: true }), importHistory: jest.fn().mockResolvedValue({ imported: 2, files: 1 }) };
    const config: Record<string, unknown> = { id: 'srv', tz: 'Europe/Madrid' };
    store = {
      readConfig: jest.fn().mockResolvedValue(config),
      updateConfig: jest.fn(async (_id, mutate) => {
        mutate(config);
        return config;
      }),
    };
    access = { assertServerAccess: jest.fn(), assertViewLogs: jest.fn() };
    controller = new ActivityController(activity as any, tailer as any, store as any, { getRequiredUserById: jest.fn().mockResolvedValue(user) } as any, access as any);
  });

  it('reports and updates the tracking setting', async () => {
    expect(await controller.getSettings(req, 'srv')).toEqual({ enabled: false, historyImported: true });

    expect(await controller.updateSettings(req, 'srv', { enabled: true })).toEqual({ enabled: true, historyImported: true });
    expect(tailer.setTracking).toHaveBeenCalledWith('srv', true, 'Europe/Madrid');
    expect(await controller.getSettings(req, 'srv')).toMatchObject({ enabled: true });
  });

  it('returns 404 when enabling tracking on an unknown server', async () => {
    store.updateConfig.mockResolvedValue(null);
    await expect(controller.updateSettings(req, 'nope', { enabled: true })).rejects.toBeInstanceOf(NotFoundException);
    expect(tailer.setTracking).not.toHaveBeenCalled();
  });

  it('imports history with the server time zone', async () => {
    store.readConfig.mockResolvedValue(null);
    expect(await controller.importHistory(req, 'srv')).toEqual({ imported: 2, files: 1 });
    expect(tailer.importHistory).toHaveBeenCalledWith('srv', 'UTC');
  });

  it('needs the log permission for the timeline', async () => {
    access.assertViewLogs.mockImplementation(() => {
      throw new ForbiddenException();
    });
    await expect(controller.listEvents(req, 'srv', {})).rejects.toBeInstanceOf(ForbiddenException);
    expect(activity.listEvents).not.toHaveBeenCalled();
  });

  it('lists events', async () => {
    await controller.listEvents(req, 'srv', { types: ['chat'] });
    expect(activity.listEvents).toHaveBeenCalledWith('srv', { types: ['chat'] });
  });

  it('lists and reads inventory snapshots', async () => {
    expect(await controller.listSnapshots(req, 'srv', 'u')).toEqual([]);
    expect(await controller.getSnapshot(req, 'srv', 3)).toEqual({ id: 3 });
    expect(activity.getSnapshot).toHaveBeenCalledWith('srv', 3);
  });

  it('falls back to UTC when the config has no time zone', async () => {
    store.updateConfig.mockResolvedValue({ id: 'srv' });
    await controller.updateSettings(req, 'srv', { enabled: false });
    expect(tailer.setTracking).toHaveBeenCalledWith('srv', false, 'UTC');
  });
});
