import { UserPermissions } from 'src/users/access-control.types';

export type ApiTokenPermissions = Omit<UserPermissions, 'useApiTokens'>;

export interface ApiTokenScope {
  id: number;
  admin: boolean;
  readOnly: boolean;
  permissions: ApiTokenPermissions;
  serverAccess: string[];
}

export interface PayloadToken {
  role: string;
  username: string;
  userId: number;
  apiToken?: ApiTokenScope;
}
