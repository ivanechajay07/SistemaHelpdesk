import api from '../lib/axios';

/** Configuración global y automatizaciones del sistema. */
export const settingsService = {
  getAutomation: () => api.get('/settings/automation'),

  updateAutomation: (automation: Record<string, unknown>) =>
    api.put('/settings/automation', automation),
};
