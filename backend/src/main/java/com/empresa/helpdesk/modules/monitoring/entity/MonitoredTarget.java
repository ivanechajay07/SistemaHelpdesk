package com.empresa.helpdesk.modules.monitoring.entity;

import com.empresa.helpdesk.modules.monitoring.enums.TargetStatus;
import com.empresa.helpdesk.modules.monitoring.enums.TargetType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "monitored_targets")
public class MonitoredTarget {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String nombre;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private TargetType tipo;

    /**
     * Para HTTP: URL completa (ej. http://192.168.1.10:8080/health).
     * Para TCP: hostname o IP (usa el campo puerto).
     */
    @Column(nullable = false, length = 500)
    private String host;

    @Column
    private Integer puerto;

    @Builder.Default
    @Column(nullable = false)
    private Integer intervaloSegundos = 60;

    @Builder.Default
    @Column(name = "umbral_fallos", nullable = false)
    private Integer umbralFallos = 3;

    @Builder.Default
    @Column(nullable = false)
    private Boolean activo = true;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false, length = 10)
    private TargetStatus ultimoEstado = TargetStatus.PENDING;

    @Column(name = "ultima_latencia_ms")
    private Long ultimaLatenciaMs;

    @Column(name = "ultimo_chequeo")
    private LocalDateTime ultimoChequeo;

    @Builder.Default
    @Column(name = "fallos_consecutivos", nullable = false)
    private Integer fallosConsecutivos = 0;

    /** Ticket abierto generado por una caída de este objetivo (evita duplicados) */
    @Column(name = "ticket_abierto_id")
    private Long ticketAbiertoId;

    @CreationTimestamp
    @Column(name = "fecha_creacion", updatable = false)
    private LocalDateTime fechaCreacion;

    @UpdateTimestamp
    @Column(name = "fecha_actualizacion")
    private LocalDateTime fechaActualizacion;
}
