package com.empresa.helpdesk.modules.ticket.service;

import com.empresa.helpdesk.modules.ticket.dto.DashboardStatsResponse;
import com.empresa.helpdesk.modules.ticket.dto.TicketVolumeResponse;
import com.empresa.helpdesk.modules.ticket.enums.TicketStatus;
import com.empresa.helpdesk.modules.ticket.repository.TicketRepository;
import com.empresa.helpdesk.modules.user.entity.User;
import com.empresa.helpdesk.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.TextStyle;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsernameOrEmail(username, username)
                .orElseThrow(() -> new RuntimeException("Usuario autenticado no encontrado"));
    }

    private boolean isAdmin(User user) {
        return user.getRoles().stream().anyMatch(role -> role.getName().equals("ADMIN"));
    }

    private boolean hasAuthority(User user, String authority) {
        return user.getRoles().stream()
                .flatMap(role -> role.getPermissions().stream())
                .anyMatch(p -> p.getName().equals(authority));
    }

    @Transactional(readOnly = true)
    public DashboardStatsResponse getGeneralStats() {
        User currentUser = getCurrentUser();
        boolean seesAll = isAdmin(currentUser) || hasAuthority(currentUser, "TICKET_VIEW_ALL");

        long total;
        long inProgress;
        long resolved;
        long overdue;

        if (seesAll) {
            total = ticketRepository.count();
            inProgress = ticketRepository.countByEstadoIn(
                Arrays.asList(TicketStatus.NUEVO, TicketStatus.ASIGNADO, TicketStatus.EN_PROCESO, TicketStatus.PENDIENTE_USUARIO, TicketStatus.PENDIENTE_TECNICO)
            );
            resolved = ticketRepository.countByEstadoIn(
                Arrays.asList(TicketStatus.RESUELTO, TicketStatus.CERRADO)
            );
            overdue = ticketRepository.countOverdueTickets(
                Arrays.asList(TicketStatus.RESUELTO, TicketStatus.CERRADO, TicketStatus.CANCELADO)
            );
        } else {
            Long userId = currentUser.getId();
            total = ticketRepository.countBySolicitanteIdOrTecnicoId(userId, userId);
            inProgress = ticketRepository.countByEstadoInAndUser(
                Arrays.asList(TicketStatus.NUEVO, TicketStatus.ASIGNADO, TicketStatus.EN_PROCESO, TicketStatus.PENDIENTE_USUARIO, TicketStatus.PENDIENTE_TECNICO),
                userId
            );
            resolved = ticketRepository.countByEstadoInAndUser(
                Arrays.asList(TicketStatus.RESUELTO, TicketStatus.CERRADO),
                userId
            );
            overdue = ticketRepository.countOverdueTicketsByUser(
                Arrays.asList(TicketStatus.RESUELTO, TicketStatus.CERRADO, TicketStatus.CANCELADO),
                userId
            );
        }

        return DashboardStatsResponse.builder()
                .totalTickets(total)
                .inProgressTickets(inProgress)
                .resolvedTickets(resolved)
                .overdueTickets(overdue)
                .build();
    }

    @Transactional(readOnly = true)
    public List<TicketVolumeResponse> getTicketVolume(int monthsBack) {
        User currentUser = getCurrentUser();
        boolean seesAll = isAdmin(currentUser) || hasAuthority(currentUser, "TICKET_VIEW_ALL");
        LocalDateTime startDate = LocalDateTime.now().minusMonths(monthsBack).withDayOfMonth(1).withHour(0).withMinute(0);

        List<Object[]> rawData;
        if (seesAll) {
            rawData = ticketRepository.countTicketsByMonth(startDate);
        } else {
            rawData = ticketRepository.countTicketsByMonthForUser(startDate, currentUser.getId());
        }

        Map<Integer, Long> monthCounts = new HashMap<>();
        for (Object[] row : rawData) {
            Integer month = ((Number) row[0]).intValue();
            Long count = ((Number) row[1]).longValue();
            monthCounts.put(month, count);
        }

        List<TicketVolumeResponse> response = new ArrayList<>();
        for (int i = monthsBack - 1; i >= 0; i--) {
            LocalDateTime date = LocalDateTime.now().minusMonths(i);
            int monthValue = date.getMonthValue();

            String monthName = date.getMonth().getDisplayName(TextStyle.SHORT, new Locale("es", "ES"));
            monthName = monthName.substring(0, 1).toUpperCase() + monthName.substring(1);

            long count = monthCounts.getOrDefault(monthValue, 0L);

            response.add(TicketVolumeResponse.builder()
                    .name(monthName)
                    .tickets(count)
                    .build());
        }

        return response;
    }

    @Transactional(readOnly = true)
    public List<com.empresa.helpdesk.modules.ticket.dto.TechnicianMonthlyStatsResponse> getTechnicianMonthlyStats(int year) {
        LocalDateTime start = LocalDateTime.of(year, 1, 1, 0, 0);
        LocalDateTime end = start.plusYears(1);

        List<Object[]> rawData = ticketRepository.countResolvedByTechnicianByMonth(
                Arrays.asList(TicketStatus.RESUELTO, TicketStatus.CERRADO), start, end);

        Map<Long, com.empresa.helpdesk.modules.ticket.dto.TechnicianMonthlyStatsResponse> byTechnician = new LinkedHashMap<>();

        for (Object[] row : rawData) {
            Long tecnicoId = ((Number) row[0]).longValue();
            String nombre = (String) row[1];
            int mes = ((Number) row[2]).intValue();
            long cantidad = ((Number) row[3]).longValue();

            var stats = byTechnician.computeIfAbsent(tecnicoId, id ->
                    com.empresa.helpdesk.modules.ticket.dto.TechnicianMonthlyStatsResponse.builder()
                            .tecnicoId(id)
                            .tecnicoNombre(nombre)
                            .meses(new ArrayList<>(Collections.nCopies(12, 0)))
                            .total(0)
                            .build());

            stats.getMeses().set(mes - 1, stats.getMeses().get(mes - 1) + (int) cantidad);
            stats.setTotal(stats.getTotal() + (int) cantidad);
        }

        return byTechnician.values().stream()
                .sorted(Comparator.comparing(com.empresa.helpdesk.modules.ticket.dto.TechnicianMonthlyStatsResponse::getTotal).reversed())
                .collect(Collectors.toList());
    }
}
