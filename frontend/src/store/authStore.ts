import { create } from 'zustand';

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  address?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  role: string;
  is_superuser?: boolean;
  is_premium?: boolean;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  setAuth: (user: User, token: string, remember?: boolean) => void;
  updateUser: (user: Partial<User>) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  isLoading: true,
  setAuth: (user, token, remember = true) => {
    if (typeof window !== 'undefined') {
      if (remember) {
        localStorage.setItem('access_token', token);
        sessionStorage.removeItem('access_token');
      } else {
        sessionStorage.setItem('access_token', token);
        localStorage.removeItem('access_token');
      }
    }
    set({ isAuthenticated: true, user, isLoading: false });
  },
  updateUser: (updatedFields) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...updatedFields } : null
    }));
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      sessionStorage.removeItem('access_token');
      sessionStorage.removeItem('refresh_token');
    }
    set({ isAuthenticated: false, user: null, isLoading: false });
  },
  setLoading: (loading) => set({ isLoading: loading }),
}));
