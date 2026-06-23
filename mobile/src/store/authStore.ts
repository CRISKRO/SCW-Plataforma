import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  phone?: string;
  is_staff: boolean;
}

interface AuthState {
  token: string | null;
  refresh: string | null;
  user: User | null;
  setAuth: (token: string, refresh: string, user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refresh: null,
      user: null,
      isAuthenticated: false,
      setAuth: (token, refresh, user) => set({ token, refresh, user, isAuthenticated: true }),
      logout: () => set({ token: null, refresh: null, user: null, isAuthenticated: false }),
    }),
    {
      name: 'scw-auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
