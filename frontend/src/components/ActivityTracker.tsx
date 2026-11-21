"use client";

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import api from '@/services/api';
import { useAuthStore } from '@/store/authStore';

/**
 * Registra navegación SPA sin parámetros de URL, formularios ni datos privados.
 * Visitantes anónimos se distinguen mediante un UUID aleatorio de sesión,
 * que no identifica a una persona por sí solo.
 */
export default function ActivityTracker() {
  const pathname = usePathname();
  const isLoading = useAuthStore(s => s.isLoading);
  const userId = useAuthStore(s => s.user?.id);

  useEffect(() => {
    if (isLoading || !pathname || pathname.startsWith('/api/')) return;
    try {
      let visitorId = sessionStorage.getItem('scw_audit_visitor');
      if (!visitorId) {
        visitorId = crypto.randomUUID();
        sessionStorage.setItem('scw_audit_visitor', visitorId);
      }
      // Desduplicar renderizados múltiples durante 20 segundos.
      const key = `scw_audit_seen:${userId ?? 'guest'}:${pathname}`;
      const lastSeen = Number(sessionStorage.getItem(key) || 0);
      if (Date.now() - lastSeen < 20000) return;
      sessionStorage.setItem(key, String(Date.now()));
      api.post('/audit/track/', { visitor_id: visitorId, path: pathname })
        .catch(() => { /* La analítica no debe interrumpir navegación ni compras. */ });
    } catch {
      // Navegación normal si hay navegación privada o almacenamiento deshabilitado.
    }
  }, [pathname, isLoading, userId]);

  return null;
}
