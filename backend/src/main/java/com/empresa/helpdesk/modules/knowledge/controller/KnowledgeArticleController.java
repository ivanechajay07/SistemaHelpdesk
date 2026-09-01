package com.empresa.helpdesk.modules.knowledge.controller;

import com.empresa.helpdesk.modules.knowledge.dto.KnowledgeArticleRequest;
import com.empresa.helpdesk.modules.knowledge.dto.KnowledgeArticleResponse;
import com.empresa.helpdesk.modules.knowledge.service.KnowledgeArticleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/knowledge")
@RequiredArgsConstructor
@Tag(name = "Base de Conocimiento", description = "Artículos de ayuda y solución de problemas")
public class KnowledgeArticleController {

    private final KnowledgeArticleService knowledgeArticleService;

    @GetMapping
    @Operation(summary = "Listar artículos publicados (o todos para staff con ?all=true). Búsqueda opcional ?search=")
    public ResponseEntity<List<KnowledgeArticleResponse>> getArticles(
            @RequestParam(required = false) String search,
            @RequestParam(required = false, defaultValue = "false") boolean all) {
        return ResponseEntity.ok(knowledgeArticleService.getArticles(search, all));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtener un artículo por ID (incrementa el contador de vistas)")
    public ResponseEntity<KnowledgeArticleResponse> getArticle(@PathVariable Long id) {
        return ResponseEntity.ok(knowledgeArticleService.getArticle(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERVISOR', 'TECNICO')")
    @Operation(summary = "Crear un artículo (solo personal de soporte)")
    public ResponseEntity<KnowledgeArticleResponse> createArticle(@Valid @RequestBody KnowledgeArticleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(knowledgeArticleService.createArticle(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERVISOR', 'TECNICO')")
    @Operation(summary = "Actualizar un artículo (solo personal de soporte)")
    public ResponseEntity<KnowledgeArticleResponse> updateArticle(
            @PathVariable Long id,
            @Valid @RequestBody KnowledgeArticleRequest request) {
        return ResponseEntity.ok(knowledgeArticleService.updateArticle(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Eliminar un artículo (solo admin)")
    public ResponseEntity<Void> deleteArticle(@PathVariable Long id) {
        knowledgeArticleService.deleteArticle(id);
        return ResponseEntity.noContent().build();
    }
}
