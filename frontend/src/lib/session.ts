import axios from 'axios';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

/**
 * Sesión del usuario.
 *
 * Web: el access token vive en memoria y el refresh token en una cookie
 * HttpOnly del backend.
 *
 * APK (Capacitor): el WebView corre en otro origen, así que la cookie no se
 * envía. La app pide el refresh token en el cuerpo (X-Session-Mode: body) y lo
 * guarda en el almacenamiento privado de la aplicación.
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8081/api/v1';

export const isNativeApp = Capacitor.isNativePlatform();

const REFRESH_KEY = 'hd_refresh_token';

let accessToken: string | null = null;
let onRefreshed: ((data: any) => void) | null = null;
let refreshTokenEnMemoria: string | null = null;

export const session = {
  getToken: () => accessToken,
  setToken: (token: string | null) => {
    accessToken = token;
  },
  clear: () => {
    accessToken = null;
  },
  onRefreshed: (handler: ((data: any) => void) | null) => {
    onRefreshed = handler;
  },
  isNative: () => isNativeApp,
};

/** Encabezado que pide el refresh token en el cuerpo (solo app móvil). */
export function appHeaders(): Record<string, string> {
  return isNativeApp ? { 'X-Session-Mode': 'body' } : {};
}

export async function guardarRefreshToken(token?: string | null): Promise<void> {
  if (!isNativeApp || !token) return;
  refreshTokenEnMemoria = token;
  await Preferences.set({ key: REFRESH_KEY, value: token });
}

export async function leerRefreshToken(): Promise<string | null> {
  if (!isNativeApp) return null;
  if (refreshTokenEnMemoria) return refreshTokenEnMemoria;
  const { value } = await Preferences.get({ key: REFRESH_KEY });
  refreshTokenEnMemoria = value ?? null;
  return refreshTokenEnMemoria;
}

export async function borrarRefreshToken(): Promise<void> {
  refreshTokenEnMemoria = null;
  if (!isNativeApp) return;
  await Preferences.remove({ key: REFRESH_KEY });
}

/** Renueva el access token: cookie HttpOnly en web, cuerpo en la APK. */
export async function refreshSession(): Promise<any> {
  if (isNativeApp) {
    const token = await leerRefreshToken();
    if (!token) {
      throw new Error('No hay una sesión guardada en el dispositivo.');
    }
    const { data } = await axios.post(
      `${API_BASE_URL}/auth/refresh`,
      { refreshToken: token },
      { headers: appHeaders() },
    );
    accessToken = data.accessToken;
    await guardarRefreshToken(data.refreshToken);
    onRefreshed?.(data);
    return data;
  }

  const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true });
  accessToken = data.accessToken;
  onRefreshed?.(data);
  return data;
}
