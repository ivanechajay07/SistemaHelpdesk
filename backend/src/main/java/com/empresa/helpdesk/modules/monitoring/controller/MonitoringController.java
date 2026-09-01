package com.empresa.helpdesk.modules.monitoring.controller;

import com.empresa.helpdesk.modules.monitoring.dto.MonitoredTargetRequest;
import com.empresa.helpdesk.modules.monitoring.dto.MonitoredTargetResponse;
import com.empresa.helpdesk.modules.monitoring.service.MonitoringService;
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
@RequestMapping("/api/v1/monitoring")
@RequiredArgsConstructor
@PreAuthorize("hasAnyAuthority('MONITORING_VIEW', 'ROLE_ADMIN')")
@Tag(name = "Monitoreo de Red", description = "Objetivos vigilados y generación automática de tickets por caídas")
public class MonitoringController {

    private final MonitoringService monitoringService;

    @GetMapping
    @Operation(summary = "Listar todos los objetivos de monitoreo con su estado actual")
    public ResponseEntity<List<MonitoredTargetResponse>> getAll() {
        return ResponseEntity.ok(monitoringService.getAll());
    }

    @PostMapping
    @Operation(summary = "Registrar un nuevo objetivo de monitoreo")
    public ResponseEntity<MonitoredTargetResponse> create(@Valid @RequestBody MonitoredTargetRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(monitoringService.create(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Actualizar un objetivo de monitoreo")
    public ResponseEntity<MonitoredTargetResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody MonitoredTargetRequest request) {
        return ResponseEntity.ok(monitoringService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Eliminar un objetivo de monitoreo")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        monitoringService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/check")
    @Operation(summary = "Forzar una verificación inmediata del objetivo")
    public ResponseEntity<MonitoredTargetResponse> checkNow(@PathVariable Long id) {
        return ResponseEntity.ok(monitoringService.checkNow(id));
    }
}
