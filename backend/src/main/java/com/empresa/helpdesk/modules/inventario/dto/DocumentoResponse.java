package com.empresa.helpdesk.modules.inventario.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class DocumentoResponse {
    private Long id;
    private Long activoId;
    private String tipo;
    private String nombre;
    private String url;
    private String descripcion;
    private String subidoPor;
    private LocalDateTime fechaCreacion;
}
