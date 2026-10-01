import { create } from 'zustand';
import api from '../lib/axios';

export interface Sede {
  id: number;
  nombre: string;
  descripcion: string | null;
  entidadId: number;
  entidadNombre: string;
}

export interface SedeItem {
  id: number;
  nombre: string;
  descripcion: string | null;
}

export interface Entidad {
  id: number;
  nombre: string;
  sedes: SedeItem[];
}

export interface SedePayload {
  nombre: string;
  descripcion?: string;
}

export interface EntidadPayload {
  nombre: string;
  sedes: SedePayload[];
}

interface CatalogState {
  sedes: Sede[];
  entidades: Entidad[];
  loading: boolean;
  error: string | null;
  fetchSedes: () => Promise<void>;
  fetchEntidades: () => Promise<void>;
  createSede: (data: { entidadNombre: string; nombre: string; descripcion?: string }) => Promise<void>;
  updateSede: (id: number, data: { entidadNombre: string; nombre: string; descripcion?: string }) => Promise<void>;
  deleteSede: (id: number) => Promise<void>;
  createEntidad: (data: EntidadPayload) => Promise<void>;
  updateEntidad: (id: number, data: EntidadPayload) => Promise<void>;
  deleteEntidad: (id: number) => Promise<void>;
}

export const useCatalogStore = create<CatalogState>((set, get) => ({
  sedes: [],
  entidades: [],
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

  fetchEntidades: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/catalog/entidades');
      set({ entidades: response.data || [], loading: false });
    } catch (err) {
      console.error(err);
      set({ error: 'Error al cargar las entidades', loading: false });
    }
  },

  createSede: async (data) => {
    set({ loading: true, error: null });
    try {
      await api.post('/catalog/sedes', data);
      await Promise.all([get().fetchSedes(), get().fetchEntidades()]);
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
      await Promise.all([get().fetchSedes(), get().fetchEntidades()]);
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
      await get().fetchEntidades();
    } catch (err: any) {
      console.error(err);
      set({ error: err.response?.data?.message || 'Error al eliminar la sede', loading: false });
      throw err;
    }
  },

  createEntidad: async (data) => {
    set({ loading: true, error: null });
    try {
      await api.post('/catalog/entidades', data);
      await Promise.all([get().fetchEntidades(), get().fetchSedes()]);
    } catch (err: any) {
      console.error(err);
      set({ error: err.response?.data?.message || 'Error al registrar la entidad', loading: false });
      throw err;
    }
  },

  updateEntidad: async (id, data) => {
    set({ loading: true, error: null });
    try {
      await api.put(`/catalog/entidades/${id}`, data);
      await Promise.all([get().fetchEntidades(), get().fetchSedes()]);
    } catch (err: any) {
      console.error(err);
      set({ error: err.response?.data?.message || 'Error al actualizar la entidad', loading: false });
      throw err;
    }
  },

  deleteEntidad: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/catalog/entidades/${id}`);
      set((state) => ({ entidades: state.entidades.filter((e) => e.id !== id), loading: false }));
      await get().fetchSedes();
    } catch (err: any) {
      console.error(err);
      set({ error: err.response?.data?.message || 'Error al eliminar la entidad', loading: false });
      throw err;
    }
  },
}));