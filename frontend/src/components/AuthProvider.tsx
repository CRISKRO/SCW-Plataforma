"use client";

import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/auth.services';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setAuth, logout } = useAuthStore();

  useEffect(() => {
    const token = typeof window !== 'undefined' 
      ? (localStorage.getItem('access_token') || sessionStorage.getItem('access_token'))
      : null;
    if (token) {
      authService.getProfile()
        .then(user => setAuth(user, token, !!localStorage.getItem('access_token')))
        .catch(() => logout());
    }
  }, [setAuth, logout]);

  return <>{children}</>;
}
