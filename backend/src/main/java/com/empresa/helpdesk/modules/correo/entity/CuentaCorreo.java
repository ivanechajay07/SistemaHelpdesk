package com.empresa.helpdesk.modules.correo.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "correos_corporativos_cuentas")
public class CuentaCorreo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "correo_corporativo_id", nullable = false)
    private CorreoCorporativo correoCorporativo;

    @Column(nullable = false, length = 200)
    private String email;

    /** Contraseña cifrada (AES-GCM). Nunca se expone a usuarios sin permiso. */
    @ToString.Exclude
    @Column(name = "password_encrypted", columnDefinition = "TEXT", nullable = false)
    private String passwordEncrypted;
}