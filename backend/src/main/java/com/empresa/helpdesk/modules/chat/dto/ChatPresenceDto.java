package com.empresa.helpdesk.modules.chat.dto;

import java.time.LocalDateTime;

/** Evento de presencia (en línea) difundido a los participantes del ticket. */
public record ChatPresenceDto(
        Long usuarioId,
        String usuarioNombre,
        boolean online,
        LocalDateTime fecha
) {
}
