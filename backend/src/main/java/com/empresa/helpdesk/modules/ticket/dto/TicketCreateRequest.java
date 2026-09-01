package com.empresa.helpdesk.modules.ticket.dto;

import com.empresa.helpdesk.modules.ticket.enums.Priority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class TicketCreateRequest {
    
    @NotBlank(message = "El título es obligatorio")
    @Size(min = 3, max = 200, message = "El título debe tener entre 3 y 200 caracteres")
    private String titulo;
    
    @NotBlank(message = "La descripción es obligatoria")
    @Size(min = 10, max = 2000, message = "La descripción debe tener entre 10 y 2000 caracteres")
    private String descripcion;
    
    @NotNull(message = "La prioridad es obligatoria")
    private Priority prioridad;
    
    @NotNull(message = "La subcategoría es obligatoria")
    private Long subcategoriaId;

    @Size(max = 150, message = "La entidad no puede exceder 150 caracteres")
    private String entidad;

    @Size(max = 150, message = "La sede no puede exceder 150 caracteres")
    private String sede;
}
