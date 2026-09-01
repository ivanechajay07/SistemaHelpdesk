package com.empresa.helpdesk.modules.ticket.dto;

import com.empresa.helpdesk.modules.ticket.enums.Priority;
import com.empresa.helpdesk.modules.ticket.enums.TicketStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class TicketResponse {
    private Long id;
    private String codigo;
    private String titulo;
    private String descripcion;
    private TicketStatus estado;
    private Priority prioridad;
    private String entidad;
    private String sede;
    private boolean reactivado;
    private String categoriaNombre;
    private String subcategoriaNombre;
    private Long subcategoriaId;
    private Long usuarioId;
    private String solicitanteNombre;
    private Long tecnicoId;
    private String tecnicoNombre;
    private LocalDateTime fechaCreacion;
    private LocalDateTime fechaActualizacion;
    private LocalDateTime fechaResolucion;
    private LocalDateTime fechaCierre;
    private String informeResolucion;

    // ===== SLA =====
    /** Horas máximas de resolución según la prioridad. */
    private Integer slaLimiteHoras;
    /** Horas restantes para vencer el SLA (null si ya finalizó). */
    private Double slaHorasRestantes;
    /** EN_TIEMPO | POR_VENCER | VENCIDO | CUMPLIDO */
    private String slaEstado;

    // ===== CSAT (encuesta de satisfacción) =====
    private Integer calificacion;
    private String comentarioCliente;
}
