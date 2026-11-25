import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import api from './axios';
import { isNativeApp, session } from './session';

/**
 * Notificaciones push con Firebase Cloud Messaging (solo APK).
 *
 * Se compila solo cuando la APK incluye google-services.json
 * (VITE_FCM_ENABLED=true). Además, solo se activa si el backend confirma en
 * /app/version que tiene FCM configurado; si no, la app mantiene las
 * notificaciones locales.
 */
export const pushCompilado =
  isNativeApp && import.meta.env.VITE_FCM_ENABLED === 'true';

let pushRemotoHabilitado = false;

/** true cuando esta APK soporta push y el backend lo tiene activo. */
export const pushActivo = (): boolean => pushCompilado && pushRemotoHabilitado;

export function setPushRemoto(habilitado: boolean): void {
  pushRemotoHabilitado = habilitado;
}

let inicializado = false;
let tokenActual: string | null = null;
let cleanupAccion: (() => void) | null = null;

export async function initPush(onOpenTicket: (ticketId: number) => void): Promise<void> {
  if (!pushCompilado || inicializado) return;
  inicializado = true;

  try {
    let permiso = await PushNotifications.checkPermissions();
    if (permiso.receive !== 'granted') {
      permiso = await PushNotifications.requestPermissions();
    }
    if (permiso.receive !== 'granted') {
      inicializado = false;
      return;
    }

    await PushNotifications.addListener('registration', ({ value }) => {
      tokenActual = value;
      void api.post('/push/devices', {
        token: value,
        platform: Capacitor.getPlatform(),
      }).catch(() => {
        // Sin sesión o sin red: se reintenta en el siguiente arranque.
      });
    });

    await PushNotifications.addListener('registrationError', (error) => {
      console.warn('No se pudo registrar el dispositivo en FCM', error);
    });

    await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const ticketId = Number(action.notification.data?.ticketId);
      if (ticketId) onOpenTicket(ticketId);
    });

    // En primer plano la app muestra su propio aviso y sonido; no se duplica.
    await PushNotifications.addListener('pushNotificationReceived', () => {});

    if (cleanupAccion) cleanupAccion();
    cleanupAccion = () => {
      void PushNotifications.removeAllListeners();
    };

    await PushNotifications.register();
  } catch {
    // Sin google-services.json o sin permiso: la app sigue funcionando.
    inicializado = false;
  }
}

/** Elimina el token del backend al cerrar sesión. */
export async function unregisterPush(): Promise<void> {
  if (!pushActivo()) return;
  const token = tokenActual;
  const accessToken = session.getToken();
  tokenActual = null;
  if (!token) return;
  try {
    // Se captura el token antes de que logout limpie la sesión.
    await api.post(
      '/push/devices/unregister',
      { token },
      accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
    );
  } catch {
    // Si falla, el token queda inactivo hasta el próximo registro.
  }
}
