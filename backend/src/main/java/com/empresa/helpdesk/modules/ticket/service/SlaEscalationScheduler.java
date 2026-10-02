package com.empresa.helpdesk.modules.ticket.service;

import com.empresa.helpdesk.modules.notification.service.NotificationPublisher;
import com.empresa.helpdesk.modules.settings.service.AutomationSettingsService;
import com.empresa.helpdesk.modules.ticket.entity.Ticket;
import com.empresa.helpdesk.modules.ticket.enums.TicketStatus;
import com.empresa.helpdesk.modules.ticket.repository.TicketRepository;
import com.empresa.helpdesk.modules.user.entity.User;
import com.empresa.helpdesk.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Escalado por SLA: periódicamente detecta tickets vencidos sin cerrar y
 * notifica (en tiempo real) a administradores y supervisores. Cada ticket se
 * escala una sola vez gracias a la marca {@code escaladoSla}.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SlaEscalationScheduler {

    private static final List<TicketStatus> CERRADOS = List.of(
            TicketStatus.RESUELTO, TicketStatus.CERRADO, TicketStatus.CANCELADO);

    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;
    private final NotificationPublisher notificationPublisher;
    private final AutomationSettingsService automationSettings;

    @Scheduled(fixedDelayString = "${app.sla.escalation-ms:300000}", initialDelay = 90000)
    @Transactional
    public void revisarSlaVencidos() {
        if (!automationSettings.isSlaEscalationEnabled()) {
            return;
        }

        List<Ticket> vencidos = ticketRepository
                .findByEscaladoSlaFalseAndEstadoNotInAndFechaEstimadaResolucionBefore(CERRADOS, LocalDateTime.now());
        if (vencidos.isEmpty()) {
            return;
        }

        Map<Long, User> destinatarios = new LinkedHashMap<>();
        userRepository.findByRoles_Name("ADMIN").forEach(u -> destinatarios.put(u.getId(), u));
        userRepository.findByRoles_Name("SUPERVISOR").forEach(u -> destinatarios.putIfAbsent(u.getId(), u));
        if (destinatarios.isEmpty()) {
            return;
        }

        for (Ticket ticket : vencidos) {
            ticket.setEscaladoSla(true);
            ticketRepository.save(ticket);
            String mensaje = ticket.getCodigo() + " · " + ticket.getTitulo() + " venció su SLA sin resolverse";
            for (User destinatario : destinatarios.values()) {
                notificationPublisher.notificarTicket(destinatario.getUsername(), "SLA_VENCIDO",
                        "SLA vencido", mensaje, ticket.getId());
            }
            log.warn("Ticket {} escalado por SLA vencido", ticket.getCodigo());
        }
    }
}
