package com.empresa.helpdesk.modules.inventario.entity;

import com.empresa.helpdesk.modules.catalog.entity.Entidad;
import com.empresa.helpdesk.modules.catalog.entity.Sede;
import com.empresa.helpdesk.modules.inventario.enums.TransferenciaEstado;
import com.empresa.helpdesk.modules.user.entity.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "inventario_transferencias")
public class Transferencia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "numero_documento", unique = true, nullable = false, length = 40)
    private String numeroDocumento;

    @Column(nullable = false)
    private LocalDateTime fecha;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entidad_origen_id")
    private Entidad entidadOrigen;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sede_origen_id")
    private Sede sedeOrigen;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entidad_destino_id")
    private Entidad entidadDestino;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sede_destino_id")
    private Sede sedeDestino;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "responsable_entrega_id")
    private User responsableEntrega;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "responsable_recibe_id")
    private User responsableRecibe;

    @Column(length = 255)
    private String motivo;

    @Column(columnDefinition = "TEXT")
    private String observaciones;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TransferenciaEstado estado;

    @Column(name = "fecha_recepcion")
    private LocalDateTime fechaRecepcion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "creado_por_id")
    private User creadoPor;

    @ManyToMany
    @JoinTable(
            name = "inventario_transferencia_activos",
            joinColumns = @JoinColumn(name = "transferencia_id"),
            inverseJoinColumns = @JoinColumn(name = "activo_id")
    )
    @Builder.Default
    private Set<Activo> activos = new HashSet<>();

    @CreationTimestamp
    @Column(name = "fecha_creacion", updatable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "pdf_url", length = 300)
    private String pdfUrl;
}
