import { ForbiddenException } from '@nestjs/common';
import { AccessControlService } from './access-control.service';
import { DEFAULT_USER_PERMISSIONS, FULL_ACCESS_PERMISSIONS, applyAdminGrantedPermissions, normalizePermissions, normalizeServerAccess } from '../access-control.types';
import { Users } from '../entities/users.entity';

const user = (overrides: Partial<Users> = {}): Users => ({ id: 1, role: 'USER', permissions: null, serverAccess: null, ...overrides }) as Users;
const withPerms = (perms: Partial<typeof DEFAULT_USER_PERMISSIONS>, serverAccess: string[] = []) => user({ permissions: { ...DEFAULT_USER_PERMISSIONS, ...perms }, serverAccess });

describe('AccessControlService rules', () => {
  const service = new AccessControlService();
  const admin = user({ role: 'ADMIN' });

  it('admins pass every check', () => {
    expect(service.isAdmin(admin)).toBe(true);
    expect(service.isAdmin(null)).toBe(false);
    expect(() => service.assertIsAdmin(admin)).not.toThrow();
    expect(() => service.assertIsAdmin(user())).toThrow(ForbiddenException);
    expect(service.getAccessState(admin)).toEqual({ permissions: FULL_ACCESS_PERMISSIONS, serverAccess: [] });
    expect(service.canUsePermission(admin, 'useConsole')).toBe(true);
    expect(service.getVisibleServerIds(admin, ['a', 'b'])).toEqual(['a', 'b']);
    expect(() => service.assertViewLogs(admin, 'a')).not.toThrow();
    expect(() => service.assertGlobalFiles(admin, true)).not.toThrow();
  });

  it('normalizes missing permissions and server access', () => {
    expect(service.getAccessState(user({ serverAccess: [' a ', 'a', ''] }))).toEqual({ permissions: DEFAULT_USER_PERMISSIONS, serverAccess: ['a'] });
    expect(normalizePermissions(null)).toEqual(DEFAULT_USER_PERMISSIONS);
    expect(normalizeServerAccess(undefined)).toEqual([]);
  });

  it('derives user, server and settings management from permissions', () => {
    const manager = withPerms({ manageUsers: true });
    const global = withPerms({ accessAllServers: true });
    expect(service.canManageUsers(manager)).toBe(true);
    expect(service.canManageUsers(user())).toBe(false);
    expect(service.canCreateServers(global)).toBe(true);
    expect(service.canManageSystemSettings(global)).toBe(true);
    expect(() => service.assertManageUsers(user())).toThrow(ForbiddenException);
    expect(() => service.assertCreateServers(user())).toThrow(ForbiddenException);
    expect(() => service.assertManageSystemSettings(user())).toThrow(ForbiddenException);
    expect(() => service.assertManageUsers(manager)).not.toThrow();
  });

  it('scopes server access by list or global flag', () => {
    const scoped = withPerms({ viewLogs: true, useConsole: false, viewServerFiles: true }, ['a']);
    expect(service.canAccessServer(scoped, 'a')).toBe(true);
    expect(service.canAccessServer(scoped, 'b')).toBe(false);
    expect(service.canAccessServer(withPerms({ accessAllServers: true }), 'z')).toBe(true);
    expect(service.getVisibleServerIds(scoped, ['a', 'b'])).toEqual(['a']);
    expect(service.getVisibleServerIds(withPerms({ accessAllServers: true }), ['a', 'b'])).toEqual(['a', 'b']);

    expect(() => service.assertServerAccess(scoped, 'b')).toThrow('do not have access');
    expect(() => service.assertViewLogs(scoped, 'a')).not.toThrow();
    expect(() => service.assertViewLogs(withPerms({}, ['a']), 'a')).toThrow('view logs');
    expect(() => service.assertUseConsole(scoped, 'a')).toThrow('use the console');
    expect(() => service.assertUseConsole(withPerms({ useConsole: true }, ['a']), 'a')).not.toThrow();
    expect(() => service.assertServerFiles(scoped, 'a', false)).not.toThrow();
    expect(() => service.assertServerFiles(scoped, 'a', true)).toThrow('manage server files');
    expect(() => service.assertGlobalFiles(scoped, false)).toThrow('view global files');
    expect(() => service.assertGlobalFiles(withPerms({ useGlobalFiles: true }), true)).not.toThrow();
  });

  it('keeps admin-only grants for non-admin actors', () => {
    const next = { ...DEFAULT_USER_PERMISSIONS, changeServerVersion: true, viewLogs: true };
    expect(applyAdminGrantedPermissions(next, DEFAULT_USER_PERMISSIONS, true)).toBe(next);
    expect(applyAdminGrantedPermissions(next, DEFAULT_USER_PERMISSIONS, false)).toEqual({ ...next, changeServerVersion: false });
  });
});
