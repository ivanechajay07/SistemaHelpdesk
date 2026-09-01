import { create } from 'zustand';
import api from '../lib/axios';

export interface KnowledgeArticle {
  id: number;
  titulo: string;
  contenido: string;
  categoria?: string;
  autorNombre?: string;
  vistas: number;
  publicado: boolean;
  fechaCreacion: string;
  fechaActualizacion?: string;
}

interface KnowledgeArticleRequest {
  titulo: string;
  contenido: string;
  categoria?: string;
  publicado?: boolean;
}

interface KnowledgeState {
  articles: KnowledgeArticle[];
  loading: boolean;
  error: string | null;
  fetchArticles: (search?: string, all?: boolean) => Promise<void>;
  createArticle: (data: KnowledgeArticleRequest) => Promise<void>;
  updateArticle: (id: number, data: KnowledgeArticleRequest) => Promise<void>;
  deleteArticle: (id: number) => Promise<void>;
}

export const useKnowledgeStore = create<KnowledgeState>((set) => ({
  articles: [],
  loading: false,
  error: null,

  fetchArticles: async (search?: string, all?: boolean) => {
    set({ loading: true, error: null });
    try {
      const params: Record<string, unknown> = {};
      if (search && search.trim()) params.search = search.trim();
      if (all) params.all = true;
      const response = await api.get('/knowledge', { params });
      set({ articles: response.data, loading: false });
    } catch (err) {
      console.error(err);
      set({ error: 'Error al cargar los artículos', loading: false });
    }
  },

  createArticle: async (data) => {
    await api.post('/knowledge', data);
  },

  updateArticle: async (id, data) => {
    await api.put(`/knowledge/${id}`, data);
  },

  deleteArticle: async (id) => {
    await api.delete(`/knowledge/${id}`);
  },
}));
