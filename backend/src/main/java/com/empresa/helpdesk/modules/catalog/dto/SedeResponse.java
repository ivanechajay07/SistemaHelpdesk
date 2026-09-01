package com.empresa.helpdesk.modules.catalog.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SedeResponse {
    private Long id;
    private String nombre;
    private String descripcion;
    private Long entidadId;
    private String entidadNombre;
}
