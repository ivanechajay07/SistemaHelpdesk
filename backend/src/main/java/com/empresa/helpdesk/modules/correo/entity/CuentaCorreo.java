package com.empresa.helpdesk.modules.correo.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "correo_corporativo_id", nullable = false)
    private CorreoCorporativo correoCorporativo;

    @Column(nullable = false, length = 200)
    private String email;

    /** Contraseña cifrada (AES-GCM). Nunca se expone a usuarios sin permiso. */
    @Column(name = "password_encrypted", columnDefinition = "TEXT", nullable = false)
    private String passwordEncrypted;
}