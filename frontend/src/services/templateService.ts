import api from '../lib/axios';

export type TemplatePayload = Record<string, unknown>;

/** Plantillas de respuesta rápida. */
export const templateService = {
  list: () => api.get('/templates'),

  create: (payload: TemplatePayload) => api.post('/templates', payload),

  update: (id: number, payload: TemplatePayload) =>
    api.put(`/templates/${id}`, payload),

  remove: (id: number) => api.delete(`/templates/${id}`),
};
