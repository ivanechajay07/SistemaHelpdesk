package com.empresa.helpdesk.modules.inventario.dto;

import com.empresa.helpdesk.modules.inventario.enums.MantenimientoEstado;
import com.empresa.helpdesk.modules.inventario.enums.MantenimientoTipo;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class MantenimientoRequest {
    @NotNull(message = "El activo es obligatorio")
    private Long activoId;

    @NotNull(message = "El tipo es obligatorio")
    private MantenimientoTipo tipo;

    @NotNull(message = "El estado es obligatorio")
    private MantenimientoEstado estado;

    @NotNull(message = "La fecha es obligatoria")
    private LocalDate fecha;

    private Long tecnicoId;
    private String proveedor;
    private String descripcion;
    private String problemaEncontrado;
    private String trabajoRealizado;
    private String repuestos;
    private BigDecimal costo;
    private LocalDate proximaRevision;
    private String observaciones;
    private Long ticketId;
}
