package com.empresa.helpdesk.modules.correo.controller;

import com.empresa.helpdesk.modules.correo.dto.CorreoRequest;
import com.empresa.helpdesk.modules.correo.dto.CorreoResponse;
import com.empresa.helpdesk.modules.correo.service.CorreoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Directorio de Correos Corporativos.
 * - El listado solo lo ven roles de alto nivel (ADMIN, SUPERVISOR) y NUNCA expone contraseñas.
 * - Crear/editar/eliminar y revelar contraseñas: SOLO administrador.
 */
@RestController
@RequestMapping("/api/v1/correos")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
@Tag(name = "Directorio de Correo Corporativo", description = "Directorio de correos con contraseñas cifradas (solo administradores)")
public class CorreoController {

    private final CorreoService correoService;

    @GetMapping
    @Operation(summary = "Listar el directorio de correos (sin contraseñas)")
    public ResponseEntity<List<CorreoResponse>> list() {
        return ResponseEntity.ok(correoService.list());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtener un registro del directorio (sin contraseñas)")
    public ResponseEntity<CorreoResponse> get(@PathVariable Long id) {
        return ResponseEntity.ok(correoService.get(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Registrar un correo corporativo con sus cuentas y contraseñas cifradas")
    public ResponseEntity<CorreoResponse> create(@Valid @RequestBody CorreoRequest request) {
        return ResponseEntity.ok(correoService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Actualizar un registro del directorio")
    public ResponseEntity<CorreoResponse> update(@PathVariable Long id, @Valid @RequestBody CorreoRequest request) {
        return ResponseEntity.ok(correoService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Eliminar un registro del directorio")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Long id) {
        correoService.delete(id);
        return ResponseEntity.ok(Map.of("message", "Registro eliminado correctamente"));
    }

    @GetMapping("/{id}/password/{cuentaId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Revelar la contraseña de una cuenta (SOLO administrador)")
    public ResponseEntity<Map<String, String>> getPassword(@PathVariable Long id, @PathVariable Long cuentaId) {
        String email = correoService.get(id).getCuentas().stream()
                .filter(c -> c.getId().equals(cuentaId))
                .map(c -> c.getEmail())
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Cuenta de correo no encontrada"));
        return ResponseEntity.ok(Map.of("email", email, "password", correoService.getPassword(id, cuentaId)));
    }
}