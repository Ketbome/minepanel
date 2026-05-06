import api from "../axios.service";
import { invalidateSessionUserCache } from "../auth/auth.service";

let currentUserCache: User | null = null;
let currentUserPromise: Promise<User> | null = null;
let currentUserCachedAt = 0;
const CURRENT_USER_CACHE_TTL_MS = 30_000;

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

export interface User {
  id: number;
  username: string;
  email: string | null;
  role: string;
  isActive: boolean;
  access: UserAccessState;
}

export interface CreateUserData {
  username: string;
  email?: string;
  password: string;
}

export interface UpdateUserAccessData {
  isActive?: boolean;
  permissions?: Partial<UserPermissions>;
  serverAccess?: string[];
}

export interface CreateInvitationData {
  email?: string;
  permissions: UserPermissions;
  serverAccess: string[];
}

export interface UserInvitation {
  id: number;
  email: string | null;
  role: string;
  access: UserAccessState;
  expiresAt: string;
  createdAt?: string;
  inviteUrl?: string;
  emailSent?: boolean;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateProfileData {
  email: string;
}

export interface UpdateProfileResponse {
  requiresConfirmation: boolean;
  pendingEmail?: string;
  user?: User;
}

export interface ConfirmEmailChangeData {
  code: string;
}

export const invalidateCurrentUserCache = () => {
  currentUserCache = null;
  currentUserPromise = null;
  currentUserCachedAt = 0;
};

export const getUsers = async (): Promise<User[]> => {
  const response = await api.get("/users");
  return response.data;
};

export const getCurrentUser = async (options?: { force?: boolean }): Promise<User> => {
  const shouldUseCache = !options?.force && currentUserCache !== null && Date.now() - currentUserCachedAt < CURRENT_USER_CACHE_TTL_MS;
  if (shouldUseCache && currentUserCache !== null) {
    return currentUserCache;
  }

  if (!options?.force && currentUserPromise) {
    return currentUserPromise;
  }

  currentUserPromise = api.get("/users/one").then((response) => {
    currentUserCache = response.data;
    currentUserCachedAt = Date.now();
    currentUserPromise = null;
    return response.data;
  }).catch((error) => {
    invalidateCurrentUserCache();
    throw error;
  });

  return currentUserPromise;
};

export const createUser = async (user: CreateUserData): Promise<User> => {
  const response = await api.post("/users", user);
  return response.data;
};

export const updateUser = async (id: number, user: Partial<CreateUserData>): Promise<User> => {
  const response = await api.patch(`/users/${id}`, user);
  return response.data;
};

export const updateUserAccess = async (id: number, data: UpdateUserAccessData): Promise<User> => {
  const response = await api.patch(`/users/${id}/access`, data);
  return response.data;
};

export const deleteUser = async (id: number): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete(`/users/${id}`);
  return response.data;
};

export const updateProfile = async (data: UpdateProfileData): Promise<UpdateProfileResponse> => {
  const response = await api.patch("/users/profile", data);
  if (response.data.user) {
    currentUserCache = response.data.user;
    currentUserCachedAt = Date.now();
  } else {
    invalidateCurrentUserCache();
  }
  invalidateSessionUserCache();
  return response.data;
};

export const confirmEmailChange = async (data: ConfirmEmailChangeData): Promise<User> => {
  const response = await api.post('/users/profile/confirm-email', data);
  currentUserCache = response.data;
  currentUserCachedAt = Date.now();
  invalidateSessionUserCache();
  return response.data;
};

export const changePassword = async (data: ChangePasswordData): Promise<{ message: string }> => {
  const response = await api.post("/users/change-password", data);
  return response.data;
};

export const getInvitations = async (): Promise<UserInvitation[]> => {
  const response = await api.get("/auth/invitations");
  return response.data;
};

export const createInvitation = async (data: CreateInvitationData): Promise<UserInvitation> => {
  const response = await api.post("/auth/invitations", data);
  return response.data;
};

export const getInvitationLink = async (id: number): Promise<{ inviteUrl: string }> => {
  const response = await api.get(`/auth/invitations/${id}/link`);
  return response.data;
};
