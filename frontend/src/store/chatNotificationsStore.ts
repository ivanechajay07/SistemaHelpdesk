import { create } from 'zustand';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import api from '../lib/axios';
import { session } from '../lib/session';
import { notificarMensajeChat } from '../lib/notifications';
import { pushActivo } from '../lib/push';
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

export interface AppNotificationEvent {
  tipo: string;
  accion?: string;
  titulo?: string;
  mensaje?: string;
  ticketId?: number | null;
  fecha?: string;
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

/** Mensaje reciente recibido (para el feed del panel de chat). */
export interface RecentChatMessage {
  mensajeId?: number;
  ticketId: number;
  ticketCodigo?: string | null;
  ticketTitulo?: string | null;
  remitenteNombre?: string | null;
  contenido?: string | null;
  fechaEnvio?: string | null;
  adjuntoUrl?: string | null;
}

interface ChatNotificationsState {
  connected: boolean;
  totalUnread: number;
  unreadByTicket: Record<number, ChatUnreadEntry>;
  recentMessages: RecentChatMessage[];
  lastEvent: (ChatNotificationEvent & { receivedAt: number }) | null;
  lastAppNotification: (AppNotificationEvent & { receivedAt: number }) | null;
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
  recentMessages: [],
  lastEvent: null,
  lastAppNotification: null,

  /** Conecta el socket global de notificaciones de chat (una sola vez por sesión). */
  connect: (token) => {
    if (!token || (stompClient && stompClient.active)) return;

    const client = new Client({
      webSocketFactory: () => new SockJS(`${socketBase}/ws/chat`),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      beforeConnect: () => {
        // Tras un refresh de sesión, reconectar con el token vigente.
        const actual = session.getToken();
        if (actual) {
          client.connectHeaders = { Authorization: `Bearer ${actual}` };
        }
      },
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

            // Feed de mensajes recientes (persiste aunque se marquen como leídos).
            // Se ordena por fecha descendente para que el más nuevo quede arriba,
            // incluso si un evento llega con retraso.
            const recientes = [
              {
                mensajeId: event.mensajeId,
                ticketId: event.ticketId,
                ticketCodigo: event.ticketCodigo,
                ticketTitulo: event.ticketTitulo,
                remitenteNombre: event.remitenteNombre,
                contenido: event.contenido,
                fechaEnvio: event.fechaEnvio,
                adjuntoUrl: event.adjuntoUrl,
              },
              ...get().recentMessages.filter((m) => m.mensajeId !== event.mensajeId),
            ]
              .sort((a, b) => {
                const fa = a.fechaEnvio ? new Date(a.fechaEnvio).getTime() : 0;
                const fb = b.fechaEnvio ? new Date(b.fechaEnvio).getTime() : 0;
                return fb - fa;
              })
              .slice(0, 20);
            set({ recentMessages: recientes });

            // Notificación del sistema en la APK (con sonido). Con FCM activo
            // no se duplica: el push llega por Firebase cuando la app no está
            // en primer plano. No se muestra si el usuario ya lee ese ticket.
            const viendoEseTicket = window.location.pathname === `/tickets/${event.ticketId}`;
            if (
              !pushActivo() &&
              (!viendoEseTicket || document.visibilityState !== 'visible')
            ) {
              void notificarMensajeChat({
                ticketId: event.ticketId,
                remitente: event.remitenteNombre,
                contenido: event.contenido,
                tieneAdjunto: !!event.adjuntoUrl,
                ticketCodigo: event.ticketCodigo,
              });
            }

            set({
              lastEvent: { ...event, receivedAt: Date.now() },
            });
          } catch {
            /* payload inválido */
          }
        });

        // Eventos de ticket en tiempo real para la campana de notificaciones
        client.subscribe('/user/queue/notifications', (message) => {
          try {
            const event: AppNotificationEvent = JSON.parse(message.body);
            set({ lastAppNotification: { ...event, receivedAt: Date.now() } });
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
