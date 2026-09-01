package com.empresa.helpdesk.modules.task.dto;

import com.empresa.helpdesk.modules.task.enums.TaskStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class TaskStatusRequest {

    @NotNull(message = "El estado es obligatorio")
    private TaskStatus estado;
}
