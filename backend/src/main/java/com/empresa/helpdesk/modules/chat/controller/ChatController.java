package com.empresa.helpdesk.modules.chat.controller;

import com.empresa.helpdesk.modules.chat.dto.ChatMessageRequest;
import com.empresa.helpdesk.modules.chat.dto.ChatMessageResponse;
import com.empresa.helpdesk.modules.chat.dto.UnreadCountResponse;
import com.empresa.helpdesk.modules.chat.entity.Message;
import com.empresa.helpdesk.modules.chat.entity.FileAttachment;
import com.empresa.helpdesk.modules.chat.repository.MessageRepository;
import com.empresa.helpdesk.modules.chat.service.ChatNotificationService;
import com.empresa.helpdesk.modules.ticket.entity.Ticket;
import com.empresa.helpdesk.modules.ticket.enums.TicketStatus;
import com.empresa.helpdesk.modules.ticket.repository.TicketRepository;
import com.empresa.helpdesk.modules.user.entity.User;
import com.empresa.helpdesk.modules.user.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequiredArgsConstructor
@Tag(name = "Chat", description = "Endpoints y WebSocket para el chat de los tickets")
public class ChatController {

    private final MessageRepository messageRepository;
    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;
    private final ChatNotificationService chatNotificationService;

    /**
     * WebSocket Endpoint
     * El cliente envía a: /app/chat/{ticketId}
     * El broker retransmite a: /topic/ticket/{ticketId}
     * Además notifica en tiempo real a la cola privada de cada destinatario.
     */
    @MessageMapping("/chat/{ticketId}")
    @SendTo("/topic/ticket/{ticketId}")
    public ChatMessageResponse sendMessage(
            @DestinationVariable Long ticketId,
            @Payload ChatMessageRequest request
    ) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket no encontrado"));

        // El chat solo está activo desde la creación del ticket y mientras esté en gestión;
        // se deshabilita al resolverse, cerrarse o cancelarse (se reactiva con la reactivación)
        if (ticket.getEstado() == TicketStatus.RESUELTO
                || ticket.getEstado() == TicketStatus.CERRADO
                || ticket.getEstado() == TicketStatus.CANCELADO) {
            throw new RuntimeException("El chat está deshabilitado porque el ticket ya no está en gestión");
        }

        User remitente = userRepository.findById(request.getRemitenteId())
                .orElseThrow(() -> new RuntimeException("Remitente no encontrado"));

        Message message = Message.builder()
                .contenido(request.getContenido())
                .ticket(ticket)
                .remitente(remitente)
                .leido(false)
                .build();

        if (request.getAdjuntoUrl() != null && !request.getAdjuntoUrl().isEmpty()) {
            FileAttachment adjunto = FileAttachment.builder()
                    .urlArchivo(request.getAdjuntoUrl())
                    .nombreOriginal("archivo_adjunto")
                    .nombreGuardado("archivo_adjunto")
                    .ticket(ticket)
                    .usuario(remitente)
                    .mensaje(message)
                    .build();
            message.setAdjunto(adjunto);
        }

        message = messageRepository.save(message);

        ChatMessageResponse response = mapToResponse(message);

        // Notificación instantánea al destinatario (badge de no leídos + icono de chat)
        chatNotificationService.notificarNuevoMensaje(ticket, message, response);

