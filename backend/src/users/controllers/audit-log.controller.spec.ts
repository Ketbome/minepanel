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
            isAdmin: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(AuditLogController);
    auditLogService = module.get(AuditLogService);
    usersService = module.get(UsersService);
    accessControlService = module.get(AccessControlService);
  });

  it('should list audit logs for admins', async () => {
    usersService.getRequiredUserById.mockResolvedValue({ id: 1, role: 'ADMIN' } as any);
    accessControlService.isAdmin.mockReturnValue(true);
    auditLogService.list.mockResolvedValue([{ id: 1 }] as any);

    await expect(controller.listAuditLogs({ user: { userId: 1 } }, {} as any)).resolves.toEqual([{ id: 1 }]);
    expect(auditLogService.list).toHaveBeenCalledWith({});
  });

  it('should reject non-admin users', async () => {
    usersService.getRequiredUserById.mockResolvedValue({ id: 2, role: 'USER' } as any);
    accessControlService.isAdmin.mockReturnValue(false);

    await expect(controller.listAuditLogs({ user: { userId: 2 } }, {} as any)).rejects.toThrow(ForbiddenException);
    expect(auditLogService.list).not.toHaveBeenCalled();
  });
});
