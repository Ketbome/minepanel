import api from "../axios.service";

let isRefreshing = false;
let refreshSubscribers: Array<{ onSuccess: () => void; onError: (error: unknown) => void }> = [];
const AUTH_ENDPOINTS = ["/auth/login", "/auth/refresh", "/auth/logout"];

const onRefreshed = () => {
  refreshSubscribers.forEach((subscriber) => subscriber.onSuccess());
  refreshSubscribers = [];
};

const onRefreshFailed = (error: unknown) => {
  refreshSubscribers.forEach((subscriber) => subscriber.onError(error));
  refreshSubscribers = [];
};

const addRefreshSubscriber = (onSuccess: () => void, onError: (error: unknown) => void) => {
  refreshSubscribers.push({ onSuccess, onError });
};

const isAuthEndpoint = (url?: string): boolean => {
  if (!url) return false;
  return AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint));
};

export const login = async (username: string, password: string) => {
  try {
    const response = await api.post(`/auth/login`, { username, password }, { withCredentials: true });

    if (response.data.username) {
      localStorage.setItem("username", response.data.username);
      return { success: true, data: response.data };
    }

    return { success: false, error: "NO_USERNAME" };
  } catch (error) {
    console.error("Error in login:", error);
    const err = error as { response?: { data?: { message?: string } } };
    return {
      success: false,
      error: err.response?.data?.message || "LOGIN_ERROR",
    };
  }
};

export const logout = async () => {
  try {
    await api.post("/auth/logout", {}, { withCredentials: true });
  } catch (error) {
    console.error("Error in logout:", error);
  } finally {
    localStorage.removeItem("username");
    if (typeof window !== "undefined" && window.location.pathname !== "/") {
      window.location.href = "/";
    }
  }
};

export const refreshToken = async (): Promise<boolean> => {
  try {
    const response = await api.post("/auth/refresh", {}, { withCredentials: true });
    return response.status === 200;
  } catch (error) {
    console.error("Error refreshing token:", error);
    return false;
  }
};

export const isAuthenticated = async (): Promise<boolean> => {
  if (typeof window === "undefined") return false;

  try {
    // Try to fetch current user session (lightweight check)
    const response = await api.get("/auth/me", { withCredentials: true });
    return response.status === 200;
  } catch (error) {
    // If 401, token expired or invalid
    console.error("Error checking authentication:", error);
    return false;
  }
};

export const setupAxiosInterceptors = () => {
  if (typeof window === "undefined") return;

  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      const status = error.response?.status;
      const requestUrl = originalRequest?.url;

      // Never trigger token refresh on auth endpoints to avoid refresh loops.
      if (status === 401 && isAuthEndpoint(requestUrl)) {
        return Promise.reject(error);
      }

      if (status === 401 && originalRequest && !originalRequest._retry) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            addRefreshSubscriber(() => {
              resolve(api(originalRequest));
            }, (refreshError) => {
              reject(refreshError);
            });
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        const refreshed = await refreshToken();

        if (refreshed) {
          isRefreshing = false;
          onRefreshed();
          return api(originalRequest);
        } else {
          isRefreshing = false;
          onRefreshFailed(error);
          await logout();
          throw error;
        }
      }

      return Promise.reject(error instanceof Error ? error : new Error(error.message || "Authentication error"));
    }
  );
};

if (globalThis.window !== undefined) setupAxiosInterceptors();
