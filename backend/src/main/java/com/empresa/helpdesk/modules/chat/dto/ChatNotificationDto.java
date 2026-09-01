package com.empresa.helpdesk.modules.chat.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Notificación en tiempo real de un mensaje nuevo en el chat de un ticket.
 * Se entrega en la cola privada del destinatario: /user/{username}/queue/chat
 */
@Data
@Builder
public class ChatNotificationDto {
    public static final String TIPO_NUEVO_MENSAJE = "NUEVO_MENSAJE";
    public static final String TIPO_LECTURA = "LECTURA";

    private String tipo;
    private Long ticketId;
    private String ticketCodigo;
    private String ticketTitulo;
    private Long mensajeId;
    private Long remitenteId;
    private String remitenteNombre;
    private String contenido;
    private LocalDateTime fechaEnvio;
    private String adjuntoUrl;
    /** Solo para LECTURA: quién leyó y cuántos mensajes marcó como leídos */
    private Long lectorId;
    private String lectorNombre;
    private Integer mensajesLeidos;
    private LocalDateTime fechaLectura;
}
