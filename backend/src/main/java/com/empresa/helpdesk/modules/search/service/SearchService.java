package com.empresa.helpdesk.modules.search.service;

import com.empresa.helpdesk.modules.inventario.repository.ActivoRepository;
import com.empresa.helpdesk.modules.ticket.entity.Ticket;
import com.empresa.helpdesk.modules.ticket.repository.TicketRepository;
import com.empresa.helpdesk.modules.user.entity.User;
import com.empresa.helpdesk.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Búsqueda global con control de visibilidad por permisos.
 * Mantiene la lógica fuera del controlador (capa de servicio).
 */
@Service
@RequiredArgsConstructor
public class SearchService {

    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;
    private final ActivoRepository activoRepository;

    @Transactional(readOnly = true)
    public Map<String, Object> search(String q) {
        String term = (q == null) ? "" : q.trim();
        if (term.length() < 2) {
            return Map.of("tickets", List.of(), "usuarios", List.of(), "activos", List.of());
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Set<String> authorities = auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toSet());

        boolean staff = authorities.contains("ROLE_ADMIN") || authorities.contains("TICKET_VIEW_ALL")
                || authorities.contains("USER_MANAGE") || authorities.contains("REPORT_VIEW");
        boolean canSeeInventory = staff || authorities.contains("INV_VIEW");

        List<Ticket> tickets;
        if (staff) {
            tickets = ticketRepository
                    .findTop5ByTituloContainingIgnoreCaseOrCodigoContainingIgnoreCaseOrderByFechaCreacionDesc(term, term);
        } else {
            User me = userRepository.findByUsernameOrEmail(auth.getName(), auth.getName()).orElse(null);
            if (me == null) {
                tickets = List.of();
            } else {
                String lower = term.toLowerCase();
                tickets = ticketRepository
                        .findBySolicitanteIdOrTecnicoId(me.getId(), me.getId(), PageRequest.of(0, 50))
                        .getContent().stream()
                        .filter(t -> coincide(t, lower))
                        .limit(5)
                        .toList();
            }
        }
        List<Map<String, Object>> ticketResults = tickets.stream()
                .map(t -> Map.<String, Object>of(
                        "id", t.getId(),
                        "codigo", t.getCodigo(),
                        "titulo", t.getTitulo(),
                        "estado", t.getEstado() != null ? t.getEstado().name() : ""
                ))
                .toList();

        List<Map<String, Object>> userResults = List.of();
        if (staff) {
            List<User> usuarios = userRepository
                    .findByUsernameContainingIgnoreCaseOrEmailContainingIgnoreCaseOrNombreContainingIgnoreCaseOrApellidosContainingIgnoreCase(
                            term, term, term, term)
                    .stream().limit(5).toList();
            userResults = usuarios.stream()
                    .map(u -> Map.<String, Object>of(
                            "id", u.getId(),
                            "username", u.getUsername() != null ? u.getUsername() : "",
                            "nombre", ((u.getNombre() != null ? u.getNombre() : "") + " "
                                    + (u.getApellidos() != null ? u.getApellidos() : "")).trim(),
                            "email", u.getEmail() != null ? u.getEmail() : "",
                            "activo", u.isActivo()
                    ))
                    .toList();
        }

        List<Map<String, Object>> activos = List.of();
        if (canSeeInventory) {
            activos = activoRepository.buscar(term, null, null, null, null, null, PageRequest.of(0, 5))
                    .stream().map(a -> Map.<String, Object>of(
                            "id", a.getId(),
                            "codigo", a.getCodigo() != null ? a.getCodigo() : "",
                            "nombre", a.getNombre() != null ? a.getNombre() : "",
                            "estado", a.getEstado() != null ? a.getEstado().name() : "",
                            "sede", a.getSede() != null && a.getSede().getNombre() != null ? a.getSede().getNombre() : ""
                    ))
                    .toList();
        }

        return Map.of("tickets", ticketResults, "usuarios", userResults, "activos", activos);
    }

    private boolean coincide(Ticket t, String lower) {
        return (t.getTitulo() != null && t.getTitulo().toLowerCase().contains(lower))
                || (t.getCodigo() != null && t.getCodigo().toLowerCase().contains(lower));
    }
}
