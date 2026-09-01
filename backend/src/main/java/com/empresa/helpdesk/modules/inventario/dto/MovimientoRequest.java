package com.empresa.helpdesk.modules.inventario.dto;

import com.empresa.helpdesk.modules.inventario.enums.MovimientoTipo;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class MovimientoRequest {
    @NotNull(message = "El activo es obligatorio")
    private Long activoId;

    @NotNull(message = "El tipo de movimiento es obligatorio")
    private MovimientoTipo tipo;

    private Long entidadOrigenId;
    private Long sedeOrigenId;
    private Long responsableAnteriorId;
    private String ubicacionOrigen;

    private Long entidadDestinoId;
    private Long sedeDestinoId;
    private Long responsableNuevoId;
    private String ubicacionDestino;

    /** Si false (default), el movimiento es histórico. Si true, actualiza la ubicación/responsable actual del activo. */
    private boolean aplicar = false;

    private String motivo;
    private String observaciones;
}
