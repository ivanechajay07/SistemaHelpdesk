package com.empresa.helpdesk.modules.catalog.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SedeRequest {

    private Long entidadId;

    @NotBlank(message = "La entidad es obligatoria")
    @Size(max = 150, message = "La entidad no puede exceder 150 caracteres")
    private String entidadNombre;

    @NotBlank(message = "La sede es obligatoria")
    @Size(max = 150, message = "La sede no puede exceder 150 caracteres")
    private String nombre;

    @Size(max = 500, message = "La descripción no puede exceder 500 caracteres")
    private String descripcion;
}
