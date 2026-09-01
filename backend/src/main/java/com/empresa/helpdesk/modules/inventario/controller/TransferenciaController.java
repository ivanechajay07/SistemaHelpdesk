package com.empresa.helpdesk.modules.inventario.controller;

import com.empresa.helpdesk.modules.inventario.dto.TransferenciaRequest;
import com.empresa.helpdesk.modules.inventario.dto.TransferenciaResponse;
import com.empresa.helpdesk.modules.inventario.service.TransferenciaService;
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
@RequestMapping("/api/v1/inventario/transferencias")
@RequiredArgsConstructor
@Tag(name = "Inventario - Transferencias", description = "Traslados inter-sede e inter-entidad")
public class TransferenciaController {

    private final TransferenciaService transferenciaService;

    @GetMapping
    @Operation(summary = "Listar transferencias")
    @PreAuthorize("hasAnyAuthority('INV_VIEW', 'INV_TRANSFER', 'ROLE_ADMIN')")
    public ResponseEntity<List<TransferenciaResponse>> listar() {
        return ResponseEntity.ok(transferenciaService.listar());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtener transferencia")
    @PreAuthorize("hasAnyAuthority('INV_VIEW', 'INV_TRANSFER', 'ROLE_ADMIN')")
    public ResponseEntity<TransferenciaResponse> obtener(@PathVariable Long id) {
        return ResponseEntity.ok(transferenciaService.obtener(id));
    }

    @PostMapping
    @Operation(summary = "Crear transferencia (guía de traslado)")
    @PreAuthorize("hasAnyAuthority('INV_TRANSFER', 'ROLE_ADMIN')")
    public ResponseEntity<TransferenciaResponse> crear(@Valid @RequestBody TransferenciaRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(transferenciaService.crear(request));
    }

    @PostMapping("/{id}/recibir")
    @Operation(summary = "Confirmar recepción de transferencia")
    @PreAuthorize("hasAnyAuthority('INV_TRANSFER', 'ROLE_ADMIN')")
    public ResponseEntity<TransferenciaResponse> confirmarRecepcion(@PathVariable Long id) {
        return ResponseEntity.ok(transferenciaService.confirmarRecepcion(id));
    }

    @PostMapping("/{id}/anular")
    @Operation(summary = "Anular transferencia pendiente")
    @PreAuthorize("hasAnyAuthority('INV_TRANSFER', 'ROLE_ADMIN')")
    public ResponseEntity<TransferenciaResponse> anular(@PathVariable Long id,
                                                        @RequestBody(required = false) Map<String, String> body) {
        String motivo = body != null ? body.get("motivo") : null;
        return ResponseEntity.ok(transferenciaService.anular(id, motivo));
    }
}
