package com.empresa.helpdesk.modules.knowledge.service;

import com.empresa.helpdesk.modules.knowledge.dto.KnowledgeArticleRequest;
import com.empresa.helpdesk.modules.knowledge.dto.KnowledgeArticleResponse;
import com.empresa.helpdesk.modules.knowledge.entity.KnowledgeArticle;
import com.empresa.helpdesk.modules.knowledge.repository.KnowledgeArticleRepository;
import com.empresa.helpdesk.modules.user.entity.User;
import com.empresa.helpdesk.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class KnowledgeArticleService {

    private final KnowledgeArticleRepository knowledgeArticleRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<KnowledgeArticleResponse> getArticles(String search, boolean includeDrafts) {
        List<KnowledgeArticle> articles;
        if (search != null && !search.isBlank()) {
            // La búsqueda debe respetar includeDrafts (antes se ignoraba y
            // siempre devolvía solo publicados).
            String term = search.trim().toLowerCase();
            List<KnowledgeArticle> base = includeDrafts
                    ? knowledgeArticleRepository.findTop300ByOrderByFechaCreacionDesc()
                    : knowledgeArticleRepository.findTop300ByPublicadoTrueOrderByFechaCreacionDesc();
            articles = base.stream()
                    .filter(a -> coincide(a, term))
                    .toList();
        } else if (includeDrafts) {
            articles = knowledgeArticleRepository.findTop300ByOrderByFechaCreacionDesc();
        } else {
            articles = knowledgeArticleRepository.findTop300ByPublicadoTrueOrderByFechaCreacionDesc();
        }
        return articles.stream().map(this::mapToResponse).toList();
    }

    @Transactional
    public KnowledgeArticleResponse getArticle(Long id) {
        if (knowledgeArticleRepository.incrementarVistas(id) == 0) {
            throw new RuntimeException("Artículo no encontrado");
        }
        KnowledgeArticle article = knowledgeArticleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Artículo no encontrado"));
        return mapToResponse(article);
    }

    @Transactional
    public KnowledgeArticleResponse createArticle(KnowledgeArticleRequest request) {
        User autor = getCurrentUser();
        KnowledgeArticle article = KnowledgeArticle.builder()
                .titulo(request.getTitulo().trim())
                .contenido(request.getContenido())
                .categoria(request.getCategoria() != null ? request.getCategoria().trim() : null)
                .publicado(request.getPublicado() != null ? request.getPublicado() : true)
                .autor(autor)
                .build();
        return mapToResponse(knowledgeArticleRepository.save(article));
    }

    @Transactional
    public KnowledgeArticleResponse updateArticle(Long id, KnowledgeArticleRequest request) {
        KnowledgeArticle article = knowledgeArticleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Artículo no encontrado"));
        article.setTitulo(request.getTitulo().trim());
        article.setContenido(request.getContenido());
        article.setCategoria(request.getCategoria() != null ? request.getCategoria().trim() : null);
        if (request.getPublicado() != null) {
            article.setPublicado(request.getPublicado());
        }
        return mapToResponse(knowledgeArticleRepository.save(article));
    }

    @Transactional
    public void deleteArticle(Long id) {
        if (!knowledgeArticleRepository.existsById(id)) {
            throw new RuntimeException("Artículo no encontrado");
        }
        knowledgeArticleRepository.deleteById(id);
    }

    private KnowledgeArticleResponse mapToResponse(KnowledgeArticle article) {
        User autor = article.getAutor();
        String autorNombre = autor != null
                ? autor.getNombre() + " " + autor.getApellidos()
                : "Sistema";
        return KnowledgeArticleResponse.builder()
                .id(article.getId())
                .titulo(article.getTitulo())
                .contenido(article.getContenido())
                .categoria(article.getCategoria())
                .autorNombre(autorNombre.trim())
                .vistas(article.getVistas())
                .publicado(article.getPublicado())
                .fechaCreacion(article.getFechaCreacion())
                .fechaActualizacion(article.getFechaActualizacion())
                .build();
    }

    private boolean coincide(KnowledgeArticle a, String term) {
        return contiene(a.getTitulo(), term)
                || contiene(a.getContenido(), term)
                || contiene(a.getCategoria(), term);
    }

    private boolean contiene(String valor, String term) {
        return valor != null && valor.toLowerCase().contains(term);
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsernameOrEmail(username, username)
                .orElseThrow(() -> new RuntimeException("Usuario autenticado no encontrado"));
    }
}