        return response;
    }

    /**
     * REST Endpoint para obtener historial de mensajes de un ticket
     */
    @GetMapping("/api/v1/tickets/{ticketId}/messages")
    @Operation(summary = "Obtener el historial de chat de un ticket")
    public ResponseEntity<List<ChatMessageResponse>> getChatHistory(@PathVariable Long ticketId) {
        List<Message> messages = messageRepository.findByTicketIdOrderByFechaEnvioAsc(ticketId);
        List<ChatMessageResponse> response = messages.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    /**
     * Marca como leídos todos los mensajes recibidos del ticket para el usuario autenticado
     * y difunde el recibo "Visto" en tiempo real al remitente.
     */
    @PostMapping("/api/v1/tickets/{ticketId}/messages/read")
    @Transactional
    @Operation(summary = "Marcar los mensajes del ticket como leídos para el usuario actual")
    public ResponseEntity<Map<String, Object>> markMessagesAsRead(@PathVariable Long ticketId) {
        User currentUser = getCurrentUser();
        int marcados = messageRepository.markTicketMessagesAsRead(ticketId, currentUser.getId(), LocalDateTime.now());
        long restantes = messageRepository.countTotalUnreadForUser(currentUser.getId());

        if (marcados > 0) {
            Ticket ticket = ticketRepository.findById(ticketId).orElse(null);
            if (ticket != null) {
                chatNotificationService.notificarLectura(ticket, currentUser, marcados);
            }
        }

        Map<String, Object> body = new HashMap<>();
        body.put("mensajesLeidos", marcados);
        body.put("noLeidosRestantes", restantes);
        return ResponseEntity.ok(body);
    }

    /**
     * Devuelve el conteo de mensajes no leídos del usuario autenticado,
     * agrupado por ticket, para alimentar el icono de notificaciones del chat.
     */
    @GetMapping("/api/v1/chat/unread-counts")
    @Operation(summary = "Conteo de mensajes no leídos por ticket para el usuario actual")
    public ResponseEntity<UnreadCountResponse> getUnreadCounts() {
        User currentUser = getCurrentUser();
        List<Object[]> rows = messageRepository.countUnreadByTicketForUser(currentUser.getId());
        long total = rows.stream().mapToLong(r -> ((Number) r[1]).longValue()).sum();

        Map<Long, Long> countsPorTicket = new HashMap<>();
        for (Object[] row : rows) {
            countsPorTicket.put(((Number) row[0]).longValue(), ((Number) row[1]).longValue());
        }

        List<Long> ticketIds = List.copyOf(countsPorTicket.keySet());
        Map<Long, Ticket> tickets = ticketIds.isEmpty()
                ? Map.of()
                : ticketRepository.findAllById(ticketIds).stream()
                        .collect(Collectors.toMap(Ticket::getId, t -> t));

        List<UnreadCountResponse.UnreadPerTicket> porTicket = ticketIds.stream()
                .map(tid -> UnreadCountResponse.UnreadPerTicket.builder()
                        .ticketId(tid)
                        .ticketCodigo(tickets.containsKey(tid) ? tickets.get(tid).getCodigo() : null)
                        .ticketTitulo(tickets.containsKey(tid) ? tickets.get(tid).getTitulo() : null)
                        .noLeidos(countsPorTicket.get(tid))
                        .build())
                .sorted((a, b) -> Long.compare(b.getNoLeidos(), a.getNoLeidos()))
                .collect(Collectors.toList());

        return ResponseEntity.ok(UnreadCountResponse.builder()
                .total(total)
                .porTicket(porTicket)
                .build());
    }

    private ChatMessageResponse mapToResponse(Message message) {
        return ChatMessageResponse.builder()
                .id(message.getId())
                .contenido(message.getContenido())
                .remitenteNombre(message.getRemitente().getNombre() + " " + message.getRemitente().getApellidos())
                .remitenteId(message.getRemitente().getId())
                .fechaEnvio(message.getFechaEnvio() != null ? message.getFechaEnvio() : LocalDateTime.now())
                .adjuntoUrl(message.getAdjunto() != null ? message.getAdjunto().getUrlArchivo() : null)
                .leido(message.isLeido())
                .build();
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsernameOrEmail(username, username)
                .orElseThrow(() -> new RuntimeException("Usuario autenticado no encontrado"));
    }

    /**
     * REST Endpoint para subir un archivo adjunto
     */
    @PostMapping("/api/v1/chat/upload")
    @Operation(summary = "Subir archivo adjunto para el chat")
    public ResponseEntity<String> uploadFile(@RequestParam("file") MultipartFile file) {
        try {
            Path uploadDir = Paths.get("uploads");
            if (!Files.exists(uploadDir)) {
                Files.createDirectories(uploadDir);
            }
            
            String fileName = StringUtils.cleanPath(file.getOriginalFilename());
            String savedFileName = UUID.randomUUID().toString() + "_" + fileName;
            Path targetLocation = uploadDir.resolve(savedFileName);
            
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);
            
            String fileUrl = "/uploads/" + savedFileName;
            return ResponseEntity.ok(fileUrl);
        } catch (IOException ex) {
            return ResponseEntity.internalServerError().body("Error subiendo el archivo");
        }
    }
}
