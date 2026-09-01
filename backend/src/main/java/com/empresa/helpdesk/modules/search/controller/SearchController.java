package com.empresa.helpdesk.modules.search.controller;

import com.empresa.helpdesk.modules.ticket.entity.Ticket;
import com.empresa.helpdesk.modules.ticket.repository.TicketRepository;
import com.empresa.helpdesk.modules.user.entity.User;
import com.empresa.helpdesk.modules.user.repository.UserRepository;
import com.empresa.helpdesk.modules.inventario.entity.Activo;
import com.empresa.helpdesk.modules.inventario.repository.ActivoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/search")
@RequiredArgsConstructor
public class SearchController {

    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;
    private final ActivoRepository activoRepository;

    @GetMapping
    public ResponseEntity<Map<String, Object>> search(@RequestParam("q") String q) {
        String term = (q == null) ? "" : q.trim();
        if (term.length() < 2) {
            return ResponseEntity.ok(Map.of("tickets", List.of(), "usuarios", List.of(), "activos", List.of()));
        }

        List<Ticket> tickets = ticketRepository.findTop5ByTituloContainingIgnoreCaseOrCodigoContainingIgnoreCaseOrderByFechaCreacionDesc(term, term);
        List<Map<String, Object>> ticketResults = tickets.stream()
                .map(t -> Map.<String, Object>of(
                        "id", t.getId(),
                        "codigo", t.getCodigo(),
                        "titulo", t.getTitulo(),
                        "estado", t.getEstado().name()
                ))
                .toList();

        List<User> usuarios = userRepository.findByUsernameContainingIgnoreCaseOrEmailContainingIgnoreCaseOrNombreContainingIgnoreCaseOrApellidosContainingIgnoreCase(term, term, term, term)
                .stream().limit(5).toList();
        List<Map<String, Object>> userResults = usuarios.stream()
                .map(u -> Map.<String, Object>of(
                        "id", u.getId(),
                        "username", u.getUsername(),
                        "nombre", u.getNombre() + " " + u.getApellidos(),
                        "email", u.getEmail(),
                        "activo", u.isActivo()
                ))
                .toList();

        List<Map<String, Object>> activos = activoRepository.buscar(term, null, null, null, null, null,
                        org.springframework.data.domain.PageRequest.of(0, 5))
                .stream().map(a -> Map.<String, Object>of(
                        "id", a.getId(),
                        "codigo", a.getCodigo(),
                        "nombre", a.getNombre(),
                        "estado", a.getEstado() != null ? a.getEstado().name() : null,
                        "sede", a.getSede() != null ? a.getSede().getNombre() : null
                ))
                .toList();

        return ResponseEntity.ok(Map.of("tickets", ticketResults, "usuarios", userResults, "activos", activos));
    }
}
