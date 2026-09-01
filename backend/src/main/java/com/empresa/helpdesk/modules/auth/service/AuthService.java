package com.empresa.helpdesk.modules.auth.service;

import com.empresa.helpdesk.modules.auth.dto.AuthRequest;
import com.empresa.helpdesk.modules.auth.dto.AuthResponse;
import com.empresa.helpdesk.modules.auth.dto.ChangePasswordRequest;
import com.empresa.helpdesk.modules.auth.dto.ForgotPasswordRequest;
import com.empresa.helpdesk.modules.auth.dto.RefreshRequest;
import com.empresa.helpdesk.modules.auth.dto.RegisterRequest;
import com.empresa.helpdesk.modules.auth.dto.ResetPasswordRequest;
import com.empresa.helpdesk.modules.audit.service.AuditService;
import com.empresa.helpdesk.modules.user.entity.PasswordResetRequest;
import com.empresa.helpdesk.modules.user.entity.Role;
import com.empresa.helpdesk.modules.user.entity.User;
import com.empresa.helpdesk.modules.user.repository.PasswordResetRequestRepository;
import com.empresa.helpdesk.modules.user.repository.RoleRepository;
import com.empresa.helpdesk.modules.user.repository.UserRepository;
import com.empresa.helpdesk.modules.notification.service.EmailService;
import com.empresa.helpdesk.security.JwtService;
import com.empresa.helpdesk.security.RateLimiterService;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordResetRequestRepository passwordResetRequestRepository;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final RateLimiterService rateLimiter;
    private final AuditService auditService;

    public AuthResponse login(AuthRequest request) {
        // Rate limiting: máx. 5 intentos por minuto por usuario
        rateLimiter.verificar("login:" + request.getUsername().toLowerCase(), 5, 60);
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsername(),
                        request.getPassword()
                )
        );

        User user = userRepository.findByUsernameOrEmail(request.getUsername(), request.getUsername())
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado"));

        // Registrar presencia del usuario
        LocalDateTime now = LocalDateTime.now();
        user.setLastLogin(now);
        user.setLastActivity(now);
        user = userRepository.save(user);

        String jwtToken = jwtService.generateToken(new HashMap<>(), user);
        String refreshToken = jwtService.generateRefreshToken(user);

        rateLimiter.resetear("login:" + request.getUsername().toLowerCase());
        auditService.registrar("LOGIN", "USUARIO", user.getId(), user.getUsername() + " inició sesión");

        return buildAuthResponse(user, jwtToken, refreshToken);
    }

    /** Renueva el access token usando un refresh token válido. */
    public AuthResponse refresh(RefreshRequest request) {
        String username;
        try {
            username = jwtService.extractUsername(request.getRefreshToken());
            Claims claims = jwtService.extractClaim(request.getRefreshToken(), c -> c);
            if (!"refresh".equals(claims.get("tipo", String.class))) {
                throw new RuntimeException("Token inválido");
            }
        } catch (Exception e) {
            throw new RuntimeException("Sesión expirada. Inicia sesión nuevamente.");
        }

        User user = userRepository.findByUsernameOrEmail(username, username)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado"));
        if (!user.isActivo()) {
            throw new RuntimeException("Tu cuenta está desactivada.");
        }

        String newAccessToken = jwtService.generateToken(new HashMap<>(), user);
        return buildAuthResponse(user, newAccessToken, request.getRefreshToken());
    }

    /** Cambio de contraseña autenticado (el propio usuario). */
    @Transactional
    public void changePassword(ChangePasswordRequest request) {
        String principal = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication().getName();
        User user = userRepository.findByUsernameOrEmail(principal, principal)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado"));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new RuntimeException("La contraseña actual es incorrecta");
        }
        if (request.getCurrentPassword().equals(request.getNewPassword())) {
            throw new RuntimeException("La nueva contraseña debe ser diferente a la actual");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        auditService.registrar("CAMBIO_PASSWORD", "USUARIO", user.getId(), user.getUsername() + " cambió su contraseña");

        try {
            emailService.sendPasswordChangedConfirmation(user.getEmail(), user.getNombre());
        } catch (Exception e) {
            log.error("Error enviando confirmación de cambio de contraseña a {}: {}", user.getEmail(), e.getMessage());
        }
    }

    @Transactional
    public void heartbeat() {
        String principal = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication().getName();
        userRepository.findByUsernameOrEmail(principal, principal).ifPresent(user -> {
            user.setLastActivity(LocalDateTime.now());
            userRepository.save(user);
        });
    }

    /**
     * Devuelve los datos y permisos actuales del usuario autenticado.
     * Permite al frontend refrescar roles/permisos sin volver a iniciar sesión,
     * reflejando de inmediato los cambios hechos en "Roles y Permisos".
     */
    @Transactional(readOnly = true)
    public AuthResponse me() {
        String principal = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication().getName();
        User user = userRepository.findByUsernameOrEmail(principal, principal)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        return buildAuthResponse(user, null, null);
    }

    public AuthResponse register(RegisterRequest request) {
        // Rate limiting: máx. 3 registros por minuto por correo
        rateLimiter.verificar("register:" + request.getEmail().toLowerCase(), 3, 60);
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("El nombre de usuario ya está en uso");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("El correo electrónico ya está en uso");
        }

        Role defaultRole = roleRepository.findByName("CLIENTE")
                .or(() -> roleRepository.findByName("USUARIO"))
                .or(() -> roleRepository.findByName("USER"))
                .orElseThrow(() -> new RuntimeException("Rol por defecto no encontrado"));

        Set<Role> roles = new HashSet<>();
        roles.add(defaultRole);

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .nombre(request.getNombre())
                .apellidos(request.getApellidos())
                .telefono(request.getTelefono())
                .direccion(request.getDireccion())
                .activo(false)
                .roles(roles)
                .build();

        userRepository.save(user);

        // La cuenta queda inactiva: no se emite token hasta que un administrador la active.
        // El administrador verá la notificación "Registro pendiente de activación" en el panel.
        return buildAuthResponse(user, null, null);
    }

    public void forgotPassword(ForgotPasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("No se encontró una cuenta con ese correo electrónico."));

        boolean alreadyPending = passwordResetRequestRepository
                .existsByUsuarioIdAndStatus(user.getId(), PasswordResetRequest.ResetStatus.PENDIENTE);
        if (alreadyPending) {
            throw new RuntimeException("Ya existe una solicitud de cambio de contraseña pendiente para esta cuenta.");
        }

        String token = UUID.randomUUID().toString();

        PasswordResetRequest resetRequest = PasswordResetRequest.builder()
                .token(token)
                .email(request.getEmail())
                .usuario(user)
                .status(PasswordResetRequest.ResetStatus.PENDIENTE)
                .build();

        passwordResetRequestRepository.save(resetRequest);

        try {
            emailService.sendPasswordResetEmail(user.getEmail(), user.getNombre(), token);
        } catch (Exception e) {
            log.error("Error enviando correo de restablecimiento a {}: {}", user.getEmail(), e.getMessage());
            passwordResetRequestRepository.delete(resetRequest);
            throw new RuntimeException("No se pudo enviar el correo de restablecimiento. Verifica la configuración de correo del servidor.");
        }
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        PasswordResetRequest resetRequest = passwordResetRequestRepository
                .findByTokenAndStatus(request.getToken(), PasswordResetRequest.ResetStatus.PENDIENTE)
                .orElseThrow(() -> new RuntimeException("El enlace de restablecimiento no es válido o ya fue utilizado."));

        User user = resetRequest.getUsuario();
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        resetRequest.setStatus(PasswordResetRequest.ResetStatus.COMPLETADO);
        resetRequest.setFechaResolucion(LocalDateTime.now());
        passwordResetRequestRepository.save(resetRequest);

        try {
            emailService.sendPasswordChangedConfirmation(user.getEmail(), user.getNombre());
        } catch (Exception e) {
            log.error("Error enviando confirmación de cambio de contraseña a {}: {}", user.getEmail(), e.getMessage());
        }

        List<User> admins = userRepository.findByRoles_Name("ADMIN");
        for (User admin : admins) {
            try {
                emailService.sendPasswordChangedAdminNotification(
                        admin.getEmail(),
                        admin.getNombre(),
                        user.getNombre() + " " + user.getApellidos(),
                        user.getEmail()
                );
            } catch (Exception e) {
                log.error("Error enviando notificación de cambio de contraseña a admin {}: {}", admin.getEmail(), e.getMessage());
            }
        }
    }

    private AuthResponse buildAuthResponse(User user, String token, String refreshToken) {
        List<String> roleNames = user.getRoles().stream()
                .map(Role::getName)
                .collect(Collectors.toList());

        List<String> permissionNames = user.getRoles().stream()
                .flatMap(role -> role.getPermissions().stream())
                .map(p -> p.getName())
                .distinct()
                .collect(Collectors.toList());

        return AuthResponse.builder()
                .accessToken(token)
                .refreshToken(refreshToken)
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .nombre(user.getNombre())
                .apellidos(user.getApellidos())
                .roles(roleNames)
                .permissions(permissionNames)
                .build();
    }
}
