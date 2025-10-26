/* eslint-disable @typescript-eslint/no-explicit-any */
import api from "../axios.service";

export const login = async (username: string, password: string) => {
  try {
    const response = await api.post(`/auth/login`, { username, password }, { withCredentials: true });

    if (response.data.access_token) {
      localStorage.setItem("token", response.data.access_token);
      localStorage.setItem("username", response.data.username);
      api.defaults.headers.common["Authorization"] = `Bearer ${response.data.access_token}`;
      return { success: true, data: response.data };
    }

    return { success: false, error: "NO_ACCESS_TOKEN" };
  } catch (error: any) {
    console.error("Error in login:", error);
    return {
      success: false,
      error: error.response?.data?.message || "LOGIN_ERROR",
    };
  }
};

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  delete api.defaults.headers.common["Authorization"];
};

export const isAuthenticated = (): boolean => {
  if (typeof window === "undefined") return false;

  try {
    const token = localStorage.getItem("token");
    return !!token;
  } catch (error) {
    console.error("Error checking authentication:", error);
    return false;
  }
};

export const setupAxiosInterceptors = () => {
  if (typeof window === "undefined") return;

  const token = localStorage.getItem("token");
  if (token) api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) logout();
      return Promise.reject(error instanceof Error ? error : new Error(error.message || "Authentication error"));
    }
  );
};

if (typeof window !== "undefined") setupAxiosInterceptors();
