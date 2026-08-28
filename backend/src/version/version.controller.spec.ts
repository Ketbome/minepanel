import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UpdateNotSupportedError } from './updater.service';
import { VersionController } from './version.controller';

describe('VersionController', () => {
  const req = { user: { userId: 1 } };
  let versionService: Record<string, jest.Mock>;
  let updater: Record<string, jest.Mock>;
  let accessControl: { isAdmin: jest.Mock };
  let controller: VersionController;

  beforeEach(() => {
    versionService = { getVersionInfo: jest.fn().mockResolvedValue({ current: '1.12.0', latest: '1.13.0' }), getCurrentVersion: jest.fn().mockReturnValue('1.12.0') };
    updater = { canSelfUpdate: jest.fn().mockResolvedValue(true), getLastResult: jest.fn().mockResolvedValue(null), start: jest.fn().mockResolvedValue({ started: true }) };
    accessControl = { isAdmin: jest.fn().mockReturnValue(true) };
    controller = new VersionController(versionService as any, updater as any, { getRequiredUserById: jest.fn().mockResolvedValue({ id: 1 }) } as any, accessControl as any);
  });

  it('returns version info with update capability', async () => {
    expect(await controller.getVersion('true')).toEqual({ current: '1.12.0', latest: '1.13.0', canSelfUpdate: true, lastUpdate: null });
    expect(versionService.getVersionInfo).toHaveBeenCalledWith({ refresh: true });
    await controller.getVersion();
    expect(versionService.getVersionInfo).toHaveBeenLastCalledWith({ refresh: false });
    expect(await controller.getUpdateStatus()).toEqual({ current: '1.12.0', lastUpdate: null });
  });

  it('only admins can update, and unsupported setups become 400', async () => {
    expect(await controller.update(req)).toEqual({ started: true });

    updater.start.mockRejectedValueOnce(new UpdateNotSupportedError('no compose'));
    await expect(controller.update(req)).rejects.toThrow(BadRequestException);
    updater.start.mockRejectedValueOnce(new Error('boom'));
    await expect(controller.update(req)).rejects.toThrow('boom');

    accessControl.isAdmin.mockReturnValue(false);
    await expect(controller.update(req)).rejects.toThrow(ForbiddenException);
  });
});
