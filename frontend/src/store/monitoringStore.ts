import { create } from 'zustand';
import api from '../lib/axios';

export type TargetType = 'HTTP' | 'TCP';
export type TargetStatus = 'PENDING' | 'UP' | 'DOWN';

export interface MonitoredTarget {
  id: number;
  nombre: string;
  tipo: TargetType;
  host: string;
  puerto?: number;
  intervaloSegundos: number;
  umbralFallos: number;
  activo: boolean;
  ultimoEstado: TargetStatus;
  ultimaLatenciaMs?: number | null;
  ultimoChequeo?: string | null;
  fallosConsecutivos: number;
  ticketAbiertoId?: number | null;
}

export interface MonitoredTargetRequest {
  nombre: string;
  tipo: TargetType;
  host: string;
  puerto?: number;
  intervaloSegundos?: number;
  umbralFallos?: number;
  activo?: boolean;
}

export interface MonitoringDashboard {
  totalIncidencias: number;
  abiertas: number;
  resueltas: number;
  duracionPromedioMin: number | null;
  porDia: { name: string; value: number }[];
  porMes: { name: string; value: number }[];
  porAnio: { name: string; value: number }[];
  porObjetivo: { name: string; value: number }[];
}

interface MonitoringState {
  targets: MonitoredTarget[];
  loading: boolean;
  error: string | null;
  dashboard: MonitoringDashboard | null;
  dashboardLoading: boolean;
  fetchTargets: () => Promise<void>;
  fetchDashboard: () => Promise<void>;
  createTarget: (data: MonitoredTargetRequest) => Promise<void>;
  updateTarget: (id: number, data: MonitoredTargetRequest) => Promise<void>;
  deleteTarget: (id: number) => Promise<void>;
  checkNow: (id: number) => Promise<MonitoredTarget>;
}

export const useMonitoringStore = create<MonitoringState>((set) => ({
  targets: [],
  loading: false,
  error: null,
  dashboard: null,
  dashboardLoading: false,

  fetchTargets: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/monitoring');
      set({ targets: response.data, loading: false });
    } catch (err) {
      console.error(err);
      set({ error: 'Error al cargar los objetivos', loading: false });
    }
  },

  fetchDashboard: async () => {
    set({ dashboardLoading: true });
    try {
      const response = await api.get('/monitoring/dashboard');
      set({ dashboard: response.data, dashboardLoading: false });
    } catch (err) {
      console.error(err);
      set({ dashboardLoading: false });
    }
  },

  createTarget: async (data) => {
    await api.post('/monitoring', data);
  },

  updateTarget: async (id, data) => {
    await api.put(`/monitoring/${id}`, data);
  },

  deleteTarget: async (id) => {
    await api.delete(`/monitoring/${id}`);
  },

  checkNow: async (id) => {
    const response = await api.post(`/monitoring/${id}/check`);
    return response.data;
  },
}));
