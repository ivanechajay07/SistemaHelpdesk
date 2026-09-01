package com.empresa.helpdesk.modules.inventario.controller;

import com.empresa.helpdesk.modules.inventario.dto.PrestamoRequest;
import com.empresa.helpdesk.modules.inventario.dto.PrestamoResponse;
import com.empresa.helpdesk.modules.inventario.service.PrestamoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/inventario/prestamos")
@RequiredArgsConstructor
@Tag(name = "Inventario - Préstamos", description = "Préstamos de activos y devoluciones")
public class PrestamoController {

    private final PrestamoService prestamoService;

    @GetMapping
    @Operation(summary = "Listar préstamos")
    @PreAuthorize("hasAnyAuthority('INV_VIEW', 'INV_PRESTAMO', 'ROLE_ADMIN')")
    public ResponseEntity<List<PrestamoResponse>> listar(
            @RequestParam(required = false) Long activoId) {
        if (activoId != null) {
            return ResponseEntity.ok(prestamoService.listarPorActivo(activoId));
        }
        return ResponseEntity.ok(prestamoService.listar());
    }

    @PostMapping
    @Operation(summary = "Registrar préstamo")
    @PreAuthorize("hasAnyAuthority('INV_PRESTAMO', 'ROLE_ADMIN')")
    public ResponseEntity<PrestamoResponse> crear(@Valid @RequestBody PrestamoRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(prestamoService.crear(request));
    }

    @PostMapping("/{id}/devolver")
    @Operation(summary = "Registrar devolución")
    @PreAuthorize("hasAnyAuthority('INV_PRESTAMO', 'ROLE_ADMIN')")
    public ResponseEntity<PrestamoResponse> devolver(@PathVariable Long id) {
        return ResponseEntity.ok(prestamoService.devolver(id));
    }
}
