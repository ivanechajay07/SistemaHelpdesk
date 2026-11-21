import api from '../lib/axios';

/** Actas de conformidad firmadas. */
export const actaService = {
  list: () => api.get('/actas'),

  getTicket: (ticketId: number | string) => api.get(`/tickets/${ticketId}`),

  getByTicket: (ticketId: number | string) => api.get(`/tickets/${ticketId}/acta`),

  create: (ticketId: number | string, payload: Record<string, unknown>) =>
    api.post(`/tickets/${ticketId}/acta`, payload),
};
