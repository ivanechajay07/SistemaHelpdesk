package com.empresa.helpdesk.modules.chat.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ChatMessageResponse {
    private Long id;
    private String contenido;
    private String remitenteNombre;
    private Long remitenteId;
    private LocalDateTime fechaEnvio;
    private String adjuntoUrl;
    private boolean leido;
}
