import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '@/lib/api';

interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'cashier';
}

interface AuthStore {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,

      login: async (username: string, password: string) => {
        try {
          const res = await authApi.login(username, password);
          set({
            user: res.user,
            token: res.token,
            refreshToken: res.refreshToken ?? null,
            isAuthenticated: true,
          });
          return true;
        } catch {
          return false;
        }
      },

      logout: () => {
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
      },
    }),
    { name: 'cool-cafe-auth' }
  )
);
