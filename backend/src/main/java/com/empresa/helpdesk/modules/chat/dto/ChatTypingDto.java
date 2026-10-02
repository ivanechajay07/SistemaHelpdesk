package com.empresa.helpdesk.modules.chat.dto;

/** Evento "escribiendo…" difundido a los participantes del ticket. */
public record ChatTypingDto(
        Long usuarioId,
        String usuarioNombre,
        boolean typing
) {
}
