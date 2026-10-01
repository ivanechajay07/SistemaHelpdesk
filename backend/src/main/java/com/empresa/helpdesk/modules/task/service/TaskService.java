package com.empresa.helpdesk.modules.task.service;

import com.empresa.helpdesk.modules.notification.service.EmailService;
import com.empresa.helpdesk.modules.task.dto.TaskRequest;
import com.empresa.helpdesk.modules.task.dto.TaskResponse;
import com.empresa.helpdesk.modules.task.entity.Task;
import com.empresa.helpdesk.modules.task.enums.TaskStatus;
import com.empresa.helpdesk.modules.task.repository.TaskEvidenceRepository;
import com.empresa.helpdesk.modules.task.repository.TaskRepository;
import com.empresa.helpdesk.modules.user.entity.User;
import com.empresa.helpdesk.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class TaskService {

    private final TaskRepository taskRepository;
    private final TaskEvidenceRepository taskEvidenceRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    @Transactional(readOnly = true)
    public List<TaskResponse> getTasks() {
        User current = getCurrentUser();
        List<Task> tasks;
        if (canManage(current)) {
            tasks = taskRepository.findAllByOrderByFechaInicioAsc();
        } else {
            tasks = taskRepository.findByTecnicoIdOrderByFechaInicioAsc(current.getId());
        }
        return tasks.stream().map(this::mapToResponse).toList();
    }

    @Transactional
    public TaskResponse createTask(TaskRequest request) {
        if (request.getFechaFin().isBefore(request.getFechaInicio())) {
            throw new RuntimeException("La fecha fin no puede ser anterior a la fecha de inicio");
        }
        User tecnico = userRepository.findById(request.getTecnicoId())
                .orElseThrow(() -> new RuntimeException("Técnico no encontrado"));

        TaskStatus estadoInicial = request.getEstado() != null ? request.getEstado() : TaskStatus.PENDIENTE;
        LocalDateTime now = LocalDateTime.now();

        Task task = Task.builder()
                .titulo(request.getTitulo().trim())
                .descripcion(request.getDescripcion() != null ? request.getDescripcion().trim() : null)
                .prioridad(request.getPrioridad())
                .estado(estadoInicial)
                .fechaInicio(request.getFechaInicio())
                .fechaFin(request.getFechaFin())
                .fechaInicioProceso(estadoInicial == TaskStatus.EN_PROCESO ? now : null)
                .fechaCompletada(estadoInicial == TaskStatus.COMPLETADA ? now : null)
                .tecnico(tecnico)
                .creador(getCurrentUser())
                .build();

        Task saved = taskRepository.save(task);
        precargarParaCorreo(saved, tecnico);
        notifyAssignment(saved, tecnico);
        return mapToResponse(saved);
    }

    @Transactional
    public TaskResponse updateTask(Long id, TaskRequest request) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tarea no encontrada"));
        User current = getCurrentUser();
        validateManageAccess(current);

        if (request.getFechaFin().isBefore(request.getFechaInicio())) {
            throw new RuntimeException("La fecha fin no puede ser anterior a la fecha de inicio");
        }

        User tecnicoAnterior = task.getTecnico();
        User nuevoTecnico = tecnicoAnterior;
        if (request.getTecnicoId() != null && !request.getTecnicoId().equals(tecnicoAnterior.getId())) {
            nuevoTecnico = userRepository.findById(request.getTecnicoId())
                    .orElseThrow(() -> new RuntimeException("Técnico no encontrado"));
        }

        boolean cambioEstado = request.getEstado() != null && request.getEstado() != task.getEstado();
        task.setTitulo(request.getTitulo().trim());
        task.setDescripcion(request.getDescripcion() != null ? request.getDescripcion().trim() : null);
        task.setPrioridad(request.getPrioridad());
        if (cambioEstado) {
            applyTransition(task, request.getEstado());
        }
        task.setFechaInicio(request.getFechaInicio());
        task.setFechaFin(request.getFechaFin());
        task.setTecnico(nuevoTecnico);

        Task saved = taskRepository.save(task);
        if (nuevoTecnico != tecnicoAnterior) {
            precargarParaCorreo(saved, nuevoTecnico);
            notifyAssignment(saved, nuevoTecnico);
        }
        return mapToResponse(saved);
    }

    /**
     * Cambio de estado de una tarea.
     * - Admin/Supervisor/TASK_MANAGE: pueden cambiar el estado de cualquier tarea.
     * - Técnico: únicamente el estado de las tareas que le fueron asignadas.
     */
    @Transactional
    public TaskResponse updateTaskStatus(Long id, TaskStatus estado) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tarea no encontrada"));
        User current = getCurrentUser();

        if (!canManage(current) && !task.getTecnico().getId().equals(current.getId())) {
            throw new RuntimeException("Solo puedes actualizar el estado de las tareas asignadas a ti");
        }

        if (task.getEstado() == TaskStatus.COMPLETADA && !canManage(current)) {
            throw new RuntimeException("La tarea ya está completada");
        }

        // El técnico asignado debe adjuntar evidencia (imágenes) al iniciar el
        // proceso y al marcar la tarea como completada.
        boolean isAsignado = task.getTecnico() != null && task.getTecnico().getId().equals(current.getId());
        if (isAsignado && !canManage(current)) {
            if (estado == TaskStatus.EN_PROCESO && taskEvidenceRepository.countByTaskIdAndTipo(id, "PROCESO") == 0) {
                throw new RuntimeException(
                        "Debes adjuntar al menos una imagen como evidencia para iniciar el proceso.");
            }
            if (estado == TaskStatus.COMPLETADA && taskEvidenceRepository.countByTaskIdAndTipo(id, "COMPLETADA") == 0) {
                throw new RuntimeException(
                        "Debes adjuntar al menos una imagen de evidencia del trabajo realizado para completar la tarea.");
            }
        }

        applyTransition(task, estado);
        return mapToResponse(taskRepository.save(task));
    }

    @Transactional
    public void deleteTask(Long id) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tarea no encontrada"));
        User current = getCurrentUser();
        validateManageAccess(current);
        taskEvidenceRepository.deleteByTaskId(id);
        taskRepository.delete(task);
    }

    private void applyTransition(Task task, TaskStatus nuevoEstado) {
        LocalDateTime now = LocalDateTime.now();
        switch (nuevoEstado) {
            case PENDIENTE -> {
                task.setFechaInicioProceso(null);
                task.setFechaCompletada(null);
            }
            case EN_PROCESO -> {
                if (task.getFechaInicioProceso() == null) {
                    task.setFechaInicioProceso(now);
                }
                task.setFechaCompletada(null);
            }
            case COMPLETADA -> {
                if (task.getFechaInicioProceso() == null) {
                    task.setFechaInicioProceso(now);
                }
                task.setFechaCompletada(now);
            }
        }
        task.setEstado(nuevoEstado);
    }

    /**
     * Fuerza la carga de las asociaciones lazy que usa la plantilla del correo.
     * El correo se envía en otro hilo (@Async) sin sesión de Hibernate, por lo
     * que si no se inicializan aquí podrían fallar de forma silenciosa.
     */
    private void precargarParaCorreo(Task task, User tecnico) {
        if (task.getTecnico() != null) {
            task.getTecnico().getNombre();
            task.getTecnico().getApellidos();
        }
        if (task.getCreador() != null) {
            task.getCreador().getNombre();
            task.getCreador().getApellidos();
        }
        tecnico.getNombre();
        tecnico.getApellidos();
    }

    /**
     * Notifica al técnico asignado: notificación en el sistema (derivada del listado)
     * y correo electrónico. El fallo del correo no interrumpe la operación.
     */
    private void notifyAssignment(Task task, User tecnico) {
        if (tecnico.getEmail() == null || tecnico.getEmail().isBlank()) {
            log.warn("No se envió el correo de tarea asignada: el técnico {} no tiene correo configurado", tecnico.getUsername());
            return;
        }
        try {
            emailService.sendTaskAssignedEmail(tecnico.getEmail(), task, tecnico);
        } catch (Exception e) {
            log.warn("No se pudo enviar el correo de tarea asignada a {}: {}", tecnico.getEmail(), e.getMessage());
        }
    }

    private void validateManageAccess(User current) {
        if (!canManage(current)) {
            throw new RuntimeException("Solo puedes actualizar el estado de tus tareas asignadas");
        }
    }

    /**
     * Solo ADMIN y SUPERVISOR gestionan tareas (crear/editar/eliminar).
     * TASK_MANAGE es únicamente la puerta del menú; no autoriza operaciones de escritura.
     */
    private boolean canManage(User user) {
        return isAdmin(user) || isSupervisor(user);
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsernameOrEmail(username, username)
                .orElseThrow(() -> new RuntimeException("Usuario autenticado no encontrado"));
    }

    private boolean isAdmin(User user) {
        return user.getRoles().stream().anyMatch(role -> role.getName().equals("ADMIN"));
    }

    private boolean isSupervisor(User user) {
        return user.getRoles().stream().anyMatch(role -> role.getName().equals("SUPERVISOR"));
    }

    private boolean hasAuthority(User user, String authority) {
        return user.getRoles().stream()
                .flatMap(role -> role.getPermissions().stream())
                .anyMatch(p -> p.getName().equals(authority));
    }

    private TaskResponse mapToResponse(Task task) {
        return TaskResponse.builder()
                .id(task.getId())
                .titulo(task.getTitulo())
                .descripcion(task.getDescripcion())
                .prioridad(task.getPrioridad())
                .estado(task.getEstado())
                .fechaInicio(task.getFechaInicio())
                .fechaFin(task.getFechaFin())
                .tecnicoId(task.getTecnico().getId())
                .tecnicoNombre(task.getTecnico().getNombre() + " " + task.getTecnico().getApellidos())
                .creadorId(task.getCreador() != null ? task.getCreador().getId() : null)
                .creadorNombre(task.getCreador() != null
                        ? task.getCreador().getNombre() + " " + task.getCreador().getApellidos()
                        : null)
                .fechaCreacion(task.getFechaCreacion())
                .fechaActualizacion(task.getFechaActualizacion())
                .fechaInicioProceso(task.getFechaInicioProceso())
                .fechaCompletada(task.getFechaCompletada())
                .build();
    }
}
