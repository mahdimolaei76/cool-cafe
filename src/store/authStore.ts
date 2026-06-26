import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'cashier';
}

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

// Demo users - در پروداکشن از API استفاده می‌شود
const DEMO_USERS = [
  { id: '1', username: 'admin', password: 'admin123', name: 'مدیر سیستم', role: 'admin' as const },
  { id: '2', username: 'cashier', password: 'cash123', name: 'صندوق‌دار', role: 'cashier' as const },
];

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      login: async (username: string, password: string) => {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const user = DEMO_USERS.find(u => u.username === username && u.password === password);
        
        if (user) {
          const { password: _, ...userData } = user;
          set({ user: userData, isAuthenticated: true });
          return true;
        }
        return false;
      },

      logout: () => {
        set({ user: null, isAuthenticated: false });
      },
    }),
    {
      name: 'cool-cafe-auth',
    }
  )
);
