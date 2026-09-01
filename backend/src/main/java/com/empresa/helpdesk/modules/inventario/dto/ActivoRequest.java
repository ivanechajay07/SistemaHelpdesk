package com.empresa.helpdesk.modules.inventario.dto;

import com.empresa.helpdesk.modules.inventario.enums.ActivoEstado;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

@Data
public class ActivoRequest {

    @NotBlank(message = "El código del activo es obligatorio")
    private String codigo;

    @NotBlank(message = "El nombre del equipo es obligatorio")
    private String nombre;

    @NotNull(message = "La categoría es obligatoria")
    private Long categoriaId;

    private String marca;
    private String modelo;
    private String numeroSerie;
    private String codigoPatrimonial;

    @NotNull(message = "El estado es obligatorio")
    private ActivoEstado estado;

    private LocalDate fechaAdquisicion;
    private LocalDate fechaIngreso;

    private Long entidadId;
    private Long sedeId;
    private String area;
    private String ubicacionFisica;

    private Long responsableId;
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

    // Especificaciones técnicas clave -> valor (adaptables por categoría)
    private Map<String, String> especificaciones = new HashMap<>();
}
