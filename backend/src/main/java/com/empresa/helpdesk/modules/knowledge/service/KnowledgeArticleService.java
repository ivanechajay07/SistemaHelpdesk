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
            articles = knowledgeArticleRepository.searchPublicados(search.trim());
        } else if (includeDrafts) {
            articles = knowledgeArticleRepository.findAllByOrderByFechaCreacionDesc();
        } else {
            articles = knowledgeArticleRepository.findByPublicadoTrueOrderByFechaCreacionDesc();
        }
        return articles.stream().map(this::mapToResponse).toList();
    }

    @Transactional
    public KnowledgeArticleResponse getArticle(Long id) {
        KnowledgeArticle article = knowledgeArticleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Artículo no encontrado"));
        article.setVistas(article.getVistas() + 1);
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

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsernameOrEmail(username, username)
                .orElseThrow(() -> new RuntimeException("Usuario autenticado no encontrado"));
    }
}
