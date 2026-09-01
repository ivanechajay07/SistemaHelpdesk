package com.empresa.helpdesk.modules.inventario.dto;

import com.empresa.helpdesk.modules.inventario.enums.PrestamoEstado;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class PrestamoResponse {
    private Long id;
    private Long activoId;
    private String activoCodigo;
    private String activoNombre;
    private Long solicitanteId;
    private String solicitanteNombre;
    private Long responsableEntregaId;
    private String responsableEntregaNombre;
    private LocalDate fechaEntrega;
    private LocalDate fechaDevolucionPrevista;
    private LocalDate fechaDevolucionReal;
    private String motivo;
    private PrestamoEstado estado;
    private String observaciones;
    private LocalDateTime fechaCreacion;
    private Boolean devolucionVencida;
}
