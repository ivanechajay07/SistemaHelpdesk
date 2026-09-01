package com.empresa.helpdesk.modules.inventario.dto;

import com.empresa.helpdesk.modules.inventario.enums.MantenimientoEstado;
import com.empresa.helpdesk.modules.inventario.enums.MantenimientoTipo;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class MantenimientoResponse {
    private Long id;
    private Long activoId;
    private String activoCodigo;
    private String activoNombre;
    private MantenimientoTipo tipo;
    private MantenimientoEstado estado;
    private LocalDate fecha;
    private Long tecnicoId;
    private String tecnicoNombre;
    private String proveedor;
    private String descripcion;
    private String problemaEncontrado;
    private String trabajoRealizado;
    private String repuestos;
    private BigDecimal costo;
    private LocalDate proximaRevision;
    private String observaciones;
    private Long ticketId;
    private String ticketCodigo;
    private String documentoUrl;
    private LocalDateTime fechaCreacion;
}
