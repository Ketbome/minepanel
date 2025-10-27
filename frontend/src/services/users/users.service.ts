import api from "../axios.service";

interface User {
  username: string;
  email: string;
  password: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export const getUsers = async (): Promise<User[]> => {
  const response = await api.get("/users");
  return response.data;
};

export const createUser = async (user: User): Promise<User> => {
  const response = await api.post("/users", user);
  return response.data;
};

export const updateUser = async (id: number, user: User): Promise<User> => {
  const response = await api.put(`/users/${id}`, user);
  return response.data;
};

export const changePassword = async (data: ChangePasswordData): Promise<{ message: string }> => {
  const response = await api.post("/users/change-password", data);
  return response.data;
};
