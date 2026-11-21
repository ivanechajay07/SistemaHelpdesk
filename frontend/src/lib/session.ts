import axios from 'axios';

/**
 * El access token vive solo en memoria; el refresh token se guarda en una
 * cookie HttpOnly emitida por el backend. Al recargar, la sesión se recupera
 * llamando a /auth/refresh con esa cookie.
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8081/api/v1';

let accessToken: string | null = null;
let onRefreshed: ((data: any) => void) | null = null;

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
};

/** Renueva el access token usando la cookie HttpOnly de refresh. */
export async function refreshSession(): Promise<any> {
  const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true });
  accessToken = data.accessToken;
  onRefreshed?.(data);
  return data;
}
