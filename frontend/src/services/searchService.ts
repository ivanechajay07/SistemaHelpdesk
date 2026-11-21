import api from '../lib/axios';

/** Búsqueda global de tickets, usuarios y activos. */
export const searchService = {
  search: (query: string) => api.get('/search', { params: { q: query } }),
};
