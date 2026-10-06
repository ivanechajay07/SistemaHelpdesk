import { create } from 'zustand';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import api from '../lib/axios';

const socketBase = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api/v1', '')
  : 'http://localhost:8081';

let stompClient: Client | null = null;

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
  realtimeConnected: boolean;
  fetchTargets: () => Promise<void>;
  fetchDashboard: () => Promise<void>;
  createTarget: (data: MonitoredTargetRequest) => Promise<void>;
  updateTarget: (id: number, data: MonitoredTargetRequest) => Promise<void>;
  deleteTarget: (id: number) => Promise<void>;
  checkNow: (id: number) => Promise<MonitoredTarget>;
  connectRealtime: (token: string) => void;
  disconnectRealtime: () => void;
  applyRealtimeTarget: (t: MonitoredTarget) => void;
}

export const useMonitoringStore = create<MonitoringState>((set, get) => ({
  targets: [],
  loading: false,
  error: null,
  dashboard: null,
  dashboardLoading: false,
  realtimeConnected: false,

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

  /** Aplica el estado recibido en tiempo real (upsert por id). */
  applyRealtimeTarget: (t) => set((state) => {
    const exists = state.targets.some((x) => x.id === t.id);
    return {
      targets: exists
        ? state.targets.map((x) => (x.id === t.id ? { ...x, ...t } : x))
        : [t, ...state.targets],
    };
  }),

  /** Suscribe el estado de los objetivos en tiempo real vía WebSocket. */
  connectRealtime: (token) => {
    if (!token || (stompClient && stompClient.active)) return;
    const client = new Client({
      webSocketFactory: () => new SockJS(`${socketBase}/ws/chat`),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => {
        set({ realtimeConnected: true });
        client.subscribe('/topic/monitoring', (message) => {
          try {
            const target: MonitoredTarget = JSON.parse(message.body);
            if (target && target.id != null) get().applyRealtimeTarget(target);
          } catch {
            /* payload inválido */
          }
        });
      },
      onWebSocketClose: () => set({ realtimeConnected: false }),
      onStompError: () => set({ realtimeConnected: false }),
    });
    client.activate();
    stompClient = client;
  },

  disconnectRealtime: () => {
    if (stompClient) {
      stompClient.deactivate().catch(() => {});
      stompClient = null;
    }
    set({ realtimeConnected: false });
  },
}));
