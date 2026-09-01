package com.empresa.helpdesk.modules.inventario.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class TransferenciaRequest {
    @NotEmpty(message = "Debe seleccionar al menos un activo")
    private List<Long> activoIds;

    private Long entidadOrigenId;
    private Long sedeOrigenId;
    private Long entidadDestinoId;
    private Long sedeDestinoId;
    private Long responsableEntregaId;
    private Long responsableRecibeId;
    private String motivo;
    private String observaciones;
    private LocalDateTime fecha;
}
