import axios from 'axios';
import {
  API_BASE_URL,
  appHeaders,
  guardarRefreshToken,
  isNativeApp,
  refreshSession,
  session,
} from './session';

const api = axios.create({
  baseURL: API_BASE_URL,
  // En web la cookie HttpOnly de refresh viaja en las peticiones al mismo origen.
  withCredentials: !isNativeApp,
  headers: {
    'Content-Type': 'application/json',
    ...appHeaders(),
  },
});

api.interceptors.request.use(
  (config) => {
    // El QR público no requiere autenticación: no adjuntar un token obsoleto.
    const isPublicQr = config.url?.includes('/inventario/activos/qr/');
    const token = session.getToken();
    if (token && !isPublicQr && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// La APK recibe el refresh token en el cuerpo: guardarlo en almacenamiento privado.
api.interceptors.response.use(
  (response) => {
    if (isNativeApp && response.data?.refreshToken) {
      void guardarRefreshToken(response.data.refreshToken);
    }
    return response;
  },
  (error) => Promise.reject(error),
);

// Renovación automática del access token.
let refreshing: Promise<string | null> | null = null;

const refreshAccessToken = async (): Promise<string | null> => {
  try {
    const data = await refreshSession();
    return data.accessToken as string;
  } catch {
    return null;
  }
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthCall =
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/register') ||
      originalRequest?.url?.includes('/auth/refresh') ||
      originalRequest?.url?.includes('/auth/2fa/verify');

    // Token expirado: intentar renovar una sola vez y reintentar la petición.
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthCall
    ) {
      originalRequest._retry = true;
      refreshing = refreshing ?? refreshAccessToken();
      const newToken = await refreshing;
      refreshing = null;

      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }

      // Refresh inválido o expirado: limpiar la sesión local.
      session.clear();
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default api;
