package com.empresa.helpdesk.modules.inventario.entity;

import com.empresa.helpdesk.modules.inventario.enums.MantenimientoEstado;
import com.empresa.helpdesk.modules.inventario.enums.MantenimientoTipo;
import com.empresa.helpdesk.modules.ticket.entity.Ticket;
import com.empresa.helpdesk.modules.user.entity.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "inventario_mantenimientos")
public class Mantenimiento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "activo_id", nullable = false)
    private Activo activo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MantenimientoTipo tipo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MantenimientoEstado estado;

    @Column(nullable = false)
    private LocalDate fecha;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tecnico_id")
    private User tecnico;

    @Column(length = 150)
    private String proveedor;

    @Column(columnDefinition = "TEXT")
    private String descripcion;

    @Column(name = "problema_encontrado", columnDefinition = "TEXT")
    private String problemaEncontrado;

    @Column(name = "trabajo_realizado", columnDefinition = "TEXT")
    private String trabajoRealizado;

    @Column(columnDefinition = "TEXT")
    private String repuestos;

    @Column(precision = 12, scale = 2)
    private BigDecimal costo;

    @Column(name = "proxima_revision")
    private LocalDate proximaRevision;

    @Column(columnDefinition = "TEXT")
    private String observaciones;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticket_id")
    private Ticket ticket;

    @Column(name = "documento_url", length = 300)
    private String documentoUrl;

    @CreationTimestamp
    @Column(name = "fecha_creacion", updatable = false)
    private LocalDateTime fechaCreacion;
}
