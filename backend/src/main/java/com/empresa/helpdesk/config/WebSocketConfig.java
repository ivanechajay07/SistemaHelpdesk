package com.empresa.helpdesk.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final WebSocketAuthChannelInterceptor webSocketAuthChannelInterceptor;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Habilita un broker en memoria que enviará mensajes a clientes conectados en "/topic" o "/queue".
        // Los destinos "/user/{username}/queue/..." permiten notificaciones privadas por usuario.
        config.enableSimpleBroker("/topic", "/queue");
        config.setApplicationDestinationPrefixes("/app");
        // Prefijo para mensajes dirigidos a un usuario específico (convertAndSendToUser)
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        // Autentica cada conexión STOMP con el JWT y asocia el Principal a la sesión
        registration.interceptors(webSocketAuthChannelInterceptor);
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // El endpoint donde los clientes se conectarán al WebSocket
        registry.addEndpoint("/ws/chat")
                .setAllowedOriginPatterns("*") // En prod ajustar
                .withSockJS(); // Soporte para fallback si no hay WebSocket puro
    }
}
