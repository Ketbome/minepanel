import { create } from "zustand";
import { isAuthenticated as checkAuth, logout as logoutService } from "@/services/auth/auth.service";

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  checkAuthentication: () => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isLoading: true,

  checkAuthentication: async () => {
    const authenticated = await checkAuth();
    set({ isAuthenticated: authenticated, isLoading: false });
  },

  logout: async () => {
    await logoutService();
    set({ isAuthenticated: false });
  },

  initialize: async () => {
    try {
      const authenticated = await checkAuth();
      set({ isAuthenticated: authenticated, isLoading: false });
    } catch (error) {
      console.error("Error initializing auth:", error);
      set({ isAuthenticated: false, isLoading: false });
    }
  },
}));
