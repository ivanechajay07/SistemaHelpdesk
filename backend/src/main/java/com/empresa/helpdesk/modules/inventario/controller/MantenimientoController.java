package com.empresa.helpdesk.modules.inventario.controller;

import com.empresa.helpdesk.modules.inventario.dto.MantenimientoRequest;
import com.empresa.helpdesk.modules.inventario.dto.MantenimientoResponse;
import com.empresa.helpdesk.modules.inventario.enums.MantenimientoEstado;
import com.empresa.helpdesk.modules.inventario.service.MantenimientoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/inventario/mantenimientos")
@RequiredArgsConstructor
@Tag(name = "Inventario - Mantenimientos", description = "Preventivos y correctivos de activos")
public class MantenimientoController {

    private final MantenimientoService mantenimientoService;

    @GetMapping
    @Operation(summary = "Listar mantenimientos")
    @PreAuthorize("hasAnyAuthority('INV_VIEW', 'INV_MANT', 'ROLE_ADMIN')")
    public ResponseEntity<List<MantenimientoResponse>> listar(
            @RequestParam(required = false) Long activoId) {
        if (activoId != null) {
            return ResponseEntity.ok(mantenimientoService.listarPorActivo(activoId));
        }
        return ResponseEntity.ok(mantenimientoService.listar());
    }

    @PostMapping
    @Operation(summary = "Registrar mantenimiento")
    @PreAuthorize("hasAnyAuthority('INV_MANT', 'ROLE_ADMIN')")
    public ResponseEntity<MantenimientoResponse> crear(@Valid @RequestBody MantenimientoRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(mantenimientoService.crear(request));
    }

    @PatchMapping("/{id}/estado")
    @Operation(summary = "Cambiar estado de mantenimiento")
    @PreAuthorize("hasAnyAuthority('INV_MANT', 'ROLE_ADMIN')")
    public ResponseEntity<MantenimientoResponse> cambiarEstado(@PathVariable Long id,
                                                               @RequestBody Map<String, Object> body) {
        MantenimientoEstado estado = MantenimientoEstado.valueOf((String) body.get("estado"));
        String trabajoRealizado = (String) body.get("trabajoRealizado");
        return ResponseEntity.ok(mantenimientoService.actualizarEstado(id, estado, trabajoRealizado));
    }
}
