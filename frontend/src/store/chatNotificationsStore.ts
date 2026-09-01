import { create } from 'zustand';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import api from '../lib/axios';

export interface ChatNotificationEvent {
  tipo: string;
  ticketId: number;
  ticketCodigo?: string | null;
  ticketTitulo?: string | null;
  mensajeId?: number;
  remitenteId?: number;
  remitenteNombre?: string;
  contenido?: string;
  fechaEnvio?: string;
  adjuntoUrl?: string | null;
  lectorId?: number;
  lectorNombre?: string;
  mensajesLeidos?: number;
  fechaLectura?: string;
}

export interface ChatUnreadEntry {
  ticketId: number;
  ticketCodigo: string | null;
  ticketTitulo: string | null;
  noLeidos: number;
  ultimoRemitente?: string | null;
  ultimoContenido?: string | null;
  ultimaFecha?: string | null;
}

interface ChatNotificationsState {
  connected: boolean;
  totalUnread: number;
  unreadByTicket: Record<number, ChatUnreadEntry>;
  lastEvent: (ChatNotificationEvent & { receivedAt: number }) | null;
  connect: (token: string) => void;
  disconnect: () => void;
  fetchUnreadCounts: () => Promise<void>;
  clearTicketUnread: (ticketId: number) => void;
}

let stompClient: Client | null = null;

const socketBase = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api/v1', '')
  : 'http://localhost:8081';

const recomputeTotal = (byTicket: Record<number, ChatUnreadEntry>) =>
  Object.values(byTicket).reduce((acc, e) => acc + e.noLeidos, 0);

export const useChatNotificationsStore = create<ChatNotificationsState>((set, get) => ({
  connected: false,
  totalUnread: 0,
  unreadByTicket: {},
  lastEvent: null,

  /** Conecta el socket global de notificaciones de chat (una sola vez por sesión). */
  connect: (token) => {
    if (!token || (stompClient && stompClient.active)) return;

    const client = new Client({
      webSocketFactory: () => new SockJS(`${socketBase}/ws/chat`),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => {
        set({ connected: true });

        // Notificaciones privadas de mensajes nuevos (solo las recibe el destinatario)
        client.subscribe('/user/queue/chat', (message) => {
          try {
            const event: ChatNotificationEvent = JSON.parse(message.body);
            if (event.tipo !== 'NUEVO_MENSAJE' || !event.ticketId) return;

            const prev = { ...get().unreadByTicket };
            const existing = prev[event.ticketId];
            prev[event.ticketId] = {
              ticketId: event.ticketId,
              ticketCodigo: event.ticketCodigo ?? existing?.ticketCodigo ?? null,
              ticketTitulo: event.ticketTitulo ?? existing?.ticketTitulo ?? null,
              noLeidos: (existing?.noLeidos ?? 0) + 1,
              ultimoRemitente: event.remitenteNombre ?? existing?.ultimoRemitente ?? null,
              ultimoContenido: event.contenido ?? existing?.ultimoContenido ?? null,
              ultimaFecha: event.fechaEnvio ?? existing?.ultimaFecha ?? null,
            };
            set({ unreadByTicket: prev, totalUnread: recomputeTotal(prev) });

            set({
              lastEvent: { ...event, receivedAt: Date.now() },
            });
          } catch {
            /* payload inválido */
          }
        });

        get().fetchUnreadCounts();
      },
      onWebSocketClose: () => set({ connected: false }),
      onStompError: (frame) => {
        console.error('Error STOMP (notificaciones de chat): ' + frame.headers['message']);
      },
    });

    client.activate();
    stompClient = client;
  },

  disconnect: () => {
    if (stompClient) {
      stompClient.deactivate().catch(() => {});
      stompClient = null;
    }
    set({ connected: false });
  },

  fetchUnreadCounts: async () => {
    try {
      const { data } = await api.get<{ total: number; porTicket: Array<{
        ticketId: number; ticketCodigo: string | null; ticketTitulo: string | null; noLeidos: number;
      }> }>('/chat/unread-counts');

      const byTicket: Record<number, ChatUnreadEntry> = {};
      data.porTicket.forEach((t) => {
        byTicket[t.ticketId] = {
          ticketId: t.ticketId,
          ticketCodigo: t.ticketCodigo,
          ticketTitulo: t.ticketTitulo,
          noLeidos: t.noLeidos,
        };
      });
      set({ unreadByTicket: byTicket, totalUnread: recomputeTotal(byTicket) });
    } catch {
      /* silencioso */
    }
  },

  clearTicketUnread: (ticketId) => {
    const prev = { ...get().unreadByTicket };
    if (!prev[ticketId]) return;
    delete prev[ticketId];
    set({ unreadByTicket: prev, totalUnread: recomputeTotal(prev) });
  },
}));
