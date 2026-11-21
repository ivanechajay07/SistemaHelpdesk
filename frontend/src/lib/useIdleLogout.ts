import { useEffect } from 'react';
import { IDLE_TIMEOUT_MS, isIdle } from './idle';
import { useAuthStore } from '../store/authStore';

const ACTIVITY_EVENTS = [
  'mousemove',
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
  'wheel',
] as const;

/**
 * Cierra la sesión automáticamente tras N minutos sin interacción del usuario.
 *
 * - Solo cuenta actividad real (mouse, teclado, scroll, touch).
 * - No cuenta peticiones en segundo plano ni el heartbeat de presencia.
 * - Revoca el refresh token en el servidor y redirige al login.
 */
export function useIdleLogout(timeoutMs: number = IDLE_TIMEOUT_MS): void {
  useEffect(() => {
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return;

    let lastActivity = Date.now();
    let lastWrite = 0;

    const markActivity = () => {
      const now = Date.now();
      // Evita actualizar el estado en cada píxel del ratón.
      if (now - lastWrite > 1000) {
        lastActivity = now;
        lastWrite = now;
      }
    };

    const onVisibilityChange = () => {
      // Volver a la pestaña cuenta como actividad del usuario.
      if (document.visibilityState === 'visible') {
        markActivity();
      }
    };

    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, markActivity, { passive: true }),
    );
    document.addEventListener('visibilitychange', onVisibilityChange);

    const interval = window.setInterval(() => {
      const state = useAuthStore.getState();
      if (!state.isAuthenticated) return;

      if (isIdle(lastActivity, Date.now(), timeoutMs)) {
        window.clearInterval(interval);
        state.logout();
        window.location.replace('/login?reason=idle');
      }
    }, 15_000);

    return () => {
      window.clearInterval(interval);
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, markActivity));
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [timeoutMs]);
}
