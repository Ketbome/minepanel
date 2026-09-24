import { PlayerActivityController } from './player-activity.controller';

describe('Player activity access', () => {
  const activity = { list: jest.fn(), detail: jest.fn() };
  const users = { getRequiredUserById: jest.fn().mockResolvedValue({ id: 1 }) };
  const access = { assertServerAccess: jest.fn() };
  const controller = new PlayerActivityController(activity as any, users as any, access as any);
  const req = { user: { userId: 1 } };
  beforeEach(() => jest.clearAllMocks());
  it('requires assigned server access for both endpoints', async () => {
    await controller.list(req, 'survival');
    await controller.detail(req, 'survival', 'java:alex', '2');
    expect(access.assertServerAccess).toHaveBeenCalledTimes(2);
    expect(activity.list).toHaveBeenCalledWith('survival', 0);
    expect(activity.detail).toHaveBeenCalledWith('survival', 'java:alex', 2);
    access.assertServerAccess.mockImplementationOnce(() => { throw Error('Forbidden'); });
    await expect(controller.detail(req, 'other', 'java:alex')).rejects.toThrow('Forbidden');
    expect(activity.detail).toHaveBeenCalledTimes(1);
  });
  it('rejects unsafe IDs, keys and unbounded pages', async () => {
    await expect(controller.list(req, '../bad')).rejects.toThrow('Invalid server ID');
    for (const page of ['-1', '1.5', 'NaN', '100001']) await expect(controller.list(req, 'survival', page)).rejects.toThrow('Invalid page');
    await expect(controller.detail(req, 'survival', '../../secrets')).rejects.toThrow('Invalid player key');
    expect(activity.list).not.toHaveBeenCalled();
  });
});
