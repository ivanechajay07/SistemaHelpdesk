package com.empresa.helpdesk.modules.inventario.controller;

import com.empresa.helpdesk.modules.inventario.dto.MovimientoRequest;
import com.empresa.helpdesk.modules.inventario.dto.MovimientoResponse;
import com.empresa.helpdesk.modules.inventario.service.MovimientoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/inventario/movimientos")
@RequiredArgsConstructor
@Tag(name = "Inventario - Movimientos", description = "Historial de movimientos de activos")
public class MovimientoController {

    private final MovimientoService movimientoService;

    @GetMapping
    @Operation(summary = "Listar movimientos (con filtro por activo)")
    @PreAuthorize("hasAnyAuthority('INV_VIEW', 'INV_HISTORIAL', 'ROLE_ADMIN')")
    public ResponseEntity<Page<MovimientoResponse>> listar(
            @RequestParam(required = false) Long activoId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "fecha"));
        return ResponseEntity.ok(movimientoService.listar(activoId, pageable));
    }

    @GetMapping("/activo/{activoId}")
    @Operation(summary = "Listar movimientos de un activo (historial completo)")
    @PreAuthorize("hasAnyAuthority('INV_VIEW', 'INV_HISTORIAL', 'ROLE_ADMIN')")
    public ResponseEntity<List<MovimientoResponse>> listarPorActivo(@PathVariable Long activoId) {
        return ResponseEntity.ok(movimientoService.listarPorActivo(activoId));
    }

    @PostMapping
    @Operation(summary = "Registrar un movimiento")
    @PreAuthorize("hasAnyAuthority('INV_MOVER', 'ROLE_ADMIN')")
    public ResponseEntity<MovimientoResponse> registrar(@Valid @RequestBody MovimientoRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(movimientoService.registrar(request));
    }
}
