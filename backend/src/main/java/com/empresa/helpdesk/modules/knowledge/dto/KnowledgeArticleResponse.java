package com.empresa.helpdesk.modules.knowledge.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class KnowledgeArticleResponse {

    private Long id;
    private String titulo;
    private String contenido;
    private String categoria;
    private String autorNombre;
    private Integer vistas;
    private Boolean publicado;
    private LocalDateTime fechaCreacion;
    private LocalDateTime fechaActualizacion;
}
