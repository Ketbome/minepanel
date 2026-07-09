import { ForbiddenException, Injectable } from '@nestjs/common';
import { Users } from '../entities/users.entity';
import { FULL_ACCESS_PERMISSIONS, normalizePermissions, normalizeServerAccess, UserAccessState, UserPermissions } from '../access-control.types';

@Injectable()
export class AccessControlService {
  isAdmin(user: Pick<Users, 'role'> | null | undefined): boolean {
    return user?.role === 'ADMIN';
  }

  assertIsAdmin(user: Pick<Users, 'role'> | null | undefined): void {
    if (!this.isAdmin(user)) {
      throw new ForbiddenException('Only admins can perform this action');
    }
  }

  getAccessState(user: Users): UserAccessState {
    if (this.isAdmin(user)) {
      return {
        permissions: FULL_ACCESS_PERMISSIONS,
        serverAccess: [],
      };
    }

    return {
      permissions: normalizePermissions(user.permissions),
      serverAccess: normalizeServerAccess(user.serverAccess),
    };
  }

  canManageUsers(user: Users): boolean {
    return this.isAdmin(user) || this.getAccessState(user).permissions.manageUsers;
  }

  canCreateServers(user: Users): boolean {
    return this.isAdmin(user) || this.getAccessState(user).permissions.accessAllServers;
  }

  canManageSystemSettings(user: Users): boolean {
    return this.canCreateServers(user);
  }

  canAccessServer(user: Users, serverId: string): boolean {
    if (this.isAdmin(user)) {
      return true;
    }

    const { permissions, serverAccess } = this.getAccessState(user);
    return permissions.accessAllServers || serverAccess.includes(serverId);
  }

  canUsePermission(user: Users, permission: keyof UserPermissions): boolean {
    if (this.isAdmin(user)) {
      return true;
    }

    return this.getAccessState(user).permissions[permission];
  }

  getVisibleServerIds(user: Users, serverIds: string[]): string[] {
    if (this.isAdmin(user)) {
      return serverIds;
    }

    const { permissions, serverAccess } = this.getAccessState(user);
    if (permissions.accessAllServers) {
      return serverIds;
    }

    return serverIds.filter((serverId) => serverAccess.includes(serverId));
  }

  assertManageUsers(user: Users): void {
    if (!this.canManageUsers(user)) {
      throw new ForbiddenException('You do not have permission to manage users');
    }
  }

  assertCreateServers(user: Users): void {
    if (!this.canCreateServers(user)) {
      throw new ForbiddenException('You need access to all servers to create new servers');
    }
  }

  assertManageSystemSettings(user: Users): void {
    if (!this.canManageSystemSettings(user)) {
      throw new ForbiddenException('You need access to all servers to edit these settings');
    }
  }

  assertServerAccess(user: Users, serverId: string): void {
    if (!this.canAccessServer(user, serverId)) {
      throw new ForbiddenException('You do not have access to this server');
    }
  }

  assertViewLogs(user: Users, serverId: string): void {
    this.assertServerAccess(user, serverId);
    if (!this.canUsePermission(user, 'viewLogs')) {
      throw new ForbiddenException('You do not have permission to view logs');
    }
  }

  assertUseConsole(user: Users, serverId: string): void {
    this.assertServerAccess(user, serverId);
    if (!this.canUsePermission(user, 'useConsole')) {
      throw new ForbiddenException('You do not have permission to use the console');
    }
  }

  assertGlobalFiles(user: Users, write: boolean): void {
    const permission = write ? 'useGlobalFiles' : 'viewGlobalFiles';
    if (!this.canUsePermission(user, permission)) {
      throw new ForbiddenException(`You do not have permission to ${write ? 'manage' : 'view'} global files`);
    }
  }

  assertServerFiles(user: Users, serverId: string, write: boolean): void {
    this.assertServerAccess(user, serverId);
    const permission = write ? 'useServerFiles' : 'viewServerFiles';
    if (!this.canUsePermission(user, permission)) {
      throw new ForbiddenException(`You do not have permission to ${write ? 'manage' : 'view'} server files`);
    }
  }
}
