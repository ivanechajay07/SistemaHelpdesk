package com.empresa.helpdesk.modules.ticket.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Solicitud para resolver/cerrar un ticket")
public class TicketResolveRequest {

    @NotBlank(message = "El mensaje de resolución es obligatorio")
    @Size(min = 10, max = 2000, message = "La resolución debe tener entre 10 y 2000 caracteres")
    private String resolucion;
}
