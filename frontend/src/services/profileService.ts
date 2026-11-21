import api from '../lib/axios';

/** Perfil, avatar y preferencias del usuario autenticado. */
export const profileService = {
  update: (payload: Record<string, unknown>) => api.put('/users/me', payload),

  uploadAvatar: (form: FormData) =>
    api.post('/users/me/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  deleteAvatar: () => api.delete('/users/me/avatar'),

  getNotificationPreferences: () => api.get('/users/me/notifications'),

  updateNotificationPreferences: (preferences: Record<string, unknown>) =>
    api.put('/users/me/notifications', { preferences }),
};
