import api from '../lib/axios';

/** Acceso a tickets, mensajes y adjuntos del chat. */
export const ticketService = {
  getById: (id: number | string) => api.get(`/tickets/${id}`),

  getMessages: (id: number | string) => api.get(`/tickets/${id}/messages`),

  markMessagesRead: (id: number | string) =>
    api.post(`/tickets/${id}/messages/read`),

  uploadAttachment: (formData: FormData) =>
    api.post('/chat/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  rate: (id: number | string, puntaje: number, comentario?: string | null) =>
    api.post(`/tickets/${id}/rating`, { puntaje, comentario: comentario || null }),
};
