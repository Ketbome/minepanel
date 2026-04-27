import api from "../axios.service";

export interface User {
  id: number;
  username: string;
  email: string | null;
  role?: string;
  isActive?: boolean;
}

export interface CreateUserData {
  username: string;
  email?: string;
  password: string;
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

export const updateProfile = async (data: UpdateProfileData): Promise<User> => {
  const response = await api.patch("/users/profile", data);
  return response.data;
};

export const changePassword = async (data: ChangePasswordData): Promise<{ message: string }> => {
  const response = await api.post("/users/change-password", data);
  return response.data;
};
