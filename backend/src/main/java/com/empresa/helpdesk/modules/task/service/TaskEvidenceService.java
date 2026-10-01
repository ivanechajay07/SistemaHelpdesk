package com.empresa.helpdesk.modules.task.service;

import com.empresa.helpdesk.modules.task.dto.TaskEvidenceRequest;
import com.empresa.helpdesk.modules.task.dto.TaskEvidenceResponse;
import com.empresa.helpdesk.modules.task.entity.Task;
import com.empresa.helpdesk.modules.task.entity.TaskEvidence;
import com.empresa.helpdesk.modules.task.repository.TaskEvidenceRepository;
import com.empresa.helpdesk.modules.task.repository.TaskRepository;
import com.empresa.helpdesk.modules.user.entity.User;
import com.empresa.helpdesk.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TaskEvidenceService {

    public static final String TIPO_PROCESO = "PROCESO";
    public static final String TIPO_COMPLETADA = "COMPLETADA";

    private final TaskEvidenceRepository evidenceRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<TaskEvidenceResponse> getEvidences(Long taskId) {
        Task task = loadTask(taskId);
        User current = getCurrentUser();
        validateView(task, current);
        return evidenceRepository.findByTaskIdOrderByFechaCreacionAsc(taskId).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional
    public TaskEvidenceResponse addEvidence(Long taskId, TaskEvidenceRequest request) {
        Task task = loadTask(taskId);
        User current = getCurrentUser();
        validateWrite(task, current);

        String tipo = normalizarTipo(request.getTipo());

        TaskEvidence evidence = TaskEvidence.builder()
                .task(task)
                .tipo(tipo)
                .imagenData(request.getImagenData())
                .comentario(trimOrNull(request.getComentario()))
                .subidoPor(current)
                .build();

        return mapToResponse(evidenceRepository.save(evidence));
    }

    @Transactional
    public void deleteEvidence(Long taskId, Long evidenceId) {
        Task task = loadTask(taskId);
        User current = getCurrentUser();
        validateWrite(task, current);

        TaskEvidence evidence = evidenceRepository.findById(evidenceId)
                .orElseThrow(() -> new RuntimeException("Evidencia no encontrada"));
        if (!evidence.getTask().getId().equals(taskId)) {
            throw new RuntimeException("La evidencia no pertenece a esta tarea");
        }
        evidenceRepository.delete(evidence);
    }

    private String normalizarTipo(String tipo) {
        String t = tipo != null ? tipo.trim().toUpperCase() : "";
        if (!TIPO_PROCESO.equals(t) && !TIPO_COMPLETADA.equals(t)) {
            throw new RuntimeException("Tipo de evidencia inválido. Use PROCESO o COMPLETADA.");
        }
        return t;
    }

    private Task loadTask(Long taskId) {
        return taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Tarea no encontrada"));
    }

    /** Puede ver la evidencia: admin, supervisor, técnico asignado o creador de la tarea. */
    private void validateView(Task task, User current) {
        if (isAdmin(current) || isSupervisor(current)
                || isAsignado(task, current) || isCreador(task, current)) {
            return;
        }
        throw new RuntimeException("No tienes acceso a la evidencia de esta tarea");
    }

    /** Puede agregar/eliminar evidencia: admin, supervisor o el técnico asignado. */
    private void validateWrite(Task task, User current) {
        if (isAdmin(current) || isSupervisor(current) || isAsignado(task, current)) {
            return;
        }
        throw new RuntimeException("Solo el técnico asignado puede registrar evidencia de esta tarea");
    }

    private boolean isAsignado(Task task, User user) {
        return task.getTecnico() != null && task.getTecnico().getId().equals(user.getId());
    }

    private boolean isCreador(Task task, User user) {
        return task.getCreador() != null && task.getCreador().getId().equals(user.getId());
    }

    private boolean isAdmin(User user) {
        return user.getRoles().stream().anyMatch(r -> "ADMIN".equals(r.getName()));
    }

    private boolean isSupervisor(User user) {
        return user.getRoles().stream().anyMatch(r -> "SUPERVISOR".equals(r.getName()));
    }

    private String trimOrNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsernameOrEmail(username, username)
                .orElseThrow(() -> new RuntimeException("Usuario autenticado no encontrado"));
    }

    private TaskEvidenceResponse mapToResponse(TaskEvidence e) {
        return TaskEvidenceResponse.builder()
                .id(e.getId())
                .taskId(e.getTask().getId())
                .tipo(e.getTipo())
                .imagenData(e.getImagenData())
                .comentario(e.getComentario())
                .subidoPorId(e.getSubidoPor() != null ? e.getSubidoPor().getId() : null)
                .subidoPorNombre(e.getSubidoPor() != null
                        ? (e.getSubidoPor().getNombre() + " " + e.getSubidoPor().getApellidos()).trim()
                        : null)
                .fechaCreacion(e.getFechaCreacion())
                .build();
    }
}
