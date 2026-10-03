package com.empresa.helpdesk.modules.inventario.dto;

import com.empresa.helpdesk.modules.inventario.enums.MantenimientoEstado;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Cierre / cambio de estado de un mantenimiento. Incluye el informe de lo
 * realizado (problema, trabajo, repuestos, costo, próxima revisión y
 * observaciones) que se guarda junto con el nuevo estado.
 */
@Data
public class MantenimientoCierreRequest {

    @NotNull(message = "El estado es obligatorio")
    private MantenimientoEstado estado;

    private String trabajoRealizado;
    private String problemaEncontrado;
    private String repuestos;
    private BigDecimal costo;
    private LocalDate proximaRevision;
    private String observaciones;
}
