package com.empresa.helpdesk.config;

import com.empresa.helpdesk.modules.ticket.entity.Ticket;
import com.empresa.helpdesk.modules.ticket.repository.TicketRepository;
import com.empresa.helpdesk.modules.user.entity.User;
import com.empresa.helpdesk.modules.user.repository.UserRepository;
import com.empresa.helpdesk.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.security.Principal;
import java.util.Collections;

/**
 * Autentica la conexión STOMP (frame CONNECT) leyendo el JWT del header
 * "Authorization" y valida las suscripciones a /topic/ticket/{id} para que
 * solo los participantes del ticket puedan recibir sus mensajes.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketAuthChannelInterceptor implements ChannelInterceptor {

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final TicketRepository ticketRepository;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) {
            return message;
        }

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            authenticate(accessor);
        } else if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            authorizeSubscription(accessor);
        } else if (StompCommand.SEND.equals(accessor.getCommand())) {
            authorizeSend(accessor);
        }
        return message;
    }

    private void authenticate(StompHeaderAccessor accessor) {
        String authHeader = accessor.getFirstNativeHeader("Authorization");
        if (!StringUtils.hasText(authHeader) || !authHeader.startsWith("Bearer ")) {
            throw new MessageDeliveryException("Autenticación requerida");
        }
        try {
            String token = authHeader.substring(7);
            String username = jwtService.extractUsername(token);
            User user = userRepository.findByUsernameOrEmail(username, username)
                    .orElseThrow(() -> new MessageDeliveryException("Usuario no encontrado"));
            // Rechazar conexiones de cuentas desactivadas
            if (!user.isActivo()) {
                throw new MessageDeliveryException("Cuenta desactivada");
            }
            Principal principal = new UsernamePasswordAuthenticationToken(
                    user.getUsername(), null,
                    user.getAuthorities() != null ? user.getAuthorities() : Collections.emptyList()
            );
            accessor.setUser(principal);
        } catch (MessageDeliveryException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Token inválido en la conexión WebSocket: {}", e.getMessage());
            throw new MessageDeliveryException("Token inválido");
        }
    }

    private void authorizeSubscription(StompHeaderAccessor accessor) {
        Principal principal = accessor.getUser();
        if (principal == null || principal.getName() == null) {
            throw new MessageDeliveryException("No autorizado");
        }
        String destination = accessor.getDestination();
        if (destination == null) {
            throw new MessageDeliveryException("Destino no especificado");
        }

        // Solo se permiten dos familias de destinos: la sala del ticket
        // (validando participación) y la cola privada del propio usuario.
        if (destination.startsWith("/topic/ticket/")) {
            Long ticketId = parseTicketId(destination);
            if (ticketId == null || !canAccessTicket(principal.getName(), ticketId)) {
                throw new MessageDeliveryException("No tienes acceso al chat de este ticket");
            }
        } else if (destination.startsWith("/user/")) {
            // Cola privada de la sesión autenticada (p. ej. /user/queue/chat)
            return;
        } else {
            // Denegar por defecto cualquier otro destino
            throw new MessageDeliveryException("Suscripción no autorizada");
        }
    }

    /** Los frames SEND solo pueden dirigirse a los destinos de la aplicación (/app/**). */
    private void authorizeSend(StompHeaderAccessor accessor) {
        Principal principal = accessor.getUser();
        if (principal == null || principal.getName() == null) {
            throw new MessageDeliveryException("No autorizado");
        }
        String destination = accessor.getDestination();
        if (destination == null || !destination.startsWith("/app/")) {
            throw new MessageDeliveryException("Destino de envío no autorizado");
        }
    }

    private Long parseTicketId(String destination) {
        try {
            // Acepta tanto /topic/ticket/{id} como sub-rutas (p. ej. /topic/ticket/{id}/lectura)
            String rest = destination.substring("/topic/ticket/".length());
            int slash = rest.indexOf('/');
            if (slash >= 0) {
                rest = rest.substring(0, slash);
            }
            return Long.parseLong(rest);
        } catch (Exception e) {
            return null;
        }
    }

    private boolean canAccessTicket(String username, Long ticketId) {
        try {
            User user = userRepository.findByUsernameOrEmail(username, username).orElse(null);
            if (user == null) {
                return false;
            }
            if (user.getRoles().stream().anyMatch(role -> "ADMIN".equals(role.getName()))) {
                return true;
            }
            Ticket ticket = ticketRepository.findById(ticketId).orElse(null);
            if (ticket == null) {
                return false;
            }
            boolean isSolicitante = ticket.getSolicitante().getId().equals(user.getId());
            boolean isTecnico = ticket.getTecnico() != null && ticket.getTecnico().getId().equals(user.getId());
            return isSolicitante || isTecnico;
        } catch (Exception e) {
            return false;
        }
    }
}