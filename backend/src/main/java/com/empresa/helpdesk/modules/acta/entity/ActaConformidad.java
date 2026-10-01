package com.empresa.helpdesk.modules.acta.entity;

import com.empresa.helpdesk.modules.ticket.entity.Ticket;
import com.empresa.helpdesk.modules.user.entity.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "actas_conformidad")
public class ActaConformidad {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ticket_id", nullable = false)
    private Ticket ticket;

    @Column(nullable = false)
    private LocalDate fecha;

    @Column(name = "trabajos_realizados", columnDefinition = "TEXT", nullable = false)
    private String trabajosRealizados;

    @Column(columnDefinition = "TEXT")
    private String observaciones;

    @Column(name = "foto_data", columnDefinition = "LONGTEXT")
    private String fotoData;

    @Column(name = "firma_solicitante", columnDefinition = "LONGTEXT", nullable = false)
    private String firmaSolicitante;

    @Column(name = "firma_tecnico", columnDefinition = "LONGTEXT", nullable = false)
    private String firmaTecnico;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "creado_por_id", nullable = false)
    private User creadoPor;

    @CreationTimestamp
    @Column(name = "fecha_creacion", updatable = false)
    private LocalDateTime fechaCreacion;
}