import api from "../axios.service";
import { UserAccessState, UserInvitation } from "../users/users.service";

let isRefreshing = false;
let refreshSubscribers: Array<{ onSuccess: () => void; onError: (error: unknown) => void }> = [];
let sessionUserCache: SessionUser | null = null;
let sessionUserPromise: Promise<SessionUser> | null = null;
let sessionUserCachedAt = 0;
const SESSION_USER_CACHE_TTL_MS = 30_000;
const AUTH_ENDPOINTS = [
  "/auth/login",
  "/auth/refresh",
  "/auth/logout",
  "/auth/setup-admin",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/setup-status",
  "/auth/invitations",
  "/auth/invitations/accept",
];

export interface SetupStatus {
  requiresSetup: boolean;
  passwordRecoveryEnabled: boolean;
}

export interface AcceptInvitationData {
  token: string;
  username: string;
  password: string;
  email?: string;
}

export interface SessionUser {
  userId: number;
  username: string;
  role: string;
  access: UserAccessState;
}

const getApiErrorMessage = (error: unknown, fallback: string): string => {
  const err = error as { response?: { data?: { message?: string | string[] } } };
  const message = err.response?.data?.message;

  if (Array.isArray(message)) {
    return message[0] || fallback;
  }

  return message || fallback;
};

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

export const invalidateSessionUserCache = () => {
  sessionUserCache = null;
  sessionUserPromise = null;
  sessionUserCachedAt = 0;
};

const isAuthEndpoint = (url?: string): boolean => {
  if (!url) return false;
  return AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint));
};

export const login = async (username: string, password: string) => {
  try {
    const response = await api.post(`/auth/login`, { username, password }, { withCredentials: true });

    if (response.data.username) {
      invalidateSessionUserCache();
      return { success: true, data: response.data };
    }

    return { success: false, error: "NO_USERNAME" };
  } catch (error) {
    console.error("Error in login:", error);
    return {
      success: false,
      error: getApiErrorMessage(error, "LOGIN_ERROR"),
    };
  }
};

export const getSetupStatus = async (): Promise<SetupStatus> => {
  const response = await api.get("/auth/setup-status", { withCredentials: true });
  return response.data;
};

export const setupAdmin = async (data: { username: string; email: string; password: string }) => {
  try {
    const response = await api.post("/auth/setup-admin", data, { withCredentials: true });

    if (response.data.username) {
      invalidateSessionUserCache();
      return { success: true, data: response.data };
    }

    return { success: false, error: "NO_USERNAME" };
  } catch (error) {
    console.error("Error in setup admin:", error);
    return {
      success: false,
      error: getApiErrorMessage(error, "SETUP_ERROR"),
    };
  }
};

export const requestPasswordReset = async (email: string) => {
  const response = await api.post(
    "/auth/forgot-password",
    { email },
    { withCredentials: true },
  );

  return response.data;
};

export const resetPassword = async (token: string, password: string) => {
  const response = await api.post(
    "/auth/reset-password",
    { token, password },
    { withCredentials: true },
  );

  return response.data;
};

export const getInvitation = async (token: string): Promise<UserInvitation> => {
  const response = await api.get(`/auth/invitations/${token}`, { withCredentials: true });
  return response.data;
};

export const acceptInvitation = async (data: AcceptInvitationData) => {
  const response = await api.post("/auth/invitations/accept", data, { withCredentials: true });
  return response.data;
};

export const getSessionUser = async (options?: { force?: boolean }): Promise<SessionUser> => {
  const shouldUseCache = !options?.force && sessionUserCache !== null && Date.now() - sessionUserCachedAt < SESSION_USER_CACHE_TTL_MS;
  if (shouldUseCache && sessionUserCache !== null) {
    return sessionUserCache;
  }

  if (!options?.force && sessionUserPromise) {
    return sessionUserPromise;
  }

  sessionUserPromise = api.get("/auth/me", { withCredentials: true }).then((response) => {
    sessionUserCache = response.data;
    sessionUserCachedAt = Date.now();
    sessionUserPromise = null;
    return response.data;
  }).catch((error) => {
    invalidateSessionUserCache();
    throw error;
  });

  return sessionUserPromise;
};

export const logout = async () => {
  try {
    await api.post("/auth/logout", {}, { withCredentials: true });
  } catch (error) {
    console.error("Error in logout:", error);
  } finally {
    invalidateSessionUserCache();
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
