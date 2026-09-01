package com.empresa.helpdesk.modules.knowledge.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class KnowledgeArticleRequest {

    @NotBlank(message = "El título es requerido")
    @Size(max = 200, message = "El título no puede exceder 200 caracteres")
    private String titulo;

    @NotBlank(message = "El contenido es requerido")
    private String contenido;

    @Size(max = 100, message = "La categoría no puede exceder 100 caracteres")
    private String categoria;

    private Boolean publicado;
}
