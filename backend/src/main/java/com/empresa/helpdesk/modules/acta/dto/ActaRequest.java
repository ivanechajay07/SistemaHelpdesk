package com.empresa.helpdesk.modules.acta.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

@Data
public class ActaRequest {

    private LocalDate fecha;

    @NotBlank(message = "Los trabajos realizados son obligatorios")
    @Size(max = 2000, message = "Los trabajos realizados no pueden exceder 2000 caracteres")
    private String trabajosRealizados;

    @Size(max = 1000, message = "Las observaciones no pueden exceder 1000 caracteres")
    private String observaciones;

    private String fotoData;

    @NotBlank(message = "La firma del solicitante es obligatoria")
    private String firmaSolicitante;

    @NotBlank(message = "La firma del técnico es obligatoria")
    private String firmaTecnico;
}