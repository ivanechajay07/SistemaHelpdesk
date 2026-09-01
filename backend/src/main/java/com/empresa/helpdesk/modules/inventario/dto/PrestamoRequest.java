package com.empresa.helpdesk.modules.inventario.dto;

import com.empresa.helpdesk.modules.inventario.enums.PrestamoEstado;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class PrestamoRequest {
    @NotNull(message = "El activo es obligatorio")
    private Long activoId;

    private Long solicitanteId;
    private Long responsableEntregaId;
    private LocalDate fechaEntrega;
    private LocalDate fechaDevolucionPrevista;
    private String motivo;

    @NotNull(message = "El estado es obligatorio")
    private PrestamoEstado estado;

    private String observaciones;
}
