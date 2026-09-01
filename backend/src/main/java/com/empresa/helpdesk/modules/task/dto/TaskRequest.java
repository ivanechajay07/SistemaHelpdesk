package com.empresa.helpdesk.modules.task.dto;

import com.empresa.helpdesk.modules.task.enums.TaskPriority;
import com.empresa.helpdesk.modules.task.enums.TaskStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

@Data
public class TaskRequest {

    @NotBlank(message = "El título es obligatorio")
    @Size(max = 150, message = "El título no puede exceder 150 caracteres")
    private String titulo;

    @Size(max = 2000, message = "La descripción no puede exceder 2000 caracteres")
    private String descripcion;

    @NotNull(message = "La prioridad es obligatoria")
    private TaskPriority prioridad;

    private TaskStatus estado;

    @NotNull(message = "La fecha de inicio es obligatoria")
    private LocalDate fechaInicio;

    @NotNull(message = "La fecha fin es obligatoria")
    private LocalDate fechaFin;

    @NotNull(message = "Debe asignarse un técnico")
    private Long tecnicoId;
}
