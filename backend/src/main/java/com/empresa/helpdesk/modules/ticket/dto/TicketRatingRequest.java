package com.empresa.helpdesk.modules.ticket.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class TicketRatingRequest {

    @NotNull(message = "El puntaje es obligatorio")
    @Min(value = 1, message = "La calificación mínima es 1 estrella")
    @Max(value = 5, message = "La calificación máxima es 5 estrellas")
    private Integer puntaje;

    @Size(max = 500, message = "El comentario no puede superar los 500 caracteres")
    private String comentario;
}
