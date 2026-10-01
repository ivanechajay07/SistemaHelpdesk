package com.empresa.helpdesk.modules.audit.entity;

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
@Table(name = "audit_logs")
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String usuario;

    /** Acción realizada: LOGIN, CREAR_USUARIO, ACTIVAR_USUARIO, ASIGNAR_TICKET, etc. */
    @Column(nullable = false, length = 60)
    private String accion;

    /** Entidad afectada: USUARIO, TICKET, ROL, TAREA... */
    @Column(nullable = false, length = 40)
    private String entidad;

    private Long entidadId;

    @Column(length = 400)
    private String detalle;

    // ===== Dispositivo y red desde donde se realizó la acción =====
    @Column(name = "dispositivo_tipo", length = 20)
    private String dispositivoTipo; // PC | MOVIL | TABLET

    @Column(name = "dispositivo_modelo", length = 120)
    private String dispositivoModelo;

    @Column(length = 60)
    private String navegador;

    @Column(length = 60)
    private String ip;

    @CreationTimestamp
    @Column(name = "fecha", updatable = false)
    private LocalDateTime fecha;
}
