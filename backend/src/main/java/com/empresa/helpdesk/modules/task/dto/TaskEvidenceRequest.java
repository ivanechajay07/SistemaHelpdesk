package com.empresa.helpdesk.modules.task.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class TaskEvidenceRequest {

    /** PROCESO (avance) o COMPLETADA (trabajo finalizado). */
    @NotBlank(message = "El tipo de evidencia es obligatorio")
    private String tipo;

    /** Imagen en formato data URL (base64). Límite ~6 MB de contenido binario. */
    @NotBlank(message = "La imagen es obligatoria")
    @Size(max = 8_000_000, message = "La imagen de evidencia supera el tamaño máximo permitido")
    private String imagenData;

    @Size(max = 1000, message = "El comentario no puede superar los 1000 caracteres")
    private String comentario;
}
