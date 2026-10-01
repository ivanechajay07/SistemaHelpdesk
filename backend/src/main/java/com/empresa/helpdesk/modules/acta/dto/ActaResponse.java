package com.empresa.helpdesk.modules.acta.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class ActaResponse {
    private Long id;
    private Long ticketId;
    private String codigo;
    private String titulo;
    private String estado;
    private String prioridad;
    private LocalDate fecha;
    private String trabajosRealizados;
    private String observaciones;
    private String fotoData;
    private String firmaSolicitante;
    private String firmaTecnico;
    private String solicitanteNombre;
    private String tecnicoNombre;
    private String creadoPorNombre;
    private LocalDateTime fechaCreacion;
}