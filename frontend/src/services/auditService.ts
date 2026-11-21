import api from '../lib/axios';

export interface AuditQuery {
  q?: string;
  page: number;
  size: number;
}

/** Consulta del registro de auditoría (solo administración). */
export const auditService = {
  list: (params: AuditQuery) => api.get('/audit', { params }),
};
