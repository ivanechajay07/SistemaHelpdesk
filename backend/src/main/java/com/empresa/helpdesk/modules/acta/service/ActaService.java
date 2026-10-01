package com.empresa.helpdesk.modules.acta.service;

import com.empresa.helpdesk.modules.acta.dto.ActaRequest;
import com.empresa.helpdesk.modules.acta.dto.ActaResponse;
import com.empresa.helpdesk.modules.acta.entity.ActaConformidad;
import com.empresa.helpdesk.modules.acta.repository.ActaConformidadRepository;
import com.empresa.helpdesk.modules.ticket.entity.Ticket;
import com.empresa.helpdesk.modules.ticket.enums.TicketStatus;
import com.empresa.helpdesk.modules.ticket.repository.TicketRepository;
import com.empresa.helpdesk.modules.user.entity.User;
import com.empresa.helpdesk.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ActaService {

    private final ActaConformidadRepository actaRepository;
    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public Optional<ActaResponse> getActaByTicket(Long ticketId) {
        Ticket ticket = loadTicket(ticketId);
        validateAccess(ticket);
        return actaRepository.findByTicketId(ticketId).map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public List<ActaResponse> getAllActas() {
        User currentUser = getCurrentUser();
        return actaRepository.findAllWithTicket().stream()
                .filter(acta -> canView(currentUser, acta.getTicket()))
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public ActaResponse createActa(Long ticketId, ActaRequest request) {
        Ticket ticket = loadTicket(ticketId);
        validateAccess(ticket);

        if (actaRepository.existsByTicketId(ticketId)) {
            throw new RuntimeException("El ticket ya tiene un acta de conformidad registrada");
        }
        if (ticket.getEstado() != TicketStatus.RESUELTO && ticket.getEstado() != TicketStatus.CERRADO) {
            throw new RuntimeException(
                    "El acta de conformidad solo puede generarse cuando el ticket está Resuelto o Cerrado");
        }

        User currentUser = getCurrentUser();

        // Solo el técnico asignado o un administrador pueden registrar el acta.
        // Así un solicitante no puede firmar en nombre del técnico (falsificación).
        boolean isTecnicoAsignado = ticket.getTecnico() != null
                && ticket.getTecnico().getId().equals(currentUser.getId());
        if (!isAdmin(currentUser) && !isTecnicoAsignado) {
            throw new RuntimeException(
                    "Solo el técnico asignado o un administrador pueden registrar el acta de conformidad");
        }

        ActaConformidad acta = ActaConformidad.builder()
                .ticket(ticket)
                .fecha(request.getFecha() != null ? request.getFecha() : LocalDate.now())
                .trabajosRealizados(request.getTrabajosRealizados().trim())
                .observaciones(trimOrNull(request.getObservaciones()))
                .fotoData(request.getFotoData())
                .firmaSolicitante(request.getFirmaSolicitante())
                .firmaTecnico(request.getFirmaTecnico())
                .creadoPor(currentUser)
                .build();

        return mapToResponse(actaRepository.save(acta));
    }

    private Ticket loadTicket(Long ticketId) {
        return ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket no encontrado"));
    }

    private void validateAccess(Ticket ticket) {
        User currentUser = getCurrentUser();
        if (!canView(currentUser, ticket)) {
            throw new RuntimeException("No tienes acceso al acta de este ticket");
        }
    }

    private boolean canView(User currentUser, Ticket ticket) {
        if (isAdmin(currentUser)) {
            return true;
        }
        boolean isSolicitante = ticket.getSolicitante().getId().equals(currentUser.getId());
        boolean isTecnico = ticket.getTecnico() != null && ticket.getTecnico().getId().equals(currentUser.getId());
        return isSolicitante || isTecnico;
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsernameOrEmail(username, username)
                .orElseThrow(() -> new RuntimeException("Usuario autenticado no encontrado"));
    }

    private boolean isAdmin(User user) {
        return user.getRoles().stream().anyMatch(role -> role.getName().equals("ADMIN"));
    }

    private String trimOrNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private ActaResponse mapToResponse(ActaConformidad acta) {
        Ticket ticket = acta.getTicket();
        return ActaResponse.builder()
                .id(acta.getId())
                .ticketId(ticket.getId())
                .codigo(ticket.getCodigo())
                .titulo(ticket.getTitulo())
                .estado(ticket.getEstado() != null ? ticket.getEstado().name() : null)
                .prioridad(ticket.getPrioridad() != null ? ticket.getPrioridad().name() : null)
                .fecha(acta.getFecha())
                .trabajosRealizados(acta.getTrabajosRealizados())
                .observaciones(acta.getObservaciones())
                .fotoData(acta.getFotoData())
                .firmaSolicitante(acta.getFirmaSolicitante())
                .firmaTecnico(acta.getFirmaTecnico())
                .solicitanteNombre(ticket.getSolicitante().getNombre() + " " + ticket.getSolicitante().getApellidos())
                .tecnicoNombre(ticket.getTecnico() != null
                        ? ticket.getTecnico().getNombre() + " " + ticket.getTecnico().getApellidos()
                        : "Sin asignar")
                .creadoPorNombre(acta.getCreadoPor().getNombre() + " " + acta.getCreadoPor().getApellidos())
                .fechaCreacion(acta.getFechaCreacion())
                .build();
    }
}