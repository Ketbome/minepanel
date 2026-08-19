export type UserRole = 'ADMIN' | 'USER';

export interface UserPermissions {
  manageUsers: boolean;
  accessAllServers: boolean;
  viewLogs: boolean;
  useConsole: boolean;
  viewGlobalFiles: boolean;
  useGlobalFiles: boolean;
  viewServerFiles: boolean;
  useServerFiles: boolean;
  changeServerVersion: boolean;
}

export interface UserAccessState {
  permissions: UserPermissions;
  serverAccess: string[];
}

export const DEFAULT_USER_PERMISSIONS: UserPermissions = {
  manageUsers: false,
  accessAllServers: false,
  viewLogs: false,
  useConsole: false,
  viewGlobalFiles: false,
  useGlobalFiles: false,
  viewServerFiles: false,
  useServerFiles: false,
  changeServerVersion: false,
};

export const FULL_ACCESS_PERMISSIONS: UserPermissions = {
  manageUsers: true,
  accessAllServers: true,
  viewLogs: true,
  useConsole: true,
  viewGlobalFiles: true,
  useGlobalFiles: true,
  viewServerFiles: true,
  useServerFiles: true,
  changeServerVersion: true,
};

// Permissions that `manageUsers` is not enough to hand out. Without this, any
// delegated operator could grant them to another account or to themselves.
export const ADMIN_GRANTED_PERMISSIONS: Array<keyof UserPermissions> = ['changeServerVersion'];

export const normalizePermissions = (permissions?: Partial<UserPermissions> | null): UserPermissions => ({
  ...DEFAULT_USER_PERMISSIONS,
  ...(permissions ?? {}),
});

export const normalizeServerAccess = (serverAccess?: string[] | null): string[] => {
  if (!serverAccess?.length) {
    return [];
  }

  return [...new Set(serverAccess.map((serverId) => serverId.trim()).filter(Boolean))];
};

// `current` is what is already stored for the target (or the defaults when there
// is nothing stored yet, as with invitations).
export const applyAdminGrantedPermissions = (next: UserPermissions, current: UserPermissions, actorIsAdmin: boolean): UserPermissions => {
  if (actorIsAdmin) {
    return next;
  }

  const restricted = { ...next };
  for (const permission of ADMIN_GRANTED_PERMISSIONS) {
    restricted[permission] = current[permission];
  }

  return restricted;
};
