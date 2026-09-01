package com.empresa.helpdesk.modules.chat.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/** Respuesta REST con los mensajes no leídos del usuario autenticado. */
@Data
@Builder
public class UnreadCountResponse {
    private long total;
    private List<UnreadPerTicket> porTicket;

    @Data
    @Builder
    public static class UnreadPerTicket {
        private Long ticketId;
        private String ticketCodigo;
        private String ticketTitulo;
        private long noLeidos;
    }
}
