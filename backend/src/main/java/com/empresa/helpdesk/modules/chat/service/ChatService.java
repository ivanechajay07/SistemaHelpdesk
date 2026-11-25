package com.empresa.helpdesk.modules.chat.service;

import com.empresa.helpdesk.modules.chat.dto.ChatMessageRequest;
import com.empresa.helpdesk.modules.chat.dto.ChatMessageResponse;
import com.empresa.helpdesk.modules.chat.dto.ChatPresenceDto;
import com.empresa.helpdesk.modules.chat.dto.ChatTypingDto;
import com.empresa.helpdesk.modules.chat.dto.UnreadCountResponse;
import com.empresa.helpdesk.modules.chat.entity.FileAttachment;
import com.empresa.helpdesk.modules.chat.entity.Message;
import com.empresa.helpdesk.modules.chat.repository.MessageRepository;
import com.empresa.helpdesk.modules.ticket.entity.Ticket;
import com.empresa.helpdesk.modules.ticket.enums.TicketStatus;
import com.empresa.helpdesk.modules.ticket.repository.TicketRepository;
import com.empresa.helpdesk.modules.user.entity.User;
import com.empresa.helpdesk.modules.user.repository.UserRepository;
import com.empresa.helpdesk.security.RateLimiterService;
import com.empresa.helpdesk.security.upload.FileValidationService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Lógica de negocio del chat de tickets (REST y WebSocket).
 *
 * <p>El controlador solo adapta HTTP/STOMP; toda la persistencia y las reglas
 * de participación viven aquí, manteniendo la separación de capas.</p>
 */
@Service
@RequiredArgsConstructor
public class ChatService {

    private static final long MAX_FILE_SIZE = 10L * 1024 * 1024;
    private static final List<String> ALLOWED_EXTENSIONS = List.of(
            "jpg", "jpeg", "png", "gif", "webp", "pdf", "doc", "docx", "xls", "xlsx", "txt", "csv", "zip"
    );

    private final MessageRepository messageRepository;
    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;
    private final ChatNotificationService chatNotificationService;
    private final AttachmentLinkService attachmentLinkService;
    private final SimpMessagingTemplate messagingTemplate;
    private final FileValidationService fileValidationService;
    private final RateLimiterService rateLimiter;

    @Transactional
    public ChatMessageResponse enviar(Long ticketId, ChatMessageRequest request, String username) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket no encontrado"));
        if (ticket.getEstado() == TicketStatus.RESUELTO
                || ticket.getEstado() == TicketStatus.CERRADO
                || ticket.getEstado() == TicketStatus.CANCELADO) {
            throw new RuntimeException("El chat está deshabilitado porque el ticket ya no está en gestión");
        }
        User remitente = usuarioPorNombre(username);
        validateParticipant(ticket, remitente);

        Message message = Message.builder()
                .contenido(request.getContenido())
                .ticket(ticket)
                .remitente(remitente)
                .leido(false)
                .build();

        String nombreAdjunto = attachmentLinkService.extraerNombre(request.getAdjuntoUrl());
        if (nombreAdjunto != null) {
            FileAttachment adjunto = FileAttachment.builder()
                    .urlArchivo("/uploads/" + nombreAdjunto)
                    .nombreOriginal(nombreAdjunto)
                    .nombreGuardado(nombreAdjunto)
                    .ticket(ticket)
                    .usuario(remitente)
                    .mensaje(message)
                    .build();
            message.setAdjunto(adjunto);
        }

        message = messageRepository.save(message);
        ChatMessageResponse response = mapToResponse(message);

        // Difusión a la sala del ticket: tanto el envío por WebSocket como el
        // respaldo REST pasan por aquí, así que se emite una sola vez.
        messagingTemplate.convertAndSend("/topic/ticket/" + ticketId, response);

