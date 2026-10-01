package com.empresa.helpdesk.modules.inventario.entity;

import com.empresa.helpdesk.modules.catalog.entity.Entidad;
import com.empresa.helpdesk.modules.catalog.entity.Sede;
import com.empresa.helpdesk.modules.inventario.enums.ActivoEstado;
import com.empresa.helpdesk.modules.user.entity.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "inventario_activos")
public class Activo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "codigo", unique = true, nullable = false, length = 60)
    private String codigo;

    @Column(nullable = false, length = 150)
    private String nombre;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "categoria_id", nullable = false)
    private CategoriaActivo categoria;

    @Column(length = 120)
    private String marca;

    @Column(length = 120)
    private String modelo;

    @Column(name = "numero_serie", length = 120)
    private String numeroSerie;

    @Column(name = "codigo_patrimonial", length = 120)
    private String codigoPatrimonial;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ActivoEstado estado;

    @Column(name = "fecha_adquisicion")
    private LocalDate fechaAdquisicion;

    @Column(name = "fecha_ingreso")
    private LocalDate fechaIngreso;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entidad_id")
    private Entidad entidad;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sede_id")
    private Sede sede;

    @Column(length = 150)
    private String area;

    @Column(name = "ubicacion_fisica", length = 200)
    private String ubicacionFisica;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "responsable_id")
    private User responsable;

    @Column(length = 120)
    private String cargoResponsable;

    @Column(length = 60)
    private String dniResponsable;

    // Datos de compra
    @Column(length = 150)
    private String proveedor;

    @Column(name = "numero_factura", length = 100)
    private String numeroFactura;

    @Column(name = "fecha_compra")
    private LocalDate fechaCompra;

    @Column(precision = 14, scale = 2)
    private BigDecimal costo;

    @Column(length = 10)
    private String moneda;

    @Column(name = "orden_compra", length = 100)
    private String ordenCompra;

    // Garantía
    @Builder.Default
    @Column(name = "tiene_garantia", nullable = false)
    private boolean tieneGarantia = false;

    @Column(name = "garantia_inicio")
    private LocalDate garantiaInicio;

    @Column(name = "garantia_vencimiento")
    private LocalDate garantiaVencimiento;

    @Column(name = "proveedor_garantia", length = 150)
    private String proveedorGarantia;

    @Column(name = "foto_url", length = 300)
    private String fotoUrl;

    @CreationTimestamp
    @Column(name = "fecha_creacion", updatable = false)
    private LocalDateTime fechaCreacion;

    @UpdateTimestamp
    @Column(name = "fecha_actualizacion")
    private LocalDateTime fechaActualizacion;

    @Column(name = "qr_token", unique = true, length = 80)
    private String qrToken;

    // Bloqueo optimista: evita que dos operaciones concurrentes (p. ej. dos
    // préstamos del mismo activo) sobrescriban el estado sin detectarlo.
    @Version
    @Column(name = "version")
    private Long version;
}
