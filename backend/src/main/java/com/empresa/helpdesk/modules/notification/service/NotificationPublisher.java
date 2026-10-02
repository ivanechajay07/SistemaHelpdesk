package com.empresa.helpdesk.modules.notification.service;

import com.empresa.helpdesk.modules.notification.dto.TicketEventDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

/**
 * Publica eventos de ticket en tiempo real por WebSocket (STOMP) hacia la cola
 * privada de cada usuario: /user/{username}/queue/notifications.
 * El cliente actualiza la campana de notificaciones al instante (sin polling).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationPublisher {

    public static final String QUEUE_NOTIFICATIONS = "/queue/notifications";

    private final SimpMessagingTemplate messagingTemplate;

    public void notificarTicket(String username, String accion, String titulo, String mensaje, Long ticketId) {
        if (username == null || username.isBlank()) {
            return;
        }
        try {
            TicketEventDto payload = new TicketEventDto(
                    TicketEventDto.TIPO_TICKET_EVENT, accion, titulo, mensaje, ticketId, LocalDateTime.now());
            messagingTemplate.convertAndSendToUser(username, QUEUE_NOTIFICATIONS, payload);
        } catch (Exception e) {
            log.warn("No se pudo enviar la notificación de ticket a {}: {}", username, e.getMessage());
        }
    }
}
