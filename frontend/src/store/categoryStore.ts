import { create } from 'zustand';
import api from '../lib/axios';

export interface Subcategory {
  id: number;
  name: string;
  active: boolean;
}

export interface Category {
  id: number;
  name: string;
  description: string;
  active: boolean;
  subcategories: Subcategory[];
}

interface CategoryState {
  categories: Category[];
  loading: boolean;
  error: string | null;
  fetchCategories: () => Promise<void>;
  createCategory: (data: any) => Promise<void>;
  updateCategory: (id: number, data: any) => Promise<void>;
  deleteCategory: (id: number) => Promise<void>;
}

export const useCategoryStore = create<CategoryState>((set) => ({
  categories: [],
  loading: false,
  error: null,

  fetchCategories: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/categories');
      set({ categories: response.data, loading: false });
    } catch (err) {
      console.error(err);
      set({ error: 'Error al cargar categorías', loading: false });
    }
  },

  createCategory: async (data) => {
    set({ loading: true, error: null });
    try {
      await api.post('/categories', data);
      const response = await api.get('/categories');
      set({ categories: response.data, loading: false });
    } catch (err: any) {
      console.error(err);
      set({ error: err.response?.data?.message || 'Error al crear categoría', loading: false });
      throw err;
    }
  },

  updateCategory: async (id, data) => {
    set({ loading: true, error: null });
    try {
      await api.put(`/categories/${id}`, data);
      const response = await api.get('/categories');
      set({ categories: response.data, loading: false });
    } catch (err: any) {
      console.error(err);
      set({ error: err.response?.data?.message || 'Error al actualizar categoría', loading: false });
      throw err;
    }
  },

  deleteCategory: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/categories/${id}`);
      set(state => ({
        categories: state.categories.filter(c => c.id !== id),
        loading: false
      }));
    } catch (err: any) {
      console.error(err);
      set({ error: err.response?.data?.message || 'Error al eliminar categoría', loading: false });
      throw err;
    }
  }
}));
