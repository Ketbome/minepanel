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
};

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
