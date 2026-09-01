package com.empresa.helpdesk.config;

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
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.security.Principal;
import java.util.Collections;

/**
 * Autentica la conexión STOMP (frame CONNECT) leyendo el JWT del header
 * "Authorization". Asigna un Principal con el username de la sesión para que
 * el servidor pueda enviar notificaciones privadas mediante
 * convertAndSendToUser(username, "/queue/...", payload).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketAuthChannelInterceptor implements ChannelInterceptor {

    private final JwtService jwtService;
    private final UserRepository userRepository;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authHeader = accessor.getFirstNativeHeader("Authorization");
            if (StringUtils.hasText(authHeader) && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                try {
                    String username = jwtService.extractUsername(token);
                    userRepository.findByUsernameOrEmail(username, username).ifPresent(user -> {
                        Principal principal = new UsernamePasswordAuthenticationToken(
                                user.getUsername(), null,
                                user.getAuthorities() != null ? user.getAuthorities() : Collections.emptyList()
                        );
                        accessor.setUser(principal);
                        log.debug("WebSocket autenticado para el usuario: {}", user.getUsername());
                    });
                } catch (Exception e) {
                    log.warn("Token inválido en la conexión WebSocket: {}", e.getMessage());
                }
            }
        }
        return message;
    }
}
