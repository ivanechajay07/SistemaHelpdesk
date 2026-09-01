package com.empresa.helpdesk.modules.ticket.service;

import com.empresa.helpdesk.modules.ticket.dto.TicketCreateRequest;
import com.empresa.helpdesk.modules.ticket.dto.TicketRatingRequest;
import com.empresa.helpdesk.modules.ticket.dto.TicketResolveRequest;
import com.empresa.helpdesk.modules.ticket.dto.TicketResponse;
import com.empresa.helpdesk.modules.ticket.dto.TicketUpdateRequest;
import com.empresa.helpdesk.modules.ticket.entity.Subcategory;
import com.empresa.helpdesk.modules.ticket.entity.Ticket;
import com.empresa.helpdesk.modules.ticket.entity.TicketHistory;
import com.empresa.helpdesk.modules.ticket.entity.TicketRating;
import com.empresa.helpdesk.modules.ticket.enums.TicketStatus;
import com.empresa.helpdesk.modules.ticket.repository.SubcategoryRepository;
import com.empresa.helpdesk.modules.ticket.repository.TicketHistoryRepository;
import com.empresa.helpdesk.modules.ticket.repository.TicketRatingRepository;
import com.empresa.helpdesk.modules.ticket.repository.TicketRepository;
import com.empresa.helpdesk.modules.audit.service.AuditService;
import com.empresa.helpdesk.modules.user.entity.User;
import com.empresa.helpdesk.modules.user.repository.UserRepository;
import com.empresa.helpdesk.modules.notification.service.EmailService;
import com.empresa.helpdesk.modules.chat.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TicketService {

    private final TicketRepository ticketRepository;
    private final TicketHistoryRepository ticketHistoryRepository;
    private final SubcategoryRepository subcategoryRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final MessageRepository messageRepository;
    private final SlaService slaService;
    private final TicketRatingRepository ticketRatingRepository;
    private final AuditService auditService;

    @Transactional
    public TicketResponse createTicket(TicketCreateRequest request) {
        User currentUser = getCurrentUser();
        
        Subcategory subcategory = subcategoryRepository.findById(request.getSubcategoriaId())
                .orElseThrow(() -> new RuntimeException("Subcategoría no encontrada"));

        String codigo = generateTicketCode();

        Ticket ticket = Ticket.builder()
                .codigo(codigo)
                .titulo(request.getTitulo())
                .descripcion(request.getDescripcion())
                .prioridad(request.getPrioridad())
                .estado(TicketStatus.NUEVO)
                .entidad(trimOrNull(request.getEntidad()))
                .sede(trimOrNull(request.getSede()))
                .subcategoria(subcategory)
                .solicitante(currentUser)
                .build();

        ticket = ticketRepository.save(ticket);

        // Registro en el historial
        TicketHistory history = TicketHistory.builder()
                .ticket(ticket)
                .usuario(currentUser)
                .accion("CREACION")
                .detalle("El usuario ha creado el ticket con prioridad " + request.getPrioridad())
                .build();
        ticketHistoryRepository.save(history);

        // Precargar asociaciones lazy en este hilo para evitar acceso
        // concurrente a la sesión de Hibernate desde los hilos asíncronos
        final String solicitanteEmail = currentUser.getEmail();
        currentUser.getNombre();
        currentUser.getApellidos();
        final String categoriaCompleta = ticket.getSubcategoria().getCategory().getName()
                + " / " + ticket.getSubcategoria().getName();

        // Consultar administradores antes de disparar los correos asíncronos
        List<User> admins = userRepository.findByRoles_Name("ADMIN");

        // Notificar al cliente que creó el ticket
        emailService.sendTicketCreatedEmail(solicitanteEmail, ticket);

        // Notificar a los administradores del nuevo ticket
        for (User admin : admins) {
            emailService.sendTicketCreatedAdminNotification(admin.getEmail(), ticket);
        }

        auditService.registrar("CREAR_TICKET", "TICKET", ticket.getId(), currentUser.getUsername() + " creó " + codigo);

        return mapToResponse(ticket);
    }

    public Page<TicketResponse> getAllTickets(Pageable pageable) {
        User currentUser = getCurrentUser();
        if (isAdmin(currentUser) || hasAuthority(currentUser, "TICKET_VIEW_ALL")) {
            return ticketRepository.findAll(pageable).map(this::mapToResponse);
        }
        return ticketRepository.findBySolicitanteIdOrTecnicoId(currentUser.getId(), currentUser.getId(), pageable)
                .map(this::mapToResponse);
    }
    
    public Page<TicketResponse> getMyTickets(Pageable pageable) {
        User currentUser = getCurrentUser();
        return ticketRepository.findBySolicitanteId(currentUser.getId(), pageable)
                .map(this::mapToResponse);
    }

    public Page<TicketResponse> getAssignedTickets(Pageable pageable) {
        User currentUser = getCurrentUser();
        return ticketRepository.findByTecnicoId(currentUser.getId(), pageable)
                .map(this::mapToResponse);
    }

    public TicketResponse getTicketById(Long id) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ticket no encontrado"));
        validateTicketAccess(ticket);
        return mapToResponse(ticket);
    }

    @Transactional
    public TicketResponse updateTicket(Long id, TicketUpdateRequest request) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ticket no encontrado"));
        validateTicketEditAccess(ticket);

        Subcategory subcategory = subcategoryRepository.findById(request.getSubcategoriaId())
                .orElseThrow(() -> new RuntimeException("Subcategoría no encontrada"));

        ticket.setTitulo(request.getTitulo());
        ticket.setDescripcion(request.getDescripcion());
        ticket.setPrioridad(request.getPrioridad());
        ticket.setEntidad(trimOrNull(request.getEntidad()));
        ticket.setSede(trimOrNull(request.getSede()));
        ticket.setSubcategoria(subcategory);

        ticket = ticketRepository.save(ticket);
        
        TicketHistory history = TicketHistory.builder()
                .ticket(ticket)
                .usuario(getCurrentUser())
                .accion("ACTUALIZACION")
                .detalle("Ticket modificado (título, descripción, prioridad o categoría)")
                .build();
        ticketHistoryRepository.save(history);

        return mapToResponse(ticket);
    }

    @Transactional
    public void deleteTicket(Long id) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ticket no encontrado"));
        validateTicketAdminAccess(ticket);
        
        ticketHistoryRepository.deleteAll(ticketHistoryRepository.findByTicketIdOrderByFechaRegistroDesc(ticket.getId()));
        messageRepository.deleteAll(messageRepository.findByTicketIdOrderByFechaEnvioAsc(ticket.getId()));
        ticketRepository.delete(ticket);
    }

    @Transactional
    public TicketResponse assignTicket(Long ticketId, Long tecnicoId) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket no encontrado"));
                
        User tecnico = userRepository.findById(tecnicoId)
                .orElseThrow(() -> new RuntimeException("Técnico no encontrado"));
                
        User currentUser = getCurrentUser();

        ticket.setTecnico(tecnico);
        ticket.setEstado(TicketStatus.ASIGNADO);
        ticket.setFechaAsignacion(LocalDateTime.now());
        
        // Simulación de SLA básico
        switch (ticket.getPrioridad()) {
            case CRITICA: ticket.setFechaEstimadaResolucion(LocalDateTime.now().plusHours(2)); break;
            case ALTA: ticket.setFechaEstimadaResolucion(LocalDateTime.now().plusHours(8)); break;
            case MEDIA: ticket.setFechaEstimadaResolucion(LocalDateTime.now().plusHours(24)); break;
            case BAJA: ticket.setFechaEstimadaResolucion(LocalDateTime.now().plusHours(72)); break;
        }

        ticket = ticketRepository.save(ticket);

        TicketHistory history = TicketHistory.builder()
                .ticket(ticket)
                .usuario(currentUser)
                .accion("ASIGNACION")
                .detalle("Ticket asignado al técnico: " + tecnico.getUsername())
                .build();
        ticketHistoryRepository.save(history);

        // Precargar lazy antes del correo asíncrono
        ticket.getSolicitante().getNombre();
        ticket.getSolicitante().getApellidos();
        tecnico.getNombre();

        // Enviar notificación al técnico asignado
        emailService.sendTicketAssignmentEmail(tecnico.getEmail(), ticket, tecnico);

        auditService.registrar("ASIGNAR_TICKET", "TICKET", ticket.getId(),
                ticket.getCodigo() + " asignado a " + tecnico.getUsername());

        return mapToResponse(ticket);
    }

    @Transactional
    public TicketResponse resolveTicket(Long ticketId, TicketResolveRequest request) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket no encontrado"));
        validateTicketResolveAccess(ticket);

        User currentUser = getCurrentUser();

        ticket.setEstado(TicketStatus.RESUELTO);
        ticket.setFechaResolucion(LocalDateTime.now());
        ticket = ticketRepository.save(ticket);

        TicketHistory history = TicketHistory.builder()
                .ticket(ticket)
                .usuario(currentUser)
                .accion("RESUELTO")
                .detalle("Ticket resuelto por el técnico, pendiente de confirmación del cliente: " + request.getResolucion())
                .build();
        ticketHistoryRepository.save(history);

        // Precargar lazy antes del correo asíncrono
        ticket.getSolicitante().getNombre();

        // Notificar al cliente para que confirme la solución
        emailService.sendTicketResolvedEmail(ticket.getSolicitante().getEmail(), ticket, request.getResolucion());

        auditService.registrar("RESOLVER_TICKET", "TICKET", ticket.getId(),
                currentUser.getUsername() + " resolvió " + ticket.getCodigo());

        return mapToResponse(ticket);
    }

    @Transactional
    public TicketResponse confirmTicket(Long ticketId) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket no encontrado"));
        validateTicketConfirmAccess(ticket);

        if (ticket.getEstado() != TicketStatus.RESUELTO) {
            throw new RuntimeException("Solo se puede confirmar la solución de un ticket en estado RESUELTO");
        }

        User currentUser = getCurrentUser();

        ticket.setEstado(TicketStatus.CERRADO);
        ticket.setFechaCierre(LocalDateTime.now());
        ticket = ticketRepository.save(ticket);

        TicketHistory history = TicketHistory.builder()
                .ticket(ticket)
                .usuario(currentUser)
                .accion("CONFIRMACION_CLIENTE")
                .detalle("El cliente confirmó que la solución fue exitosa. Ticket cerrado.")
                .build();
        ticketHistoryRepository.save(history);

        // Precargar lazy antes de los correos asíncronos
        ticket.getSolicitante().getNombre();
        ticket.getSolicitante().getApellidos();
        if (ticket.getTecnico() != null) {
            ticket.getTecnico().getNombre();
            ticket.getTecnico().getApellidos();
        }

        // Notificar a los administradores que el cliente confirmó la solución
        List<User> admins = userRepository.findByRoles_Name("ADMIN");
        for (User admin : admins) {
            emailService.sendTicketConfirmedAdminNotification(admin.getEmail(), ticket);
        }

        auditService.registrar("CERRAR_TICKET", "TICKET", ticket.getId(),
                currentUser.getUsername() + " confirmó y cerró " + ticket.getCodigo());

        return mapToResponse(ticket);
    }

    /** Registra la encuesta de satisfacción (CSAT) del cliente al cerrar el ticket. */
    @Transactional
    public TicketResponse rateTicket(Long ticketId, TicketRatingRequest request) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket no encontrado"));
        validateTicketConfirmAccess(ticket);

        if (ticket.getEstado() != TicketStatus.CERRADO) {
            throw new RuntimeException("Solo se puede calificar un ticket que esté cerrado");
        }
        if (ticketRatingRepository.existsByTicketId(ticketId)) {
            throw new RuntimeException("Este ticket ya fue calificado");
        }

        User currentUser = getCurrentUser();
        TicketRating rating = TicketRating.builder()
                .ticket(ticket)
                .usuario(currentUser)
                .puntaje(request.getPuntaje())
                .comentario(trimOrNull(request.getComentario()))
                .build();
        ticketRatingRepository.save(rating);

        auditService.registrar("CALIFICAR_TICKET", "TICKET", ticket.getId(),
                currentUser.getUsername() + " calificó " + ticket.getCodigo() + " con " + request.getPuntaje() + "/5");

        return mapToResponse(ticket);
    }

    @Transactional
    public TicketResponse reactivateTicket(Long ticketId) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket no encontrado"));
        validateTicketAccess(ticket);

        if (ticket.getEstado() != TicketStatus.CERRADO) {
            throw new RuntimeException("Solo se pueden reactivar tickets que estén cerrados");
        }

        User currentUser = getCurrentUser();

        ticket.setEstado(TicketStatus.EN_REVISION);
        ticket.setFechaCierre(null);
        ticket.setReactivado(true);
        ticket = ticketRepository.save(ticket);

        TicketHistory history = TicketHistory.builder()
                .ticket(ticket)
                .usuario(currentUser)
                .accion("REACTIVACION")
                .detalle("El ticket fue reactivado por " + currentUser.getNombre() + " "
                        + currentUser.getApellidos() + ". Estado cambiado a EN_REVISION. Chat habilitado nuevamente.")
                .build();
        ticketHistoryRepository.save(history);

        return mapToResponse(ticket);
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsernameOrEmail(username, username)
                .orElseThrow(() -> new RuntimeException("Usuario autenticado no encontrado"));
    }

    private boolean isAdmin(User user) {
        return user.getRoles().stream().anyMatch(role -> role.getName().equals("ADMIN"));
    }

    private boolean isSupervisor(User user) {
        return user.getRoles().stream().anyMatch(role -> role.getName().equals("SUPERVISOR"));
    }

    private boolean isTecnico(User user) {
        return user.getRoles().stream().anyMatch(role -> role.getName().equals("TECNICO"));
    }

    private boolean hasAuthority(User user, String authority) {
        return user.getRoles().stream()
                .flatMap(role -> role.getPermissions().stream())
                .anyMatch(p -> p.getName().equals(authority));
    }

    private void validateTicketAccess(Ticket ticket) {
        User currentUser = getCurrentUser();
        if (isAdmin(currentUser) || hasAuthority(currentUser, "TICKET_VIEW_ALL")) {
            return;
        }
        boolean isSolicitante = ticket.getSolicitante().getId().equals(currentUser.getId());
        boolean isTecnicoAsignado = ticket.getTecnico() != null && ticket.getTecnico().getId().equals(currentUser.getId());
        if (!isSolicitante && !isTecnicoAsignado) {
            throw new RuntimeException("No tienes acceso a este ticket");
        }
    }

    /**
     * Solo pueden editar tickets los usuarios cuyo rol tenga el permiso TICKET_EDIT
     * (por defecto ADMIN; el administrador puede otorgárselo a otros roles desde
     * Roles y Permisos). El técnico NO puede editar: únicamente resolver.
     */
    private void validateTicketEditAccess(Ticket ticket) {
        User currentUser = getCurrentUser();
        if (!hasAuthority(currentUser, "TICKET_EDIT")) {
            throw new RuntimeException("No tienes permiso para editar este ticket. "
                    + "El administrador debe otorgarte el permiso TICKET_EDIT.");
        }
    }

    /**
     * Solo pueden eliminar tickets los usuarios cuyo rol tenga el permiso
     * TICKET_DELETE (el administrador controla quién lo tiene).
     */
    private void validateTicketAdminAccess(Ticket ticket) {
        User currentUser = getCurrentUser();
        if (!hasAuthority(currentUser, "TICKET_DELETE")) {
            throw new RuntimeException("No tienes permiso para eliminar tickets. "
                    + "El administrador debe otorgarte el permiso TICKET_DELETE.");
        }
    }

    private void validateTicketResolveAccess(Ticket ticket) {
        User currentUser = getCurrentUser();
        if (isAdmin(currentUser) || hasAuthority(currentUser, "TICKET_VIEW_ALL")) {
            return;
        }
        boolean isTecnicoAsignado = ticket.getTecnico() != null && ticket.getTecnico().getId().equals(currentUser.getId());
        if (!isTecnicoAsignado) {
            throw new RuntimeException("Solo el técnico asignado puede resolver este ticket");
        }
    }

    private void validateTicketConfirmAccess(Ticket ticket) {
        User currentUser = getCurrentUser();
        if (isAdmin(currentUser)) {
            return;
        }
        boolean isSolicitante = ticket.getSolicitante().getId().equals(currentUser.getId());
        if (!isSolicitante) {
            throw new RuntimeException("Solo el solicitante del ticket puede confirmar la solución");
        }
    }

    private String generateTicketCode() {
        // Formato TK-YYYY-UUID(short)
        String year = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy"));
        String shortUuid = UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        return "TK-" + year + "-" + shortUuid;
    }

    private String trimOrNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private TicketResponse mapToResponse(Ticket ticket) {
        // Informe de resolución: último registro de historial con acción RESUELTO
        String informe = null;
        if (ticket.getEstado() == TicketStatus.RESUELTO || ticket.getEstado() == TicketStatus.CERRADO) {
            informe = ticketHistoryRepository
                    .findFirstByTicketIdAndAccionOrderByFechaRegistroDesc(ticket.getId(), "RESUELTO")
                    .map(h -> h.getDetalle())
                    .orElse(null);
        }

        // SLA según prioridad
        SlaService.SlaInfo sla = slaService.calcular(ticket);

        // CSAT si existe calificación
        Integer calificacion = null;
        String comentarioCliente = null;
        if (ticket.getEstado() == TicketStatus.CERRADO) {
            calificacion = ticketRatingRepository.findByTicketId(ticket.getId())
                    .map(r -> r.getPuntaje()).orElse(null);
            comentarioCliente = ticketRatingRepository.findByTicketId(ticket.getId())
                    .map(r -> r.getComentario()).orElse(null);
        }

        return TicketResponse.builder()
                .id(ticket.getId())
                .codigo(ticket.getCodigo())
                .titulo(ticket.getTitulo())
                .descripcion(ticket.getDescripcion())
                .estado(ticket.getEstado())
                .prioridad(ticket.getPrioridad())
                .entidad(ticket.getEntidad())
                .sede(ticket.getSede())
                .reactivado(ticket.isReactivado())
                .categoriaNombre(ticket.getSubcategoria().getCategory().getName())
                .subcategoriaNombre(ticket.getSubcategoria().getName())
                .subcategoriaId(ticket.getSubcategoria().getId())
                .usuarioId(ticket.getSolicitante().getId())
                .solicitanteNombre(ticket.getSolicitante().getNombre() + " " + ticket.getSolicitante().getApellidos())
                .tecnicoId(ticket.getTecnico() != null ? ticket.getTecnico().getId() : null)
                .tecnicoNombre(ticket.getTecnico() != null ? ticket.getTecnico().getNombre() + " " + ticket.getTecnico().getApellidos() : "Sin asignar")
                .fechaCreacion(ticket.getFechaCreacion())
                .fechaActualizacion(ticket.getFechaActualizacion())
                .fechaResolucion(ticket.getFechaResolucion())
                .fechaCierre(ticket.getFechaCierre())
                .informeResolucion(informe)
                .slaLimiteHoras(sla.limiteHoras())
                .slaHorasRestantes(sla.horasRestantes())
                .slaEstado(sla.estado())
                .calificacion(calificacion)
                .comentarioCliente(comentarioCliente)
                .build();
    }
}
