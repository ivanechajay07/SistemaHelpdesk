package com.empresa.helpdesk.modules.task.dto;

import com.empresa.helpdesk.modules.task.enums.TaskPriority;
import com.empresa.helpdesk.modules.task.enums.TaskStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class TaskResponse {
    private Long id;
    private String titulo;
    private String descripcion;
    private TaskPriority prioridad;
    private TaskStatus estado;
    private LocalDate fechaInicio;
    private LocalDate fechaFin;
    private Long tecnicoId;
    private String tecnicoNombre;
    private Long creadorId;
    private String creadorNombre;
    private LocalDateTime fechaCreacion;
    private LocalDateTime fechaActualizacion;
    private LocalDateTime fechaInicioProceso;
    private LocalDateTime fechaCompletada;
}
