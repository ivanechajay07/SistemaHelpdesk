import { create } from 'zustand';
import api from '../lib/axios';
import { unregisterPush } from '../lib/push';
import {
  borrarRefreshToken,
  isNativeApp,
  leerRefreshToken,
  refreshSession,
  session,
} from '../lib/session';

export interface User {
  id: number;
  username: string;
  email: string;
  nombre: string;
  apellidos: string;
  roles: string[];
  permissions: string[];
  twoFactorEnabled?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  /** true cuando ya se intentó recuperar la sesión desde la cookie HttpOnly. */
  hydrated: boolean;
  setAuth: (user: User, token: string) => void;
  setToken: (token: string) => void;
  hydrate: () => Promise<void>;
  refreshMe: () => Promise<void>;
  logout: () => void;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  isAdmin: () => boolean;
}

const toUser = (data: any): User => ({
  id: data.id,
  username: data.username,
  email: data.email,
  nombre: data.nombre,
  apellidos: data.apellidos,
  roles: data.roles || [],
  permissions: data.permissions || [],
  twoFactorEnabled: data.twoFactorEnabled,
});

const loadUser = (): User | null => {
  try {
    const stored = localStorage.getItem('user');
    return stored ? toUser(JSON.parse(stored)) : null;
  } catch {
    return null;
  }
};

const clearLocalSession = () => {
  session.clear();
  localStorage.removeItem('user');
  // La APK guarda el refresh token en almacenamiento privado del dispositivo.
  void borrarRefreshToken();
  // Limpieza de la migración anterior: los tokens ya no viven en localStorage.
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: loadUser(),
  token: null,
  isAuthenticated: false,
  hydrated: false,

  setAuth: (user, token) => {
    session.setToken(token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },

  setToken: (token) => {
    session.setToken(token);
    set({ token });
  },

  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const data = await refreshSession();
      const user = toUser(data);
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, token: data.accessToken, isAuthenticated: true, hydrated: true });
    } catch {
      clearLocalSession();
      set({ user: null, token: null, isAuthenticated: false, hydrated: true });
    }
  },

  refreshMe: async () => {
    try {
      const { data } = await api.get('/auth/me');
      const updated = toUser(data);
      localStorage.setItem('user', JSON.stringify(updated));
      set({ user: updated });
    } catch {
      // Sin sesión válida o error de red: se conserva la sesión actual.
    }
  },

  logout: () => {
    if (isNativeApp) {
      // Quita el token push antes de limpiar la sesión.
      void unregisterPush();
      // La APK envía el refresh token en el cuerpo (no usa cookies).
      void leerRefreshToken()
        .then((token) => api.post('/auth/logout', token ? { refreshToken: token } : {}))
        .catch(() => {});
    } else {
      // El backend revoca el refresh token y borra la cookie HttpOnly.
      api.post('/auth/logout', {}, { withCredentials: true }).catch(() => {});
    }
    clearLocalSession();
    set({ user: null, token: null, isAuthenticated: false });
  },

  hasRole: (role: string) => {
    const user = get().user;
    if (!user) return false;
    // Acepta tanto "ADMIN" como "ROLE_ADMIN" sin distinguir mayúsculas.
    const normalizado = role.replace(/^ROLE_/i, '').toUpperCase();
    return user.roles.some((r) => r.replace(/^ROLE_/i, '').toUpperCase() === normalizado);
  },

  hasPermission: (permission: string) => {
    const user = get().user;
    if (!user) return false;
    if (user.roles.includes('ADMIN')) return true;
    return user.permissions.includes(permission);
  },

  isAdmin: () => {
    const user = get().user;
    if (!user) return false;
    return user.roles.includes('ADMIN');
  },
}));

// El interceptor de axios puede renovar el token en segundo plano: mantener
// sincronizados usuario, roles y estado de autenticación.
session.onRefreshed((data) => {
  const user = toUser(data);
  localStorage.setItem('user', JSON.stringify(user));
  useAuthStore.setState({ user, token: data.accessToken, isAuthenticated: true });
});
