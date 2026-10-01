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
import java.security.Principal;
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
            @Payload ChatMessageRequest request,
            Principal principal
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

        // El remitente SIEMPRE se toma del Principal autenticado (nunca del payload del cliente)
        if (principal == null || principal.getName() == null) {
            throw new RuntimeException("Usuario no autenticado");
        }
        User remitente = userRepository.findByUsernameOrEmail(principal.getName(), principal.getName())
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        validateParticipant(ticket, remitente);

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
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket no encontrado"));
        validateParticipant(ticket, getCurrentUser());
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

    /** Valida que el usuario sea participante del ticket (solicitante, técnico asignado o admin). */
    private void validateParticipant(Ticket ticket, User user) {
        if (isAdmin(user)) {
            return;
        }
        boolean isSolicitante = ticket.getSolicitante().getId().equals(user.getId());
        boolean isTecnico = ticket.getTecnico() != null && ticket.getTecnico().getId().equals(user.getId());
        if (!isSolicitante && !isTecnico) {
            throw new RuntimeException("No tienes acceso al chat de este ticket");
        }
    }

    private boolean isAdmin(User user) {
        return user.getRoles().stream().anyMatch(role -> "ADMIN".equals(role.getName()));
    }

    private static final long MAX_FILE_SIZE = 10L * 1024 * 1024; // 10 MB
    private static final List<String> ALLOWED_EXTENSIONS = List.of(
            "jpg", "jpeg", "png", "gif", "webp", "pdf", "doc", "docx", "xls", "xlsx", "txt", "csv", "zip"
    );

    /**
     * REST Endpoint para subir un archivo adjunto
     */
    @PostMapping("/api/v1/chat/upload")
    @Operation(summary = "Subir archivo adjunto para el chat")
    public ResponseEntity<String> uploadFile(@RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body("El archivo está vacío");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            return ResponseEntity.badRequest().body("El archivo excede el tamaño máximo de 10 MB");
        }
        String extension = StringUtils.getFilenameExtension(file.getOriginalFilename());
        if (extension == null || !ALLOWED_EXTENSIONS.contains(extension.toLowerCase())) {
            return ResponseEntity.badRequest().body("Tipo de archivo no permitido");
        }
        try {
            Path uploadDir = Paths.get("uploads").toAbsolutePath().normalize();
            if (!Files.exists(uploadDir)) {
                Files.createDirectories(uploadDir);
            }

            // Se usa únicamente el nombre base (sin componentes de ruta) y se
            // sanea el nombre para impedir path traversal ("../").
            String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "archivo";
            String baseName = Paths.get(StringUtils.cleanPath(originalName)).getFileName().toString();
            baseName = baseName.replaceAll("[^A-Za-z0-9._-]", "_");
            if (baseName.isBlank() || ".".equals(baseName) || "..".equals(baseName)) {
                return ResponseEntity.badRequest().body("Nombre de archivo no válido");
            }
            String savedFileName = UUID.randomUUID().toString() + "_" + baseName;
            Path targetLocation = uploadDir.resolve(savedFileName).normalize();

            // Verificación final: el destino debe permanecer dentro de uploads/
            if (!targetLocation.startsWith(uploadDir)) {
                return ResponseEntity.badRequest().body("Nombre de archivo no válido");
            }

            try (java.io.InputStream in = file.getInputStream()) {
                Files.copy(in, targetLocation, StandardCopyOption.REPLACE_EXISTING);
            }

            String fileUrl = "/uploads/" + savedFileName;
            return ResponseEntity.ok(fileUrl);
        } catch (IOException ex) {
            return ResponseEntity.internalServerError().body("Error subiendo el archivo");
        }
    }
}
