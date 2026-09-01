package com.empresa.helpdesk.modules.knowledge.repository;

import com.empresa.helpdesk.modules.knowledge.entity.KnowledgeArticle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface KnowledgeArticleRepository extends JpaRepository<KnowledgeArticle, Long> {

    List<KnowledgeArticle> findByPublicadoTrueOrderByFechaCreacionDesc();

    List<KnowledgeArticle> findAllByOrderByFechaCreacionDesc();

    List<KnowledgeArticle> findByPublicadoTrueAndCategoriaIgnoreCaseOrderByFechaCreacionDesc(String categoria);

    @Query("SELECT a FROM KnowledgeArticle a WHERE a.publicado = true AND " +
           "(LOWER(a.titulo) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(a.contenido) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(a.categoria) LIKE LOWER(CONCAT('%', :search, '%')))")
    List<KnowledgeArticle> searchPublicados(@Param("search") String search);
}
