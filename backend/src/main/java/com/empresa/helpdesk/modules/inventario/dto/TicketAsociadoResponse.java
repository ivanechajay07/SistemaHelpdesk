package com.empresa.helpdesk.modules.inventario.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class TicketAsociadoResponse {
    private Long id;
    private String codigo;
    private String titulo;
    private String categoria;
    private String estado;
    private String prioridad;
    private LocalDateTime fechaCreacion;
    private String tecnicoNombre;
}
