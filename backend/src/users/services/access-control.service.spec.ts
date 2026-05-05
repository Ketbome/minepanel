import { ForbiddenException } from '@nestjs/common';
import { AccessControlService } from './access-control.service';

describe('AccessControlService', () => {
  let service: AccessControlService;

  const adminUser = {
    id: 1,
    role: 'ADMIN',
    permissions: null,
    serverAccess: null,
  } as any;

  const limitedUser = {
    id: 2,
    role: 'USER',
    permissions: {
      manageUsers: false,
      accessAllServers: false,
      viewLogs: true,
      useConsole: false,
      viewGlobalFiles: false,
      useGlobalFiles: false,
      viewServerFiles: true,
      useServerFiles: false,
    },
    serverAccess: ['alpha'],
  } as any;

  beforeEach(() => {
    service = new AccessControlService();
  });

  it('should treat admin as full access', () => {
    expect(service.canCreateServers(adminUser)).toBe(true);
    expect(service.canAccessServer(adminUser, 'any-server')).toBe(true);
    expect(service.canUsePermission(adminUser, 'useConsole')).toBe(true);
  });

  it('should allow create server only with global server access', () => {
    expect(service.canCreateServers(limitedUser)).toBe(false);

    const globalUser = {
      ...limitedUser,
      permissions: {
        ...limitedUser.permissions,
        accessAllServers: true,
      },
    } as any;

    expect(service.canCreateServers(globalUser)).toBe(true);
    expect(service.canManageSystemSettings(globalUser)).toBe(true);
  });

  it('should restrict server access to assigned servers when accessAllServers is false', () => {
    expect(service.canAccessServer(limitedUser, 'alpha')).toBe(true);
    expect(service.canAccessServer(limitedUser, 'beta')).toBe(false);
  });

  it('should throw when creating servers without global access', () => {
    expect(() => service.assertCreateServers(limitedUser)).toThrow(ForbiddenException);
  });

  it('should throw when viewing logs without server access', () => {
    expect(() => service.assertViewLogs(limitedUser, 'beta')).toThrow(ForbiddenException);
  });

  it('should throw when using console without permission', () => {
    expect(() => service.assertUseConsole(limitedUser, 'alpha')).toThrow(ForbiddenException);
  });

  it('should throw when editing system settings without global access', () => {
    expect(() => service.assertManageSystemSettings(limitedUser)).toThrow(ForbiddenException);
  });
});
