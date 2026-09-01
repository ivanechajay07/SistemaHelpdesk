package com.empresa.helpdesk.modules.inventario.controller;

import com.empresa.helpdesk.modules.inventario.dto.DashboardInventarioResponse;
import com.empresa.helpdesk.modules.inventario.service.InventarioDashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/inventario/dashboard")
@RequiredArgsConstructor
@Tag(name = "Inventario - Dashboard", description = "Indicadores del inventario")
public class InventarioDashboardController {

    private final InventarioDashboardService dashboardService;

    @GetMapping
    @Operation(summary = "Resumen de indicadores del inventario")
    @PreAuthorize("hasAnyAuthority('INV_VIEW', 'ROLE_ADMIN')")
    public ResponseEntity<DashboardInventarioResponse> resumen() {
        return ResponseEntity.ok(dashboardService.resumen());
    }
}
