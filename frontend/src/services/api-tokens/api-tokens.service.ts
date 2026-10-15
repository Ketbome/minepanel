import api from '../axios.service';
import { getPublicEnv } from '@/lib/public-env';
import type { UserPermissions } from '../users/users.service';

export type ApiTokenPermissions = Omit<UserPermissions, 'useApiTokens'>;

export type ApiTokenExpiry = 30 | 90 | 365 | null;

export interface ApiToken {
  id: number;
  name: string;
  prefix: string;
  admin: boolean;
  readOnly: boolean;
  permissions: ApiTokenPermissions;
  serverAccess: string[];
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  userId?: number;
  username?: string;
}

export interface CreateApiTokenData {
  name: string;
  admin?: boolean;
  readOnly?: boolean;
  permissions: ApiTokenPermissions;
  serverAccess: string[];
  expiresInDays: ApiTokenExpiry;
}

export type CreatedApiToken = ApiToken & { token: string };

export const getApiTokens = async (): Promise<ApiToken[]> => {
  const response = await api.get('/api-tokens');
  return response.data;
};

export const getAllApiTokens = async (): Promise<ApiToken[]> => {
  const response = await api.get('/api-tokens/all');
  return response.data;
};

export const createApiToken = async (data: CreateApiTokenData): Promise<CreatedApiToken> => {
  const response = await api.post('/api-tokens', data);
  return response.data;
};

export const revokeApiToken = async (id: number): Promise<void> => {
  await api.delete(`/api-tokens/${id}`);
};

// The backend URL may be relative (same-origin behind a reverse proxy), but an
// MCP client runs elsewhere and needs it absolute.
export const getMcpUrl = (): string => {
  const backendUrl = new URL(getPublicEnv('NEXT_PUBLIC_BACKEND_URL') || '/', window.location.origin);
  return `${backendUrl.href.replace(/\/+$/, '')}/mcp`;
};
