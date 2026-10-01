import { create } from 'zustand';
import api from '../lib/axios';

export interface User {
  id: number;
  username: string;
  email: string;
  nombre: string;
  apellidos: string;
  activo: boolean;
  roles: string[];
  ultimaConexion?: string | null;
  estadoConexion?: 'CONECTADO' | 'AUSENTE' | 'DESCONECTADO' | string;
  dispositivoTipo?: 'PC' | 'MOVIL' | 'TABLET' | string | null;
  dispositivoModelo?: string | null;
  dispositivoSo?: string | null;
  navegador?: string | null;
  ipUltima?: string | null;
}

interface UserState {
  users: User[];
  technicians: User[];
  loading: boolean;
  error: string | null;
  fetchUsers: () => Promise<void>;
  fetchTechnicians: () => Promise<void>;
  createUser: (data: any) => Promise<void>;
  updateUser: (id: number, data: any) => Promise<void>;
  deleteUser: (id: number) => Promise<void>;
}

export const useUserStore = create<UserState>((set) => ({
  users: [],
  technicians: [],
  loading: false,
  error: null,

  fetchUsers: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/users?size=100');
      set({ users: response.data.content || response.data, loading: false });
    } catch (err) {
      console.error(err);
      set({ error: 'Error al cargar usuarios', loading: false });
    }
  },

  fetchTechnicians: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/users/role/TECNICO');
      set({ technicians: response.data || [], loading: false });
    } catch (err) {
      console.error(err);
      set({ error: 'Error al cargar técnicos', loading: false });
    }
  },

  createUser: async (data) => {
    set({ loading: true, error: null });
    try {
      await api.post('/users', data);
      const response = await api.get('/users?size=100');
      set({ users: response.data.content || response.data, loading: false });
    } catch (err: any) {
      console.error("FULL ERROR OBJECT:", err);
      if (err.response) {
        console.error("SERVER DATA:", JSON.stringify(err.response.data));
      }
      set({ error: err.response?.data?.message || 'Error al crear usuario', loading: false });
      throw err;
    }
  },

  updateUser: async (id, data) => {
    set({ loading: true, error: null });
    try {
      await api.put(`/users/${id}`, data);
      const response = await api.get('/users?size=100');
      set({ users: response.data.content || response.data, loading: false });
    } catch (err: any) {
      console.error(err);
      set({ error: err.response?.data?.message || 'Error al actualizar usuario', loading: false });
      throw err;
    }
  },

  deleteUser: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/users/${id}`);
      set(state => ({
        users: state.users.filter(u => u.id !== id),
        loading: false
      }));
    } catch (err: any) {
      console.error(err);
      set({ error: err.response?.data?.message || 'Error al eliminar usuario', loading: false });
      throw err;
    }
  }
}));
