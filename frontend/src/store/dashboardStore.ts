import { create } from 'zustand';
import api from '../lib/axios';

interface DashboardStats {
  totalTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  overdueTickets: number;
}

interface TicketVolume {
  name: string;
  tickets: number;
}

export interface TechnicianMonthlyStats {
  tecnicoId: number;
  tecnicoNombre: string;
  total: number;
  meses: number[];
}

interface DashboardState {
  stats: DashboardStats | null;
  volume: TicketVolume[];
  technicianStats: TechnicianMonthlyStats[];
  technicianYear: number;
  isLoading: boolean;
  error: string | null;
  fetchDashboardData: () => Promise<void>;
  fetchTechnicianStats: (year?: number) => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  stats: null,
  volume: [],
  technicianStats: [],
  technicianYear: new Date().getFullYear(),
  isLoading: false,
  error: null,

  fetchDashboardData: async () => {
    set({ isLoading: true, error: null });
    try {
      const [statsRes, volumeRes] = await Promise.all([
        api.get<DashboardStats>('/dashboard/stats'),
        api.get<TicketVolume[]>('/dashboard/chart')
      ]);
      set({
        stats: statsRes.data,
        volume: volumeRes.data,
        isLoading: false
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Error al cargar estadísticas',
        isLoading: false
      });
    }
  },

  fetchTechnicianStats: async (year) => {
    try {
      const y = year ?? new Date().getFullYear();
      const { data } = await api.get<TechnicianMonthlyStats[]>('/dashboard/technician-stats', { params: { year: y } });
      set({ technicianStats: data, technicianYear: y });
    } catch (error: any) {
      console.error(error);
      set({ technicianStats: [] });
    }
  },
}));
