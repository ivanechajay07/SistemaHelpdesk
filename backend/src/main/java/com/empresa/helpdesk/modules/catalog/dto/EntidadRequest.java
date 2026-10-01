package com.empresa.helpdesk.modules.catalog.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class EntidadRequest {

    @NotBlank(message = "El nombre de la entidad es obligatorio")
    @Size(max = 150, message = "La entidad no puede exceder 150 caracteres")
    private String nombre;

    @NotEmpty(message = "Debe registrar al menos una sede")
    @Valid
    private List<SedeItemRequest> sedes;
}