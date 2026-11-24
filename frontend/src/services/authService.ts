import api from '../lib/axios';

/** Casos de uso de autenticación. Las páginas no deben llamar a axios directamente. */
export const authService = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),

  verifyMfa: (mfaToken: string, code: string) =>
    api.post('/auth/2fa/verify', { mfaToken, code }),

  completeMfaSetup: (mfaSetupToken: string, code: string) =>
    api.post('/auth/2fa/setup/complete', { mfaSetupToken, code }),

  register: (payload: Record<string, unknown>) =>
    api.post('/auth/register', payload),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, newPassword: string) =>
    api.post('/auth/reset-password', { token, newPassword }),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),

  setup2fa: () => api.post('/auth/2fa/setup'),

  enable2fa: (code: string) => api.post('/auth/2fa/enable', { code }),

  disable2fa: (password: string) => api.post('/auth/2fa/disable', { password }),

  revokeOtherSessions: () => api.post('/auth/sessions/revoke-others'),
};
