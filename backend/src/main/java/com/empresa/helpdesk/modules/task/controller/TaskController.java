package com.empresa.helpdesk.modules.task.controller;

import com.empresa.helpdesk.modules.task.dto.TaskEvidenceRequest;
import com.empresa.helpdesk.modules.task.dto.TaskEvidenceResponse;
import com.empresa.helpdesk.modules.task.dto.TaskRequest;
import com.empresa.helpdesk.modules.task.dto.TaskResponse;
import com.empresa.helpdesk.modules.task.dto.TaskStatusRequest;
import com.empresa.helpdesk.modules.task.service.TaskEvidenceService;
import com.empresa.helpdesk.modules.task.service.TaskService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/tasks")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
@Tag(name = "Tareas", description = "Gestor de tareas asignadas a técnicos")
public class TaskController {

    private final TaskService taskService;
    private final TaskEvidenceService taskEvidenceService;

    @GetMapping
    @Operation(summary = "Listar tareas (admin/supervisor: todas; técnico: las suyas)")
    public ResponseEntity<List<TaskResponse>> getTasks() {
        return ResponseEntity.ok(taskService.getTasks());
    }

    @PostMapping
    @Operation(summary = "Registrar una tarea (admin/supervisor)")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPERVISOR')")
    public ResponseEntity<TaskResponse> createTask(@Valid @RequestBody TaskRequest request) {
        return ResponseEntity.ok(taskService.createTask(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Actualizar una tarea (solo admin/supervisor)")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPERVISOR')")
    public ResponseEntity<TaskResponse> updateTask(@PathVariable Long id, @Valid @RequestBody TaskRequest request) {
        return ResponseEntity.ok(taskService.updateTask(id, request));
    }

    @PutMapping("/{id}/estado")
    @Operation(summary = "Actualizar estado de la tarea (técnico asignado o admin/supervisor)")
    public ResponseEntity<TaskResponse> updateTaskStatus(@PathVariable Long id, @Valid @RequestBody TaskStatusRequest request) {
        return ResponseEntity.ok(taskService.updateTaskStatus(id, request.getEstado()));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Eliminar una tarea (admin/supervisor)")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPERVISOR')")
    public ResponseEntity<Map<String, String>> deleteTask(@PathVariable Long id) {
        taskService.deleteTask(id);
        return ResponseEntity.ok(Map.of("message", "Tarea eliminada correctamente"));
    }

    // ===== Evidencia (imágenes) de la tarea =====

    @GetMapping("/{id}/evidence")
    @Operation(summary = "Listar imágenes de evidencia de una tarea")
    public ResponseEntity<List<TaskEvidenceResponse>> getEvidence(@PathVariable Long id) {
        return ResponseEntity.ok(taskEvidenceService.getEvidences(id));
    }

    @PostMapping("/{id}/evidence")
    @Operation(summary = "Registrar una imagen de evidencia (técnico asignado)")
    public ResponseEntity<TaskEvidenceResponse> addEvidence(
            @PathVariable Long id,
            @Valid @RequestBody TaskEvidenceRequest request) {
        return ResponseEntity.ok(taskEvidenceService.addEvidence(id, request));
    }

    @DeleteMapping("/{id}/evidence/{evidenceId}")
    @Operation(summary = "Eliminar una imagen de evidencia (técnico asignado)")
    public ResponseEntity<Map<String, String>> deleteEvidence(
            @PathVariable Long id,
            @PathVariable Long evidenceId) {
        taskEvidenceService.deleteEvidence(id, evidenceId);
        return ResponseEntity.ok(Map.of("message", "Evidencia eliminada correctamente"));
    }
}
