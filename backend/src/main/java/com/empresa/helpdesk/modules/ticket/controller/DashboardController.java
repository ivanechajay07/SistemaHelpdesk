package com.empresa.helpdesk.modules.ticket.controller;

import com.empresa.helpdesk.modules.ticket.dto.DashboardStatsResponse;
import com.empresa.helpdesk.modules.ticket.dto.TicketVolumeResponse;
import com.empresa.helpdesk.modules.ticket.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
@Tag(name = "Dashboard", description = "Endpoints para estadísticas del Dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/stats")
    @Operation(summary = "Obtener estadísticas generales de tickets")
    public ResponseEntity<DashboardStatsResponse> getGeneralStats() {
        return ResponseEntity.ok(dashboardService.getGeneralStats());
    }

    @GetMapping("/chart")
    @Operation(summary = "Obtener volumen de tickets por mes")
    public ResponseEntity<List<TicketVolumeResponse>> getTicketVolume(
            @RequestParam(defaultValue = "6") int months) {
        return ResponseEntity.ok(dashboardService.getTicketVolume(months));
    }

    @GetMapping("/technician-stats")
    @Operation(summary = "Tickets resueltos por técnico, mes a mes, para un año específico")
    public ResponseEntity<List<com.empresa.helpdesk.modules.ticket.dto.TechnicianMonthlyStatsResponse>> getTechnicianMonthlyStats(
            @RequestParam(required = false) Integer year) {
        int y = year != null ? year : java.time.LocalDate.now().getYear();
        return ResponseEntity.ok(dashboardService.getTechnicianMonthlyStats(y));
    }
}
