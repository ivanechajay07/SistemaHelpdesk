package com.empresa.helpdesk.modules.inventario.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class DocumentoRequest {
    @NotNull(message = "El activo es obligatorio")
    private Long activoId;

    @NotBlank(message = "El tipo de documento es obligatorio")
    private String tipo;

    @NotBlank(message = "El nombre es obligatorio")
    private String nombre;

    @NotBlank(message = "La URL es obligatoria")
    private String url;

    private String descripcion;
}
