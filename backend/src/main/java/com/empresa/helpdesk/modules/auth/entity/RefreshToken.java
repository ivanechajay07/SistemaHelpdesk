package com.empresa.helpdesk.modules.auth.entity;

import com.empresa.helpdesk.modules.user.entity.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.time.LocalDateTime;

/**
 * Refresh token opaco almacenado como hash SHA-256.
 *
 * <p>Se guarda la familia para detectar reutilización de tokens: si un token
 * ya rotado vuelve a presentarse, se revoca toda la familia y se invalidan las
 * sesiones del usuario. Nunca se almacena el token en claro.</p>
 */
@Entity
@Table(name = "refresh_tokens")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    @ToString.Exclude
    private User usuario;

    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    @Column(nullable = false, length = 36)
    private String familia;

    @Column(nullable = false)
    private LocalDateTime expira;

    @Builder.Default
    @Column(nullable = false)
    private boolean revocado = false;

    @Column(nullable = false)
    private LocalDateTime creado;
}
