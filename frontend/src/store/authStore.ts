import { create } from 'zustand';
import api from '../lib/axios';

interface User {
  id: number;
  username: string;
  email: string;
  nombre: string;
  apellidos: string;
  roles: string[];
  permissions: string[];
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string, refreshToken?: string) => void;
  setToken: (token: string) => void;
  refreshMe: () => Promise<void>;
  logout: () => void;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  isAdmin: () => boolean;
}

const loadUser = (): User | null => {
  try {
    const stored = localStorage.getItem('user');
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...parsed,
        roles: parsed.roles || [],
        permissions: parsed.permissions || [],
      };
    }
  } catch {}
  return null;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: loadUser(),
  token: localStorage.getItem('access_token'),
  refreshToken: localStorage.getItem('refresh_token'),
  isAuthenticated: !!localStorage.getItem('access_token'),

  setAuth: (user, token, refreshToken) => {
    localStorage.setItem('access_token', token);
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    }
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token, refreshToken: refreshToken ?? get().refreshToken, isAuthenticated: true });
  },

  setToken: (token) => {
    localStorage.setItem('access_token', token);
    set({ token });
  },

  refreshMe: async () => {
    try {
      const { data } = await api.get('/auth/me');
      const updated: User = {
        ...data,
        roles: data.roles || [],
        permissions: data.permissions || [],
      };
      localStorage.setItem('user', JSON.stringify(updated));
      set({ user: updated });
    } catch {
      // Sin sesión válida o error de red: se conserva la sesión actual
    }
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
  },

  hasRole: (role: string) => {
    const user = get().user;
    if (!user) return false;
    return user.roles.some(r => r === role || r === `ROLE_${role}`);
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
