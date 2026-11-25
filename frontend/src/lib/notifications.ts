import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

/**
 * Notificaciones del sistema dentro de la APK.
 *
 * En web no hace nada: ahí se usan los avisos internos (toast + sonido).
 * En Android crea un canal con sonido y muestra una notificación heads-up
 * cuando llega un mensaje de chat o un aviso de ticket.
 */
export const notificacionesNativas = Capacitor.isNativePlatform();

const CANAL = 'helpdesk-tickets';

let inicializado = false;

export async function initNotificaciones(): Promise<void> {
  if (!notificacionesNativas || inicializado) return;
  try {
    const actual = await LocalNotifications.checkPermissions();
    if (actual.display !== 'granted') {
      await LocalNotifications.requestPermissions();
    }

    if (Capacitor.getPlatform() === 'android') {
      const { channels } = await LocalNotifications.listChannels();
      if (!channels.some((canal) => canal.id === CANAL)) {
        await LocalNotifications.createChannel({
          id: CANAL,
          name: 'Mensajes y tickets',
          description: 'Nuevos mensajes de chat y avisos de tickets',
          importance: 5,
          visibility: 1,
          vibration: true,
          lights: true,
          lightColor: '#22c55e',
        });
      }
    }

    inicializado = true;
  } catch {
    // Permiso denegado o plugin no disponible: la app sigue funcionando.
  }
}

const idNotificacion = () => Math.floor(Date.now() % 2147483647);

const recortar = (texto?: string | null, largo = 160): string => {
  if (!texto) return '';
  const limpio = texto.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  return limpio.length > largo ? `${limpio.slice(0, largo)}…` : limpio;
};

async function mostrar(titulo: string, cuerpo: string, ticketId?: number): Promise<void> {
  if (!notificacionesNativas) return;
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: idNotificacion(),
          title: titulo,
          body: cuerpo || 'Tienes una novedad en HelpDesk',
          channelId: CANAL,
          smallIcon: 'ic_stat_helpdesk',
          extra: { ticketId: ticketId ?? null },
        },
      ],
    });
  } catch {
    // Sin permiso de notificaciones: se ignora.
  }
}

export async function notificarMensajeChat(datos: {
  ticketId: number;
  remitente?: string | null;
  contenido?: string | null;
  tieneAdjunto?: boolean;
  ticketCodigo?: string | null;
}): Promise<void> {
  const titulo = `Nuevo mensaje de ${datos.remitente || 'un usuario'}`;
  const cuerpo = datos.tieneAdjunto && !datos.contenido
    ? 'Archivo adjunto'
    : `${datos.ticketCodigo ? `${datos.ticketCodigo}: ` : ''}${recortar(datos.contenido)}`;
  await mostrar(titulo, cuerpo, datos.ticketId);
}

export async function notificarEventoTicket(datos: {
  titulo?: string | null;
  mensaje?: string | null;
  ticketId?: number | null;
}): Promise<void> {
  if (!datos.titulo) return;
  await mostrar(datos.titulo, recortar(datos.mensaje), datos.ticketId ?? undefined);
}

/** Abre el ticket cuando el usuario toca la notificación. Devuelve el cleanup. */
export async function alTocarNotificacion(
  handler: (ticketId: number) => void,
): Promise<() => void> {
  if (!notificacionesNativas) return () => {};

  const listener = await LocalNotifications.addListener(
    'localNotificationActionPerformed',
    (action) => {
      const ticketId = Number(action.notification.extra?.ticketId);
      if (ticketId) handler(ticketId);
    },
  );

  return () => {
    void listener.remove();
  };
}
