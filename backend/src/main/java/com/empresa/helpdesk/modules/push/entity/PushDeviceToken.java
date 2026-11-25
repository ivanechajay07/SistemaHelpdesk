package com.empresa.helpdesk.modules.push.entity;

import com.empresa.helpdesk.modules.user.entity.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Token de Firebase Cloud Messaging asociado a un usuario y dispositivo.
 * Un usuario puede tener varios (celular, tablet, etc.).
 */
@Entity
@Table(
        name = "push_device_tokens",
        indexes = @Index(name = "idx_push_tokens_usuario", columnList = "usuario_id"),
        uniqueConstraints = @UniqueConstraint(name = "uk_push_tokens_token", columnNames = "token")
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PushDeviceToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private User usuario;

    @Column(nullable = false, length = 512)
    private String token;

    @Column(nullable = false, length = 20)
    private String plataforma;

    @Column(name = "actualizado_en", nullable = false)
    private LocalDateTime actualizadoEn;
}
