package com.empresa.helpdesk.modules.ticket.service;

import com.empresa.helpdesk.modules.ticket.entity.Ticket;
import com.empresa.helpdesk.modules.ticket.enums.Priority;
import com.empresa.helpdesk.modules.ticket.enums.TicketStatus;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Map;

/**
 * Política SLA por prioridad: horas máximas de resolución.
 * CRITICA 4h · ALTA 8h · MEDIA 24h · BAJA 48h
 */
@Service
public class SlaService {

    public record SlaInfo(int limiteHoras, Double horasRestantes, String estado) {}

    private static final Map<Priority, Integer> HORAS_RESOLUCION = Map.of(
            Priority.CRITICA, 4,
            Priority.ALTA, 8,
            Priority.MEDIA, 24,
            Priority.BAJA, 48
    );

    public int limiteHoras(Priority prioridad) {
        return HORAS_RESOLUCION.getOrDefault(prioridad, 24);
    }

    /**
     * Calcula el estado del SLA del ticket:
     * - CUMPLIDO: resuelto/cerrado dentro del límite
     * - VENCIDO: resuelto fuera del límite o sigue abierto y ya pasó el límite
     * - POR_VENCER: abierto con menos del 25% del tiempo restante
     * - EN_TIEMPO: abierto con tiempo suficiente
     */
    public SlaInfo calcular(Ticket ticket) {
        int limite = limiteHoras(ticket.getPrioridad());
        LocalDateTime inicio = ticket.getFechaCreacion();
        if (inicio == null) {
            return new SlaInfo(limite, null, "EN_TIEMPO");
        }
        LocalDateTime limiteFecha = inicio.plusHours(limite);
        boolean finalizado = ticket.getEstado() == TicketStatus.RESUELTO || ticket.getEstado() == TicketStatus.CERRADO;

        if (finalizado) {
            LocalDateTime fin = ticket.getFechaResolucion() != null ? ticket.getFechaResolucion() : ticket.getFechaCierre();
            boolean cumplido = fin != null && fin.isBefore(limiteFecha);
            return new SlaInfo(limite, null, cumplido ? "CUMPLIDO" : "VENCIDO");
        }

        long horasRestantes = Duration.between(LocalDateTime.now(), limiteFecha).toHours();
        if (horasRestantes <= 0) {
            return new SlaInfo(limite, 0.0, "VENCIDO");
        }
        if (horasRestantes <= Math.max(1, limite / 4)) {
            return new SlaInfo(limite, (double) horasRestantes, "POR_VENCER");
        }
        return new SlaInfo(limite, (double) horasRestantes, "EN_TIEMPO");
    }
}
