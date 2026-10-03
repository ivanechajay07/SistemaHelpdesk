package com.empresa.helpdesk.modules.monitoring.entity;

import com.empresa.helpdesk.modules.monitoring.enums.IncidentEstado;
import com.empresa.helpdesk.modules.monitoring.enums.TargetType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Incidencia de monitoreo: representa una caída detectada sobre un objetivo.
 * Se abre cuando el objetivo pasa a DOWN y se cierra al recuperarse, guardando
 * la duración. Permite construir el dashboard de incidencias por día/mes/año.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "monitoring_incidents")
public class MonitoringIncident {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Se guarda como columna simple para no romper la FK al eliminar el objetivo. */
    @Column(name = "target_id")
    private Long targetId;

    @Column(name = "target_nombre", nullable = false, length = 120)
    private String targetNombre;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private TargetType tipo;

    @Column(length = 500)
    private String host;

    @Column(nullable = false)
    private LocalDateTime inicio;

    private LocalDateTime fin;

    @Column(name = "duracion_segundos")
    private Long duracionSegundos;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private IncidentEstado estado;

    @Column(name = "ticket_id")
    private Long ticketId;

    @CreationTimestamp
    @Column(name = "fecha_creacion", updatable = false)
    private LocalDateTime fechaCreacion;
}
