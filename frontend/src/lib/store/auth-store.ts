import { create } from "zustand";
import { isAuthenticated as checkAuth, logout as logoutService } from "@/services/auth/auth.service";

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  checkAuthentication: () => void;
  logout: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isLoading: true,

  checkAuthentication: () => {
    const authenticated = checkAuth();
    set({ isAuthenticated: authenticated, isLoading: false });
  },

  logout: () => {
    logoutService();
    set({ isAuthenticated: false });
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  },

  initialize: () => {
    const authenticated = checkAuth();
    set({ isAuthenticated: authenticated, isLoading: false });
  },
}));
