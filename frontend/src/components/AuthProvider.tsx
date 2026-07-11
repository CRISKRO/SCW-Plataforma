"use client";

import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/auth.services';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setAuth, logout, setLoading } = useAuthStore();

  useEffect(() => {
    const token = typeof window !== 'undefined' 
      ? (localStorage.getItem('access_token') || sessionStorage.getItem('access_token'))
      : null;
    if (token) {
      authService.getProfile()
        .then(user => {
          setAuth(user, token, !!localStorage.getItem('access_token'));
        })
        .catch((error) => {
          if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            logout();
          } else {
            setLoading(false); // In case of network error, just stop loading but don't logout immediately
          }
        });
    } else {
      setLoading(false);
    }
  }, [setAuth, logout, setLoading]);

  return <>{children}</>;
}
