package com.empresa.helpdesk.modules.ticket.service;

import com.empresa.helpdesk.modules.ticket.entity.Ticket;
import com.empresa.helpdesk.modules.ticket.enums.Priority;
import com.empresa.helpdesk.modules.ticket.enums.TicketStatus;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SlaServiceTest {

    private final SlaService slaService = new SlaService();

    @Test
    void limiteHorasPorPrioridad() {
        assertEquals(4, slaService.limiteHoras(Priority.CRITICA));
        assertEquals(8, slaService.limiteHoras(Priority.ALTA));
        assertEquals(24, slaService.limiteHoras(Priority.MEDIA));
        assertEquals(48, slaService.limiteHoras(Priority.BAJA));
    }

    @Test
    void ticketAbiertoDentroDelTiempoEstaEnTiempo() {
        Ticket ticket = Ticket.builder()
                .prioridad(Priority.MEDIA)
                .estado(TicketStatus.NUEVO)
                .fechaCreacion(LocalDateTime.now().minusHours(2))
                .build();

        SlaService.SlaInfo sla = slaService.calcular(ticket);
        assertEquals("EN_TIEMPO", sla.estado());
        assertEquals(24, sla.limiteHoras());
        // El cálculo usa "now" en dos momentos: se valida un rango tolerante al timing
        assertTrue(sla.horasRestantes() >= 21.0 && sla.horasRestantes() <= 22.0,
                "horasRestantes fuera del rango esperado: " + sla.horasRestantes());
    }

    @Test
    void ticketAbiertoFueraDePlazoEstaVencido() {
        Ticket ticket = Ticket.builder()
                .prioridad(Priority.CRITICA)
                .estado(TicketStatus.EN_PROCESO)
                .fechaCreacion(LocalDateTime.now().minusHours(10))
                .build();

        SlaService.SlaInfo sla = slaService.calcular(ticket);
        assertEquals("VENCIDO", sla.estado());
        assertEquals(0.0, sla.horasRestantes());
    }

    @Test
    void ticketResueltoAntesDelLimiteCumplido() {
        Ticket ticket = Ticket.builder()
                .prioridad(Priority.ALTA)
                .estado(TicketStatus.RESUELTO)
                .fechaCreacion(LocalDateTime.now().minusHours(6))
                .fechaResolucion(LocalDateTime.now().minusHours(1))
                .build();

        assertEquals("CUMPLIDO", slaService.calcular(ticket).estado());
    }

    @Test
    void ticketResueltoDespuesDelLimiteVencido() {
        Ticket ticket = Ticket.builder()
                .prioridad(Priority.CRITICA)
                .estado(TicketStatus.CERRADO)
                .fechaCreacion(LocalDateTime.now().minusHours(10))
                .fechaResolucion(LocalDateTime.now().minusHours(1))
                .build();

        assertEquals("VENCIDO", slaService.calcular(ticket).estado());
    }

    @Test
    void ticketCercaDeVencerEstaPorVencer() {
        // MEDIA = 24h; con 22h transcurridas queda ~2h restantes (<= limite/4 = 6h)
        Ticket ticket = Ticket.builder()
                .prioridad(Priority.MEDIA)
                .estado(TicketStatus.ASIGNADO)
                .fechaCreacion(LocalDateTime.now().minusHours(22))
                .build();

        assertEquals("POR_VENCER", slaService.calcular(ticket).estado());
    }
}
