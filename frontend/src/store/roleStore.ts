import { create } from 'zustand';
import api from '../lib/axios';

export interface Permission {
  id: number;
  name: string;
  description: string;
}

export interface Role {
  id: number;
  name: string;
  description: string;
  permissions: Permission[];
}

interface RoleState {
  roles: Role[];
  permissions: Permission[];
  isLoading: boolean;
  error: string | null;
  fetchRoles: () => Promise<void>;
  fetchPermissions: () => Promise<void>;
  updateRolePermissions: (roleId: number, permissionIds: number[]) => Promise<void>;
}

export const useRoleStore = create<RoleState>((set) => ({
  roles: [],
  permissions: [],
  isLoading: false,
  error: null,

  fetchRoles: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/roles');
      set({ roles: response.data, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Error al cargar roles', isLoading: false });
    }
  },

  fetchPermissions: async () => {
    try {
      const response = await api.get('/roles/permissions');
      set({ permissions: response.data });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Error al cargar permisos' });
    }
  },

  updateRolePermissions: async (roleId, permissionIds) => {
    set({ isLoading: true, error: null });
    try {
      await api.put(`/roles/${roleId}/permissions`, { permissionIds });
      const response = await api.get('/roles');
      set({ roles: response.data, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Error al actualizar permisos', isLoading: false });
      throw err;
    }
  },
}));
