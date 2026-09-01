package com.empresa.helpdesk.modules.monitoring.dto;

import com.empresa.helpdesk.modules.monitoring.enums.TargetStatus;
import com.empresa.helpdesk.modules.monitoring.enums.TargetType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class MonitoredTargetResponse {

    private Long id;
    private String nombre;
    private TargetType tipo;
    private String host;
    private Integer puerto;
    private Integer intervaloSegundos;
    private Integer umbralFallos;
    private Boolean activo;
    private TargetStatus ultimoEstado;
    private Long ultimaLatenciaMs;
    private LocalDateTime ultimoChequeo;
    private Integer fallosConsecutivos;
    private Long ticketAbiertoId;
}
