package com.empresa.helpdesk.modules.task.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class TaskEvidenceResponse {
    private Long id;
    private Long taskId;
    private String tipo;
    private String imagenData;
    private String comentario;
    private Long subidoPorId;
    private String subidoPorNombre;
    private LocalDateTime fechaCreacion;
}
