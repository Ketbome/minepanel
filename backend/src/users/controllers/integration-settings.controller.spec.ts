import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { IntegrationSettingsController } from './integration-settings.controller';
import { InstanceSettingsService } from 'src/settings/instance-settings.service';
import { AuthMailService } from 'src/auth/auth-mail.service';
import { UsersService } from '../services/users.service';
import { AccessControlService } from '../services/access-control.service';
import { AuditLogService } from '../services/audit-log.service';

describe('IntegrationSettingsController', () => {
  let controller: IntegrationSettingsController;
  let instanceSettings: { getPublic: jest.Mock; updateIntegrations: jest.Mock };
  let usersService: { getRequiredUserById: jest.Mock };
  let auditLogService: { record: jest.Mock };
  let authMailService: { sendTestEmail: jest.Mock };

  beforeEach(async () => {
    instanceSettings = {
      getPublic: jest.fn(async () => ({ smtp: {}, oidc: {} })),
      updateIntegrations: jest.fn(async () => ({ smtp: {}, oidc: {} })),
    };
    usersService = { getRequiredUserById: jest.fn() };
    auditLogService = { record: jest.fn() };
    authMailService = { sendTestEmail: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [IntegrationSettingsController],
      providers: [
        AccessControlService,
        { provide: InstanceSettingsService, useValue: instanceSettings },
        { provide: UsersService, useValue: usersService },
        { provide: AuditLogService, useValue: auditLogService },
        { provide: AuthMailService, useValue: authMailService },
      ],
    }).compile();

    controller = module.get(IntegrationSettingsController);
  });

  it('rejects non-admin users', async () => {
    usersService.getRequiredUserById.mockResolvedValue({ id: 2, role: 'USER' });
    await expect(controller.getIntegrations({ user: { userId: 2 } } as any)).rejects.toBeInstanceOf(ForbiddenException);
    expect(instanceSettings.getPublic).not.toHaveBeenCalled();
  });

  it('returns masked settings for admins', async () => {
    usersService.getRequiredUserById.mockResolvedValue({ id: 1, role: 'ADMIN' });
    const result = await controller.getIntegrations({ user: { userId: 1 } } as any);
    expect(result).toEqual({ smtp: {}, oidc: {} });
    expect(instanceSettings.getPublic).toHaveBeenCalled();
  });

  it('updates integrations and records an audit entry', async () => {
    usersService.getRequiredUserById.mockResolvedValue({ id: 1, role: 'ADMIN' });
    await controller.updateIntegrations({ user: { userId: 1, username: 'admin' } } as any, { smtp: { host: 'x' } });
    expect(instanceSettings.updateIntegrations).toHaveBeenCalledWith({ smtp: { host: 'x' } });
    expect(auditLogService.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'update_integrations' }));
  });
});
