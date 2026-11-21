package com.empresa.helpdesk.modules.auth.service;

import com.empresa.helpdesk.modules.auth.entity.RefreshToken;
import com.empresa.helpdesk.modules.auth.repository.RefreshTokenRepository;
import com.empresa.helpdesk.modules.user.entity.User;
import com.empresa.helpdesk.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;

/**
 * Gestión de refresh tokens opacos con estado en servidor.
 *
 * <p>A diferencia de un JWT de refresco, estos tokens se pueden revocar de
 * inmediato (logout, cambio de contraseña, bloqueo de cuenta) y permiten
 * detectar reutilización: cada token se usa una sola vez y se sustituye por
 * otro dentro de la misma familia.</p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RefreshTokenService {

    private static final int TOKEN_BYTES = 32; // 256 bits de entropía
    private static final SecureRandom RANDOM = new SecureRandom();

    public record Rotacion(User usuario, String token) {
    }

    /** Reutilización de un token ya rotado: la revocación debe persistirse. */
    public static class ReuseDetectedException extends RuntimeException {
        public ReuseDetectedException(String message) {
            super(message);
        }
    }

    private final RefreshTokenRepository refreshTokenRepository;
    private final UserRepository userRepository;

    @Value("${app.jwt.refresh-expiration:604800000}")
    private long refreshExpirationMs;

    /** Emite un refresh token nuevo dentro de una familia (nueva si no se indica). */
    @Transactional
    public String emitir(User usuario, String familia) {
        byte[] raw = new byte[TOKEN_BYTES];
        RANDOM.nextBytes(raw);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(raw);

        RefreshToken entity = RefreshToken.builder()
                .usuario(usuario)
                .tokenHash(hash(token))
                .familia(familia != null && !familia.isBlank() ? familia : UUID.randomUUID().toString())
                .expira(LocalDateTime.now().plus(Duration.ofMillis(refreshExpirationMs)))
                .revocado(false)
                .creado(LocalDateTime.now())
                .build();
        refreshTokenRepository.save(entity);
        return token;
    }

    @Transactional
    public String emitir(User usuario) {
        return emitir(usuario, UUID.randomUUID().toString());
    }

    /**
     * Valida un refresh token y lo rota. Si detecta reutilización de un token ya
     * rotado, revoca toda la familia, invalida los access tokens (tokenVersion)
     * y rechaza la operación.
     */
    // En caso de reutilización se lanza una excepción, pero las revocaciones
    // deben confirmarse: por eso no se hace rollback de este tipo.
    @Transactional(noRollbackFor = ReuseDetectedException.class)
    public Rotacion rotar(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new RuntimeException("Sesión expirada. Inicia sesión nuevamente.");
        }

        RefreshToken actual = refreshTokenRepository.findByTokenHash(hash(rawToken))
                .orElseThrow(() -> new RuntimeException("Sesión expirada. Inicia sesión nuevamente."));

        if (actual.isRevocado()) {
            // Reutilización de un token ya rotado: compromiso probable.
            // Se capturan los datos antes del UPDATE (clearAutomatically desasocia
            // la entidad y la relación lazy dejaría de estar disponible).
            Long usuarioId = actual.getUsuario().getId();
            String familia = actual.getFamilia();
            log.warn("Reutilización de refresh token detectada para el usuario {} (familia {}). "
                    + "Se revocan todas las sesiones.", usuarioId, familia);
            refreshTokenRepository.revocarFamilia(familia);
            userRepository.findById(usuarioId).ifPresent(this::invalidarSesiones);
            throw new ReuseDetectedException("Sesión inválida. Inicia sesión nuevamente.");
        }

        if (actual.getExpira().isBefore(LocalDateTime.now())) {
            actual.setRevocado(true);
            refreshTokenRepository.save(actual);
            throw new RuntimeException("Sesión expirada. Inicia sesión nuevamente.");
        }

        User usuario = actual.getUsuario();
        if (!usuario.isActivo()) {
            throw new RuntimeException("Tu cuenta está desactivada.");
        }
        if (!usuario.isAccountNonLocked()) {
            throw new RuntimeException("Tu cuenta está bloqueada temporalmente. Intenta más tarde.");
        }

        actual.setRevocado(true);
        refreshTokenRepository.save(actual);

        String nuevo = emitir(usuario, actual.getFamilia());
        return new Rotacion(usuario, nuevo);
    }

    /** Revoca un refresh token concreto (logout del dispositivo actual). */
    @Transactional
    public void revocar(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return;
        }
        refreshTokenRepository.findByTokenHash(hash(rawToken)).ifPresent(token -> {
            if (!token.isRevocado()) {
                token.setRevocado(true);
                refreshTokenRepository.save(token);
            }
        });
    }

    /** Revoca todas las sesiones renovables de un usuario. */
    @Transactional
    public void revocarTodos(Long usuarioId) {
        if (usuarioId != null) {
            refreshTokenRepository.revocarTodos(usuarioId);
        }
    }

    /** Invalida access tokens y refresh tokens de un usuario. */
    @Transactional
    public void invalidarSesiones(User usuario) {
        if (usuario == null) {
            return;
        }
        usuario.setTokenVersion((usuario.getTokenVersion() != null ? usuario.getTokenVersion() : 0) + 1);
        userRepository.save(usuario);
        refreshTokenRepository.revocarTodos(usuario.getId());
    }

    /** Purga periódica de tokens expirados para evitar crecimiento indefinido. */
    @Scheduled(fixedDelayString = "${app.jwt.refresh-cleanup-ms:3600000}", initialDelay = 600000)
    @Transactional
    public void purgarExpirados() {
        int eliminados = refreshTokenRepository.purgarExpirados(LocalDateTime.now());
        if (eliminados > 0) {
            log.debug("Refresh tokens expirados eliminados: {}", eliminados);
        }
    }

    private String hash(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            throw new IllegalStateException("No se pudo procesar el refresh token", e);
        }
    }
}
