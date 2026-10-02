package com.empresa.helpdesk.modules.notification.dto;

import java.time.LocalDateTime;

/**
 * Evento en tiempo real de ticket enviado a la cola privada del usuario
 * (/user/queue/notifications) para actualizar la campana de notificaciones.
 */
public record TicketEventDto(
        String tipo,
        String accion,
        String titulo,
        String mensaje,
        Long ticketId,
        LocalDateTime fecha
) {
    public static final String TIPO_TICKET_EVENT = "TICKET_EVENT";
}
