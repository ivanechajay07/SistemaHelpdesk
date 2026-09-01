import { create } from 'zustand';
import api from '../lib/axios';

export interface Sede {
  id: number;
  nombre: string;
  descripcion: string | null;
  entidadId: number;
  entidadNombre: string;
}

interface CatalogState {
  sedes: Sede[];
  loading: boolean;
  error: string | null;
  fetchSedes: () => Promise<void>;
  createSede: (data: { entidadNombre: string; nombre: string; descripcion?: string }) => Promise<void>;
  updateSede: (id: number, data: { entidadNombre: string; nombre: string; descripcion?: string }) => Promise<void>;
  deleteSede: (id: number) => Promise<void>;
}

export const useCatalogStore = create<CatalogState>((set, get) => ({
  sedes: [],
  loading: false,
  error: null,

  fetchSedes: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/catalog/sedes');
      set({ sedes: response.data || [], loading: false });
    } catch (err) {
      console.error(err);
      set({ error: 'Error al cargar las sedes', loading: false });
    }
  },

  createSede: async (data) => {
    set({ loading: true, error: null });
    try {
      await api.post('/catalog/sedes', data);
      await get().fetchSedes();
    } catch (err: any) {
      console.error(err);
      set({ error: err.response?.data?.message || 'Error al registrar la sede', loading: false });
      throw err;
    }
  },

  updateSede: async (id, data) => {
    set({ loading: true, error: null });
    try {
      await api.put(`/catalog/sedes/${id}`, data);
      await get().fetchSedes();
    } catch (err: any) {
      console.error(err);
      set({ error: err.response?.data?.message || 'Error al actualizar la sede', loading: false });
      throw err;
    }
  },

  deleteSede: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/catalog/sedes/${id}`);
      set((state) => ({ sedes: state.sedes.filter((s) => s.id !== id), loading: false }));
    } catch (err: any) {
      console.error(err);
      set({ error: err.response?.data?.message || 'Error al eliminar la sede', loading: false });
      throw err;
    }
  },
}));
