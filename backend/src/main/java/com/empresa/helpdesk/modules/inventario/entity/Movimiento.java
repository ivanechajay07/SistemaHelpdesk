package com.empresa.helpdesk.modules.inventario.entity;

import com.empresa.helpdesk.modules.catalog.entity.Entidad;
import com.empresa.helpdesk.modules.catalog.entity.Sede;
import com.empresa.helpdesk.modules.inventario.enums.MovimientoTipo;
import com.empresa.helpdesk.modules.user.entity.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "inventario_movimientos")
public class Movimiento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "activo_id", nullable = false)
    private Activo activo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private MovimientoTipo tipo;

    // Origen
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entidad_origen_id")
    private Entidad entidadOrigen;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sede_origen_id")
    private Sede sedeOrigen;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "responsable_anterior_id")
    private User responsableAnterior;

    @Column(name = "ubicacion_origen", length = 200)
    private String ubicacionOrigen;

    // Destino
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entidad_destino_id")
    private Entidad entidadDestino;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sede_destino_id")
    private Sede sedeDestino;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "responsable_nuevo_id")
    private User responsableNuevo;

    @Column(name = "ubicacion_destino", length = 200)
    private String ubicacionDestino;

    @Column(nullable = false)
    private LocalDateTime fecha;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_operacion_id")
    private User usuarioOperacion;

    @Column(length = 255)
    private String motivo;

    @Column(columnDefinition = "TEXT")
    private String observaciones;

    @Column(length = 300)
    private String documentoUrl;

    @Builder.Default
    @Column(nullable = false)
    private boolean confirmado = false;

    @CreationTimestamp
    @Column(name = "fecha_creacion", updatable = false)
    private LocalDateTime fechaCreacion;
}
