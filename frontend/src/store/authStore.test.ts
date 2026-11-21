import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post, get } = vi.hoisted(() => ({
  post: vi.fn(),
  get: vi.fn(),
}));

vi.mock('../lib/axios', () => ({
  default: { post, get },
}));

import { useAuthStore } from './authStore';
import { session } from '../lib/session';

const usuario = {
  id: 1,
  username: 'admin',
  email: 'admin@test.local',
  nombre: 'Super',
  apellidos: 'Administrador',
  roles: ['ADMIN'],
  permissions: [],
};

describe('authStore', () => {
  beforeEach(() => {
    localStorage.clear();
    session.clear();
    post.mockReset().mockResolvedValue({ data: {} });
    get.mockReset();
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      hydrated: true,
    });
  });

  it('guarda el access token solo en memoria y el perfil en localStorage', () => {
    useAuthStore.getState().setAuth(usuario, 'access-1');

    expect(session.getToken()).toBe('access-1');
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
    expect(JSON.parse(localStorage.getItem('user') || '{}').username).toBe('admin');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('un ADMIN tiene cualquier permiso', () => {
    useAuthStore.getState().setAuth(usuario, 'access');

    expect(useAuthStore.getState().isAdmin()).toBe(true);
    expect(useAuthStore.getState().hasPermission('USER_MANAGE')).toBe(true);
    expect(useAuthStore.getState().hasRole('ADMIN')).toBe(true);
    expect(useAuthStore.getState().hasRole('ROLE_ADMIN')).toBe(true);
  });

  it('un usuario normal solo tiene sus permisos', () => {
    useAuthStore.getState().setAuth(
      { ...usuario, roles: ['TECNICO'], permissions: ['TICKET_VIEW_ALL'] },
      'access',
    );

    expect(useAuthStore.getState().isAdmin()).toBe(false);
    expect(useAuthStore.getState().hasPermission('TICKET_VIEW_ALL')).toBe(true);
    expect(useAuthStore.getState().hasPermission('USER_MANAGE')).toBe(false);
  });

  it('logout revoca la cookie de refresh y limpia la sesión', () => {
    useAuthStore.getState().setAuth(usuario, 'access');

    useAuthStore.getState().logout();

    expect(post).toHaveBeenCalledWith('/auth/logout', {}, { withCredentials: true });
    expect(session.getToken()).toBeNull();
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('refreshMe actualiza roles y permisos desde el backend', async () => {
    useAuthStore.getState().setAuth(usuario, 'access');
    get.mockResolvedValue({
      data: { ...usuario, roles: ['SUPERVISOR'], permissions: ['REPORT_VIEW'] },
    });

    await useAuthStore.getState().refreshMe();

    expect(useAuthStore.getState().user?.roles).toEqual(['SUPERVISOR']);
    expect(useAuthStore.getState().user?.permissions).toEqual(['REPORT_VIEW']);
  });
});
