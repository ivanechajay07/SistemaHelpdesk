package com.empresa.helpdesk.modules.settings.service;

import com.empresa.helpdesk.modules.ticket.enums.TicketStatus;
import com.empresa.helpdesk.modules.ticket.repository.TicketRepository;
import com.empresa.helpdesk.modules.user.entity.User;
import com.empresa.helpdesk.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * Selecciona el técnico menos cargado (menor número de tickets abiertos) para
 * la asignación automática de tickets nuevos. Es determinista y no requiere
 * estado adicional.
 */
@Service
@RequiredArgsConstructor
public class AutoAssignmentService {

    private static final List<TicketStatus> CERRADOS = List.of(
            TicketStatus.RESUELTO, TicketStatus.CERRADO, TicketStatus.CANCELADO);

    private final UserRepository userRepository;
    private final TicketRepository ticketRepository;

    @Transactional(readOnly = true)
    public Optional<User> elegirTecnico() {
        List<User> tecnicos = userRepository.findByRoles_Name("TECNICO").stream()
                .filter(User::isActivo)
                .toList();
        if (tecnicos.isEmpty()) {
            return Optional.empty();
        }
        User elegido = null;
        long menorCarga = Long.MAX_VALUE;
        for (User tecnico : tecnicos) {
            long carga = ticketRepository.countByTecnicoIdAndEstadoNotIn(tecnico.getId(), CERRADOS);
            if (carga < menorCarga) {
                menorCarga = carga;
                elegido = tecnico;
            }
        }
        return Optional.ofNullable(elegido);
    }
}
