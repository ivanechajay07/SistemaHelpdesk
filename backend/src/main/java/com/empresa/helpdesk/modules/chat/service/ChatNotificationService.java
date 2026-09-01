package com.empresa.helpdesk.modules.chat.service;

import com.empresa.helpdesk.modules.chat.dto.ChatMessageResponse;
import com.empresa.helpdesk.modules.chat.dto.ChatNotificationDto;
import com.empresa.helpdesk.modules.chat.entity.Message;
import com.empresa.helpdesk.modules.ticket.entity.Ticket;
import com.empresa.helpdesk.modules.user.entity.User;
import com.empresa.helpdesk.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Envía notificaciones en tiempo real por WebSocket (STOMP):
 *  - NUEVO_MENSAJE -> cola privada del destinatario: /user/{username}/queue/chat
 *    (alimente el icono de chat con el badge de "no leídos").
 *  - LECTURA       -> difunde a los participantes del ticket: /topic/ticket/{id}/lectura
 *    (para que el remitente vea el recibo "Visto" al instante).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ChatNotificationService {

    public static final String QUEUE_CHAT = "/queue/chat";
    public static final String TOPIC_LECTURA_TEMPLATE = "/topic/ticket/%d/lectura";

    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;

    /** Notifica a cada participante (excepto el remitente) que llegó un mensaje nuevo. */
    public void notificarNuevoMensaje(Ticket ticket, Message mensaje, ChatMessageResponse response) {
        ChatNotificationDto payload = ChatNotificationDto.builder()
                .tipo(ChatNotificationDto.TIPO_NUEVO_MENSAJE)
                .ticketId(ticket.getId())
                .ticketCodigo(ticket.getCodigo())
                .ticketTitulo(ticket.getTitulo())
                .mensajeId(mensaje.getId())
                .remitenteId(response.getRemitenteId())
                .remitenteNombre(response.getRemitenteNombre())
                .contenido(response.getContenido())
                .fechaEnvio(response.getFechaEnvio() != null ? response.getFechaEnvio() : LocalDateTime.now())
                .adjuntoUrl(response.getAdjuntoUrl())
                .build();

        for (User destinatario : resolverDestinatarios(ticket)) {
            if (destinatario.getId().equals(response.getRemitenteId())) {
                continue; // no se notifica a sí mismo
            }
            try {
                messagingTemplate.convertAndSendToUser(
                        destinatario.getUsername(), QUEUE_CHAT, payload);
                log.debug("Notificación de nuevo mensaje enviada a {} para el ticket {}",
                        destinatario.getUsername(), ticket.getId());
            } catch (Exception e) {
                log.warn("No se pudo enviar la notificación de chat a {}: {}",
                        destinatario.getUsername(), e.getMessage());
            }
        }
    }

    /** Difunde que un participante leyó los mensajes del ticket (recibo "Visto"). */
    public void notificarLectura(Ticket ticket, User lector, int mensajesLeidos) {
        ChatNotificationDto payload = ChatNotificationDto.builder()
                .tipo(ChatNotificationDto.TIPO_LECTURA)
                .ticketId(ticket.getId())
                .lectorId(lector.getId())
                .lectorNombre(lector.getNombre() + " " + lector.getApellidos())
                .mensajesLeidos(mensajesLeidos)
                .fechaLectura(LocalDateTime.now())
                .build();

        try {
            messagingTemplate.convertAndSend(
                    String.format(TOPIC_LECTURA_TEMPLATE, ticket.getId()), payload);
        } catch (Exception e) {
            log.warn("No se pudo difundir la lectura del ticket {}: {}", ticket.getId(), e.getMessage());
        }
    }

    /**
     * Participantes del chat: solicitante y técnico asignado.
     * Se recargan desde la BD por id para evitar LazyInitializationException
     * en los hilos de WebSocket (no hay OpenSessionInView ahí).
     */
    private List<User> resolverDestinatarios(Ticket ticket) {
        List<User> participantes = new ArrayList<>();
        if (ticket.getSolicitante() != null) {
            userRepository.findById(ticket.getSolicitante().getId()).ifPresent(participantes::add);
        }
        if (ticket.getTecnico() != null) {
            userRepository.findById(ticket.getTecnico().getId()).ifPresent(participantes::add);
        }
        return participantes;
    }
}