        chatNotificationService.notificarNuevoMensaje(ticket, message, response);
        return response;
    }

    public void typing(Long ticketId, ChatTypingDto request, String username) {
        Ticket ticket = ticketRepository.findById(ticketId).orElse(null);
        User remitente = usuarioPorNombreOpcional(username);
        if (ticket == null || remitente == null) {
            return;
        }
        validateParticipant(ticket, remitente);
        ChatTypingDto payload = new ChatTypingDto(
                remitente.getId(), nombreCompleto(remitente), request != null && request.typing());
        messagingTemplate.convertAndSend("/topic/ticket/" + ticketId + "/typing", payload);
    }

    public void presence(Long ticketId, String username) {
        Ticket ticket = ticketRepository.findById(ticketId).orElse(null);
        User remitente = usuarioPorNombreOpcional(username);
        if (ticket == null || remitente == null) {
            return;
        }
        validateParticipant(ticket, remitente);
        remitente.setLastActivity(LocalDateTime.now());
        userRepository.save(remitente);
        ChatPresenceDto payload = new ChatPresenceDto(
                remitente.getId(), nombreCompleto(remitente), true, LocalDateTime.now());
        messagingTemplate.convertAndSend("/topic/ticket/" + ticketId + "/presence", payload);
    }

    @Transactional(readOnly = true)
    public List<ChatMessageResponse> historial(Long ticketId) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket no encontrado"));
        validateParticipant(ticket, getCurrentUser());
        return messageRepository.findByTicketIdOrderByFechaEnvioAsc(ticketId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public Map<String, Object> marcarLeidos(Long ticketId) {
        User currentUser = getCurrentUser();
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket no encontrado"));
        validateParticipant(ticket, currentUser);

        int marcados = messageRepository.markTicketMessagesAsRead(
                ticketId, currentUser.getId(), LocalDateTime.now());
        long restantes = messageRepository.countTotalUnreadForUser(currentUser.getId());

        if (marcados > 0) {
            chatNotificationService.notificarLectura(ticket, currentUser, marcados);
        }

        Map<String, Object> body = new HashMap<>();
        body.put("mensajesLeidos", marcados);
        body.put("noLeidosRestantes", restantes);
        return body;
    }

    @Transactional(readOnly = true)
    public UnreadCountResponse noLeidos() {
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
                .toList();

        return UnreadCountResponse.builder().total(total).porTicket(porTicket).build();
    }

    public String subirArchivo(MultipartFile file) {
        User usuario = getCurrentUser();
        rateLimiter.verificar("upload:" + usuario.getId(), 30, 3600);

        var validado = fileValidationService.validar(
                file, new HashSet<>(ALLOWED_EXTENSIONS), MAX_FILE_SIZE);

        try {
            Path uploadDir = Paths.get("uploads").toAbsolutePath().normalize();
            if (!Files.exists(uploadDir)) {
                Files.createDirectories(uploadDir);
            }
            String savedFileName = UUID.randomUUID() + "_" + validado.nombreSeguro();
            Path targetLocation = uploadDir.resolve(savedFileName).normalize();
            if (!targetLocation.startsWith(uploadDir)) {
                throw new RuntimeException("Nombre de archivo no válido");
            }
            Files.write(targetLocation, validado.content(),
                    java.nio.file.StandardOpenOption.CREATE_NEW,
                    java.nio.file.StandardOpenOption.WRITE);
            return "/uploads/" + savedFileName;
        } catch (IOException ex) {
            throw new RuntimeException("Error subiendo el archivo");
        }
    }

    private ChatMessageResponse mapToResponse(Message message) {
        return ChatMessageResponse.builder()
                .id(message.getId())
                .contenido(message.getContenido())
                .remitenteNombre(nombreCompleto(message.getRemitente()))
                .remitenteId(message.getRemitente().getId())
                .fechaEnvio(message.getFechaEnvio() != null ? message.getFechaEnvio() : LocalDateTime.now())
                .adjuntoUrl(message.getAdjunto() != null
                        ? attachmentLinkService.toPublicUrl(message.getAdjunto().getUrlArchivo())
                        : null)
                .leido(message.isLeido())
                .build();
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return usuarioPorNombre(username);
    }

    private User usuarioPorNombre(String username) {
        if (username == null || username.isBlank()) {
            throw new RuntimeException("Usuario no autenticado");
        }
        return userRepository.findByUsernameOrEmail(username, username)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
    }

    private User usuarioPorNombreOpcional(String username) {
        if (username == null || username.isBlank()) {
            return null;
        }
        return userRepository.findByUsernameOrEmail(username, username).orElse(null);
    }

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

    private String nombreCompleto(User u) {
        return ((u.getNombre() != null ? u.getNombre() : "") + " "
                + (u.getApellidos() != null ? u.getApellidos() : "")).trim();
    }
}
