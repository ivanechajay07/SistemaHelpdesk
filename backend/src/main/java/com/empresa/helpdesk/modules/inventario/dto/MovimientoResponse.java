package com.empresa.helpdesk.modules.inventario.dto;

import com.empresa.helpdesk.modules.inventario.enums.MovimientoTipo;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class MovimientoResponse {
    private Long id;
    private Long activoId;
    private String activoCodigo;
    private String activoNombre;
    private MovimientoTipo tipo;

    private Long entidadOrigenId;
    private String entidadOrigenNombre;
    private Long sedeOrigenId;
    private String sedeOrigenNombre;
    private Long responsableAnteriorId;
    private String responsableAnteriorNombre;
    private String ubicacionOrigen;

    private Long entidadDestinoId;
    private String entidadDestinoNombre;
    private Long sedeDestinoId;
    private String sedeDestinoNombre;
    private Long responsableNuevoId;
    private String responsableNuevoNombre;
    private String ubicacionDestino;

    private LocalDateTime fecha;
    private String usuarioOperacion;
    private String motivo;
    private String observaciones;
    private String documentoUrl;
    private boolean confirmado;
}
