package com.empresa.helpdesk.modules.inventario.dto;

import com.empresa.helpdesk.modules.inventario.enums.ActivoEstado;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Data
@Builder
public class ActivoResponse {
    private Long id;
    private String codigo;
    private String nombre;
    private Long categoriaId;
    private String categoriaNombre;
    private String marca;
    private String modelo;
    private String numeroSerie;
    private String codigoPatrimonial;
    private ActivoEstado estado;
    private LocalDate fechaAdquisicion;
    private LocalDate fechaIngreso;

    private Long entidadId;
    private String entidadNombre;
    private Long sedeId;
    private String sedeNombre;
    private String area;
    private String ubicacionFisica;

    private Long responsableId;
    private String responsableNombre;
    private String cargoResponsable;
    private String dniResponsable;

    private String proveedor;
    private String numeroFactura;
    private LocalDate fechaCompra;
    private BigDecimal costo;
    private String moneda;
    private String ordenCompra;

    private boolean tieneGarantia;
    private LocalDate garantiaInicio;
    private LocalDate garantiaVencimiento;
    private String proveedorGarantia;

    private String fotoUrl;
    private String qrToken;
    private LocalDateTime fechaCreacion;
    private LocalDateTime fechaActualizacion;

    @Builder.Default
    private Map<String, String> especificaciones = new HashMap<>();

    // Utilidades para alertas (UX)
    private Boolean garantiaPorVencer;
    private Boolean garantiaVencida;
}
