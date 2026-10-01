package com.empresa.helpdesk.modules.audit.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLogResponse {
    private Long id;
    private String usuario;
    private String accion;
    private String entidad;
    private Long entidadId;
    private String detalle;
    private String dispositivoTipo;
    private String dispositivoModelo;
    private String navegador;
    private String ip;
    private LocalDateTime fecha;
}
