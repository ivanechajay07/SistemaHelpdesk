import { create } from 'zustand';
import api from '../lib/axios';

export interface CuentaCorreo {
  id: number;
  email: string;
  tienePassword: boolean;
}

export interface CorreoCorporativo {
  id: number;
  nombre: string;
  apellidos: string;
  cargo: string;
  empresa: string;
  cuentas: CuentaCorreo[];
}

export interface CuentaPayload {
  email: string;
  password: string;
}

export interface CorreoPayload {
  nombre: string;
  apellidos: string;
  cargo: string;
  empresa: string;
  cuentas: CuentaPayload[];
}

interface CorreoState {
  correos: CorreoCorporativo[];
  loading: boolean;
  error: string | null;
  fetchCorreos: () => Promise<void>;
  createCorreo: (data: CorreoPayload) => Promise<void>;
  updateCorreo: (id: number, data: CorreoPayload) => Promise<void>;
  deleteCorreo: (id: number) => Promise<void>;
  fetchPassword: (correoId: number, cuentaId: number) => Promise<{ email: string; password: string }>;
}

export const useCorreoStore = create<CorreoState>((set, get) => ({
  correos: [],
  loading: false,
  error: null,

  fetchCorreos: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/correos');
      set({ correos: response.data || [], loading: false });
    } catch (err) {
      console.error(err);
      set({ error: 'No se pudo cargar el directorio de correos', loading: false });
    }
  },

  createCorreo: async (data) => {
    set({ loading: true, error: null });
    try {
      await api.post('/correos', data);
      await get().fetchCorreos();
    } catch (err: any) {
      console.error(err);
      set({ error: err.response?.data?.message || 'Error al registrar', loading: false });
      throw err;
    }
  },

  updateCorreo: async (id, data) => {
    set({ loading: true, error: null });
    try {
      await api.put(`/correos/${id}`, data);
      await get().fetchCorreos();
    } catch (err: any) {
      console.error(err);
      set({ error: err.response?.data?.message || 'Error al actualizar', loading: false });
      throw err;
    }
  },

  deleteCorreo: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/correos/${id}`);
      set((state) => ({ correos: state.correos.filter((c) => c.id !== id), loading: false }));
    } catch (err: any) {
      console.error(err);
      set({ error: err.response?.data?.message || 'Error al eliminar', loading: false });
      throw err;
    }
  },

  fetchPassword: async (correoId, cuentaId) => {
    const response = await api.get(`/correos/${correoId}/password/${cuentaId}`);
    return response.data;
  },
}));