package com.empresa.helpdesk.modules.chat.dto;

import lombok.Data;

@Data
public class ChatMessageRequest {
    private String contenido;
    private Long remitenteId;
    private String adjuntoUrl;
}
