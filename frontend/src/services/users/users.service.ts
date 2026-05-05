import api from "../axios.service";

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

export const getUsers = async (): Promise<User[]> => {
  const response = await api.get("/users");
  return response.data;
};

export const getCurrentUser = async (): Promise<User> => {
  const response = await api.get("/users/one");
  return response.data;
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

export const updateProfile = async (data: UpdateProfileData): Promise<User> => {
  const response = await api.patch("/users/profile", data);
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
