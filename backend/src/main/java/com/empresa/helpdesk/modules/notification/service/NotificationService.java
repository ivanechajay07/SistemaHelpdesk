package com.empresa.helpdesk.modules.notification.service;

import com.empresa.helpdesk.modules.notification.dto.NotificationDto;
import com.empresa.helpdesk.modules.task.entity.Task;
import com.empresa.helpdesk.modules.task.enums.TaskStatus;
import com.empresa.helpdesk.modules.task.repository.TaskRepository;
import com.empresa.helpdesk.modules.ticket.entity.Ticket;
import com.empresa.helpdesk.modules.ticket.enums.TicketStatus;
import com.empresa.helpdesk.modules.ticket.repository.TicketHistoryRepository;
import com.empresa.helpdesk.modules.ticket.repository.TicketRepository;
import com.empresa.helpdesk.modules.user.entity.PasswordResetRequest;
import com.empresa.helpdesk.modules.user.entity.User;
import com.empresa.helpdesk.modules.user.repository.PasswordResetRequestRepository;
import com.empresa.helpdesk.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private static final int MAX_ITEMS = 15;

    /** Los avisos con más de estos días se ocultan automáticamente del feed. */
    private static final int MAX_AGE_DAYS = 7;

    private final TicketRepository ticketRepository;
    private final TicketHistoryRepository ticketHistoryRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final PasswordResetRequestRepository passwordResetRequestRepository;

    private static final Set<String> STAFF_ROLES = Set.of("ADMIN", "SUPERVISOR", "TECNICO");

    /**
     * Visibilidad del feed de notificaciones:
     *  - ADMIN: todos los tickets, ordenados por fecha (más recientes primero).
     *  - TECNICO y SUPERVISOR: únicamente sus tickets asignados y los tickets
     *    que ellos mismos hayan reactivado.
     *  - CLIENTE: sus tickets recientes generados por él mismo y los que haya
     *    reactivado.
     *  - Los tickets RESUELTOS y CERRADOS desaparecen de las notificaciones
     *    para todos los roles, evitando que se acumulen.
     */
    @Transactional(readOnly = true)
    public List<NotificationDto> getNotifications() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User current = userRepository.findByUsernameOrEmail(username, username)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        boolean isStaff = current.getAuthorities().stream()
                .anyMatch(a -> {
                    String auth = a.getAuthority();
                    return auth != null && STAFF_ROLES.contains(auth.replace("ROLE_", ""));
                });

        // Solo el administrador ve notificaciones de seguridad y registros de usuarios
        boolean isAdmin = current.getAuthorities().stream()
                .anyMatch(a -> {
                    String auth = a.getAuthority();
                    return auth != null && auth.replace("ROLE_", "").equals("ADMIN");
                });

        // Los tickets resueltos y cerrados desaparecen de las notificaciones
        List<TicketStatus> estadosOcultos = List.of(TicketStatus.RESUELTO, TicketStatus.CERRADO);

        Map<Long, Ticket> visibles = new LinkedHashMap<>();
        Set<Long> reactivadosPorMi = new java.util.HashSet<>();

        if (isAdmin) {
            // Administrador: visualiza TODOS los tickets de forma ordenada
            ticketRepository.findTop15ByEstadoNotInOrderByFechaCreacionDesc(estadosOcultos)
                    .forEach(t -> visibles.put(t.getId(), t));
        } else {
            if (isStaff) {
                // Técnico y Supervisor: solo sus tickets asignados
                ticketRepository.findTop10ByTecnicoIdAndEstadoNotInOrderByFechaCreacionDesc(current.getId(), estadosOcultos)
                        .forEach(t -> visibles.put(t.getId(), t));
            } else {
                // Cliente: solo los tickets recientes que él mismo generó
                ticketRepository.findTop10BySolicitanteIdAndEstadoNotInOrderByFechaCreacionDesc(current.getId(), estadosOcultos)
                        .forEach(t -> visibles.put(t.getId(), t));
            }

            // Técnicos, supervisores y clientes: tickets que ellos mismos reactivaron
            ticketHistoryRepository.findReactivacionesDeUsuario(current.getId()).stream()
                    .map(h -> h.getTicket())
                    .filter(t -> !estadosOcultos.contains(t.getEstado()))
                    .forEach(t -> {
                        reactivadosPorMi.add(t.getId());
                        visibles.putIfAbsent(t.getId(), t);
                    });
        }

        // Ordenar siempre por fecha de creación (más recientes primero) y limitar
        List<Ticket> tickets = new ArrayList<>(visibles.values());
        tickets.sort(Comparator.comparing(
                Ticket::getFechaCreacion,
                Comparator.nullsLast(Comparator.reverseOrder())));
        if (tickets.size() > MAX_ITEMS) {
            tickets = tickets.subList(0, MAX_ITEMS);
        }

        List<NotificationDto> items = new ArrayList<>();

        for (Ticket t : tickets) {
            String solicitante = t.getSolicitante() != null
                    ? trimTo(t.getSolicitante().getNombre() + " " + t.getSolicitante().getApellidos(), 60)
                    : "—";
            String estadoLegible = t.getEstado() != null ? t.getEstado().name().replace('_', ' ') : "";
            String detalle = t.getCodigo() + " · " + trimTo(t.getTitulo(), 70);

            boolean esReactivadoPorMi = reactivadosPorMi.contains(t.getId());
            boolean esAsignadoAMi = t.getTecnico() != null && t.getTecnico().getId().equals(current.getId());

            String title;
            String description;
            if (esReactivadoPorMi) {
                title = "Ticket reactivado";
                description = "Reactivaste " + detalle + " · Estado actual: " + estadoLegible;
            } else if (!isAdmin && esAsignadoAMi) {
                title = "Ticket asignado a ti";
                description = detalle + " · Solicitante: " + solicitante + " · Estado: " + estadoLegible;
            } else if (!isAdmin) {
                title = "Tu ticket fue registrado";
                description = detalle + " · Estado: " + estadoLegible;
            } else {
                title = "Nuevo ticket generado";
                description = detalle + " · " + solicitante + " · Estado: " + estadoLegible;
            }

            items.add(new NotificationDto(
                    NotificationDto.TYPE_TICKET_CREATED,
                    title,
                    description,
                    t.getFechaCreacion(),
                    t.getId()));
        }

        if (isAdmin) {
            for (PasswordResetRequest p : passwordResetRequestRepository
                    .findTop10ByStatusOrderByFechaResolucionDesc(PasswordResetRequest.ResetStatus.COMPLETADO)) {
                User u = p.getUsuario();
                String nombre = u != null ? trimTo(u.getNombre() + " " + u.getApellidos(), 60) : p.getEmail();
                items.add(new NotificationDto(
                        NotificationDto.TYPE_PASSWORD_CHANGED,
                        "Cambio de contraseña",
                        nombre + " (" + (u != null ? u.getEmail() : p.getEmail()) + ") actualizó su contraseña",
                        p.getFechaResolucion(),
                        u != null ? u.getId() : null));
            }

            for (User u : userRepository.findByActivoFalseOrderByIdDesc()) {
                items.add(new NotificationDto(
                        NotificationDto.TYPE_USER_PENDING,
                        "Registro pendiente de activación",
                        trimTo(u.getNombre() + " " + u.getApellidos(), 60) + " (" + u.getEmail() + ") espera que un administrador active su cuenta",
                        null,
                        u.getId()));
            }
        }

        // ===== TAREAS: asignaciones y completadas =====
        // Las notificaciones de tareas completadas desaparecen a los 3 días.
        LocalDateTime cutoffCompletadas = LocalDateTime.now().minusDays(3);
        List<Task> tareas;
        if (isAdmin) {
            tareas = taskRepository.findTop15ByOrderByFechaCreacionDesc();
        } else if (isStaff) {
            // Técnico/Supervisor: notificaciones ordenadas de las tareas asignadas a ellos
            tareas = taskRepository.findTop10ByTecnicoIdOrderByFechaCreacionDesc(current.getId());
        } else {
            tareas = List.of();
        }

        for (Task tarea : tareas) {
            String tituloTarea = trimTo(tarea.getTitulo(), 70);
            String tecnicoNombre = tarea.getTecnico() != null
                    ? trimTo(tarea.getTecnico().getNombre() + " " + tarea.getTecnico().getApellidos(), 60)
                    : "—";

            if (tarea.getEstado() == TaskStatus.COMPLETADA) {
                if (tarea.getFechaCompletada() == null || tarea.getFechaCompletada().isBefore(cutoffCompletadas)) {
                    continue;
                }
                items.add(new NotificationDto(
                        NotificationDto.TYPE_TASK_COMPLETED,
                        isAdmin ? "Tarea completada" : "Completaste una tarea",
                        tituloTarea + " · Técnico: " + tecnicoNombre,
                        tarea.getFechaCompletada(),
                        tarea.getId()));
            } else {
                boolean esMia = tarea.getTecnico() != null && tarea.getTecnico().getId().equals(current.getId());
                items.add(new NotificationDto(
                        NotificationDto.TYPE_TASK_ASSIGNED,
                        esMia ? "Tarea asignada a ti" : "Nueva tarea registrada",
                        tituloTarea + " · Prioridad: " + tarea.getPrioridad() + " · Técnico: " + tecnicoNombre,
                        tarea.getFechaCreacion(),
                        tarea.getId()));
            }
        }

        items.sort(Comparator.comparing(
                NotificationDto::date,
                Comparator.nullsLast(Comparator.reverseOrder())));

        // Ocultar automáticamente los avisos con más de MAX_AGE_DAYS días.
        // Los que no tienen fecha (p. ej. registros pendientes) se conservan.
        LocalDateTime cutoff = LocalDateTime.now().minusDays(MAX_AGE_DAYS);
        items = items.stream()
                .filter(n -> n.date() == null || n.date().isAfter(cutoff))
                .toList();

        return items.size() > MAX_ITEMS ? items.subList(0, MAX_ITEMS) : items;
    }

    private String trimTo(String value, int max) {
        if (value == null) return "";
        String clean = value.trim().replaceAll("\\s+", " ");
        return clean.length() > max ? clean.substring(0, max - 1) + "…" : clean;
    }
}
