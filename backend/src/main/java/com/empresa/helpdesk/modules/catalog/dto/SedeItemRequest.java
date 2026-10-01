package com.empresa.helpdesk.modules.catalog.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SedeItemRequest {

    @NotBlank(message = "El nombre de la sede es obligatorio")
    @Size(max = 150, message = "La sede no puede exceder 150 caracteres")
    private String nombre;

    @Size(max = 500, message = "La descripción no puede exceder 500 caracteres")
    private String descripcion;
}