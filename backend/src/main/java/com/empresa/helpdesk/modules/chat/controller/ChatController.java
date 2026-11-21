package com.empresa.helpdesk.modules.chat.controller;

import com.empresa.helpdesk.modules.chat.dto.ChatMessageRequest;
import com.empresa.helpdesk.modules.chat.dto.ChatMessageResponse;
import com.empresa.helpdesk.modules.chat.dto.ChatTypingDto;
import com.empresa.helpdesk.modules.chat.dto.UnreadCountResponse;
import com.empresa.helpdesk.modules.chat.service.ChatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;
import java.util.List;
import java.util.Map;

/**
 * Adaptador HTTP/STOMP del chat. La lógica y la persistencia están en
 * {@link ChatService} (capa de servicio).
 */
@RestController
@RequiredArgsConstructor
@Tag(name = "Chat", description = "Endpoints y WebSocket para el chat de los tickets")
public class ChatController {

    private final ChatService chatService;

    @MessageMapping("/chat/{ticketId}")
    @SendTo("/topic/ticket/{ticketId}")
    public ChatMessageResponse sendMessage(
            @DestinationVariable Long ticketId,
            @Payload ChatMessageRequest request,
            Principal principal) {
        return chatService.enviar(ticketId, request, principal != null ? principal.getName() : null);
    }

    @MessageMapping("/chat/{ticketId}/typing")
    public void typing(@DestinationVariable Long ticketId,
                       @Payload ChatTypingDto request,
                       Principal principal) {
        chatService.typing(ticketId, request, principal != null ? principal.getName() : null);
    }

    @MessageMapping("/chat/{ticketId}/presence")
    public void presence(@DestinationVariable Long ticketId, Principal principal) {
        chatService.presence(ticketId, principal != null ? principal.getName() : null);
    }

    @GetMapping("/api/v1/tickets/{ticketId}/messages")
    @Operation(summary = "Obtener el historial de chat de un ticket")
    public ResponseEntity<List<ChatMessageResponse>> getChatHistory(@PathVariable Long ticketId) {
        return ResponseEntity.ok(chatService.historial(ticketId));
    }

    @PostMapping("/api/v1/tickets/{ticketId}/messages/read")
    @Operation(summary = "Marcar los mensajes del ticket como leídos para el usuario actual")
    public ResponseEntity<Map<String, Object>> markMessagesAsRead(@PathVariable Long ticketId) {
        return ResponseEntity.ok(chatService.marcarLeidos(ticketId));
    }

    @GetMapping("/api/v1/chat/unread-counts")
    @Operation(summary = "Conteo de mensajes no leídos por ticket para el usuario actual")
    public ResponseEntity<UnreadCountResponse> getUnreadCounts() {
        return ResponseEntity.ok(chatService.noLeidos());
    }

    @PostMapping("/api/v1/chat/upload")
    @Operation(summary = "Subir archivo adjunto para el chat")
    public ResponseEntity<String> uploadFile(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(chatService.subirArchivo(file));
    }
}
