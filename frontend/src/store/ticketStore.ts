import { create } from 'zustand';
import api from '../lib/axios';

export interface Ticket {
  id: number;
  codigo: string;
  titulo: string;
  descripcion: string;
  estado: string;
  prioridad: string;
  fechaCreacion: string;
  fechaVencimientoSla: string | null;
  usuarioId: number;
  tecnicoId: number | null;
  categoriaNombre: string;
  subcategoriaNombre: string;
  subcategoriaId?: number | null;
  solicitanteNombre: string;
  tecnicoNombre: string;
  entidad: string | null;
  sede: string | null;
  reactivado: boolean;
  fechaResolucion?: string | null;
  fechaCierre?: string | null;
  informeResolucion?: string | null;

  // SLA
  slaLimiteHoras?: number | null;
  slaHorasRestantes?: number | null;
  slaEstado?: 'EN_TIEMPO' | 'POR_VENCER' | 'VENCIDO' | 'CUMPLIDO' | null;

  // CSAT
  calificacion?: number | null;
  comentarioCliente?: string | null;
}

interface TicketState {
  tickets: Ticket[];
  loading: boolean;
  error: string | null;
  fetchTickets: () => Promise<void>;
  createTicket: (data: { titulo: string; descripcion: string; prioridad: string; subcategoriaId: number; entidad?: string; sede?: string }) => Promise<void>;
  updateTicket: (id: number, data: { titulo: string; descripcion: string; prioridad: string; subcategoriaId: number; entidad?: string; sede?: string }) => Promise<void>;
  deleteTicket: (id: number) => Promise<void>;
  resolveTicket: (id: number, resolucion: string) => Promise<void>;
  assignTicket: (ticketId: number, tecnicoId: number) => Promise<void>;
  confirmTicket: (id: number) => Promise<void>;
  reactivateTicket: (id: number) => Promise<void>;
}

const fetchTicketsByRole = async (): Promise<Ticket[]> => {
  const response = await api.get('/tickets?size=100');
  return response.data.content || response.data;
};

export const useTicketStore = create<TicketState>((set) => ({
  tickets: [],
  loading: false,
  error: null,

  fetchTickets: async () => {
    set({ loading: true, error: null });
    try {
      const tickets = await fetchTicketsByRole();
      set({ tickets, loading: false });
    } catch (err) {
      console.error(err);
      set({ error: 'Error al cargar tickets', loading: false });
    }
  },

  createTicket: async (data) => {
    set({ loading: true, error: null });
    try {
      await api.post('/tickets', data);
      const tickets = await fetchTicketsByRole();
      set({ tickets, loading: false });
    } catch (err) {
      console.error(err);
      set({ error: 'Error al crear ticket', loading: false });
      throw err;
    }
  },

  updateTicket: async (id, data) => {
    set({ loading: true, error: null });
    try {
      await api.put(`/tickets/${id}`, data);
      const tickets = await fetchTicketsByRole();
      set({ tickets, loading: false });
    } catch (err) {
      console.error(err);
      set({ error: 'Error al actualizar ticket', loading: false });
      throw err;
    }
  },

  deleteTicket: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/tickets/${id}`);
      set(state => ({
        tickets: state.tickets.filter(t => t.id !== id),
        loading: false
      }));
    } catch (err) {
      console.error(err);
      set({ error: 'Error al eliminar ticket', loading: false });
      throw err;
    }
  },

  resolveTicket: async (id, resolucion) => {
    set({ loading: true, error: null });
    try {
      await api.put(`/tickets/${id}/resolve`, { resolucion });
      const tickets = await fetchTicketsByRole();
      set({ tickets, loading: false });
    } catch (err) {
      console.error(err);
      set({ error: 'Error al resolver ticket', loading: false });
      throw err;
    }
  },

  assignTicket: async (ticketId, tecnicoId) => {
    set({ loading: true, error: null });
    try {
      await api.put(`/tickets/${ticketId}/assign/${tecnicoId}`);
      const tickets = await fetchTicketsByRole();
      set({ tickets, loading: false });
    } catch (err) {
      console.error(err);
      set({ error: 'Error al asignar ticket', loading: false });
      throw err;
    }
  },

  confirmTicket: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.put(`/tickets/${id}/confirm`);
      const tickets = await fetchTicketsByRole();
      set({ tickets, loading: false });
    } catch (err) {
      console.error(err);
      set({ error: 'Error al confirmar la solución del ticket', loading: false });
      throw err;
    }
  },

  reactivateTicket: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.put(`/tickets/${id}/reactivate`);
      const tickets = await fetchTicketsByRole();
      set({ tickets, loading: false });
    } catch (err) {
      console.error(err);
      set({ error: 'Error al reactivar el ticket', loading: false });
      throw err;
    }
  }
}));
