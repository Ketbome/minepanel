import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogController } from './audit-log.controller';
import { AuditLogService } from '../services/audit-log.service';
import { UsersService } from '../services/users.service';
import { AccessControlService } from '../services/access-control.service';

describe('AuditLogController', () => {
  let controller: AuditLogController;
  let auditLogService: jest.Mocked<AuditLogService>;
  let usersService: jest.Mocked<UsersService>;
  let accessControlService: jest.Mocked<AccessControlService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditLogController],
      providers: [
        {
          provide: AuditLogService,
          useValue: {
            list: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: {
            getRequiredUserById: jest.fn(),
          },
        },
        {
          provide: AccessControlService,
          useValue: {
            assertManageUsers: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(AuditLogController);
    auditLogService = module.get(AuditLogService);
    usersService = module.get(UsersService);
    accessControlService = module.get(AccessControlService);
  });

  it('should list audit logs for users with manageUsers access', async () => {
    usersService.getRequiredUserById.mockResolvedValue({ id: 1, role: 'USER' } as any);
    auditLogService.list.mockResolvedValue([{ id: 1 }] as any);

    await expect(controller.listAuditLogs({ user: { userId: 1 } }, {} as any)).resolves.toEqual([{ id: 1 }]);
    expect(auditLogService.list).toHaveBeenCalledWith({});
  });

  it('should reject users without manageUsers access', async () => {
    usersService.getRequiredUserById.mockResolvedValue({ id: 2, role: 'USER' } as any);
    accessControlService.assertManageUsers.mockImplementation(() => {
      throw new ForbiddenException('Forbidden');
    });

    await expect(controller.listAuditLogs({ user: { userId: 2 } }, {} as any)).rejects.toThrow(ForbiddenException);
    expect(auditLogService.list).not.toHaveBeenCalled();
  });
});
