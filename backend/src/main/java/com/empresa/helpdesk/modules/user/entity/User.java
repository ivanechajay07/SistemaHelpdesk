package com.empresa.helpdesk.modules.user.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "usuarios")
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(unique = true, nullable = false)
    private String username;

    @ToString.Exclude
    @Column(nullable = false)
    private String password;

    private String nombre;
    private String apellidos;
    private String telefono;
    private String direccion;

    @Builder.Default
    private boolean activo = true;

    // Versión de token JWT: se incrementa al cambiar/restablecer la contraseña
    // para revocar todos los tokens emitidos previamente.
    @Builder.Default
    @Column(name = "token_version")
    private Integer tokenVersion = 0;

    // Bloqueo temporal por intentos fallidos de inicio de sesión
    @Builder.Default
    @Column(name = "failed_login_attempts")
    private Integer failedLoginAttempts = 0;

    @Column(name = "locked_until")
    private java.time.LocalDateTime lockedUntil;

    // Doble factor (TOTP). El secreto se almacena cifrado (AES-GCM).
    @Builder.Default
    @Column(name = "two_factor_enabled", nullable = false)
    private boolean twoFactorEnabled = false;

    @ToString.Exclude
    @Column(name = "two_factor_secret", columnDefinition = "TEXT")
    private String twoFactorSecret;

    // Preferencias de notificación del usuario (JSON serializado)
    @Column(name = "notification_prefs", length = 500)
    private String notificationPrefs;

    @Column(name = "last_login")
    private java.time.LocalDateTime lastLogin;

    @Column(name = "last_activity")
    private java.time.LocalDateTime lastActivity;

    // ===== Dispositivo desde el que se conecta =====
    @Column(name = "dispositivo_tipo", length = 20)
    private String dispositivoTipo; // PC | MOVIL | TABLET

    @Column(name = "dispositivo_modelo", length = 120)
    private String dispositivoModelo;

    @Column(name = "dispositivo_so", length = 60)
    private String dispositivoSo;

    @Column(length = 60)
    private String navegador;

    @Column(name = "ip_ultima", length = 60)
    private String ipUltima;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "usuario_roles",
            joinColumns = @JoinColumn(name = "usuario_id"),
            inverseJoinColumns = @JoinColumn(name = "rol_id")
    )
    @Builder.Default
    private Set<Role> roles = new HashSet<>();

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        Set<GrantedAuthority> authorities = new HashSet<>();
        
        // Add roles
        roles.forEach(role -> {
            authorities.add(new SimpleGrantedAuthority("ROLE_" + role.getName().toUpperCase()));
            // Add permissions
            role.getPermissions().forEach(permission -> {
                authorities.add(new SimpleGrantedAuthority(permission.getName().toUpperCase()));
            });
        });
        
        return authorities;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return lockedUntil == null || lockedUntil.isBefore(java.time.LocalDateTime.now());
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return this.activo;
    }
}
