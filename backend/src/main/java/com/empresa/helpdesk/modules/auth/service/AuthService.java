package com.empresa.helpdesk.modules.auth.service;

import com.empresa.helpdesk.modules.auth.dto.AuthRequest;
import com.empresa.helpdesk.modules.auth.dto.AuthResponse;
import com.empresa.helpdesk.modules.auth.dto.ChangePasswordRequest;
import com.empresa.helpdesk.modules.auth.dto.ForgotPasswordRequest;
import com.empresa.helpdesk.modules.auth.dto.MfaCodeRequest;
import com.empresa.helpdesk.modules.auth.dto.MfaDisableRequest;
import com.empresa.helpdesk.modules.auth.dto.MfaSetupResponse;
import com.empresa.helpdesk.modules.auth.dto.MfaVerifyRequest;
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
import com.empresa.helpdesk.security.CryptoService;
import com.empresa.helpdesk.security.JwtService;
import com.empresa.helpdesk.security.RateLimiterService;
import com.empresa.helpdesk.security.TotpService;
import com.empresa.helpdesk.security.DeviceInfoResolver;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.HexFormat;
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
    private final TotpService totpService;
    private final CryptoService cryptoService;

    private static final int MAX_LOGIN_ATTEMPTS = 5;
    private static final int LOCK_MINUTES = 15;

    public AuthResponse login(AuthRequest request) {
        // Rate limiting: máx. 5 intentos por minuto por usuario
        rateLimiter.verificar("login:" + request.getUsername().toLowerCase(), 5, 60);
        // Límite adicional por IP (defensa contra fuerza bruta distribuida)
        rateLimiter.verificar("login-ip:" + currentIp(), 30, 60);
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getUsername(),
                            request.getPassword()
                    )
            );
        } catch (org.springframework.security.authentication.BadCredentialsException e) {
            registrarIntentoFallido(request.getUsername());
            throw e;
        }

        User user = userRepository.findByUsernameOrEmail(request.getUsername(), request.getUsername())
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado"));

        // Login correcto: reiniciar el contador de bloqueo
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);

        // Registrar presencia del usuario y desde qué dispositivo se conecta
        LocalDateTime now = LocalDateTime.now();
        user.setLastLogin(now);
        user.setLastActivity(now);
        aplicarDispositivoActual(user);
        user = userRepository.save(user);

        rateLimiter.resetear("login:" + request.getUsername().toLowerCase());

        // Si la cuenta tiene 2FA activo, no se emiten tokens todavía:
        // se devuelve un token temporal para completar la verificación TOTP.
        if (user.isTwoFactorEnabled()) {
            String mfaToken = jwtService.generateMfaToken(user);
            return AuthResponse.builder()
                    .mfaRequired(true)
                    .mfaToken(mfaToken)
                    .id(user.getId())
                    .username(user.getUsername())
                    .build();
        }

        String jwtToken = jwtService.generateToken(new HashMap<>(), user);
        String refreshToken = jwtService.generateRefreshToken(user);

        auditService.registrar(user.getUsername(), "LOGIN", "USUARIO", user.getId(), user.getUsername() + " inició sesión");

        return buildAuthResponse(user, jwtToken, refreshToken);
    }

    /** Inicia la configuración de 2FA: genera un secreto y devuelve la URL otpauth. */
    @Transactional
    public MfaSetupResponse iniciar2fa() {
        User user = getAuthenticatedUser();
        String secreto = totpService.generarSecreto();
        user.setTwoFactorSecret(cryptoService.encrypt(secreto));
        user.setTwoFactorEnabled(false);
        userRepository.save(user);
        return new MfaSetupResponse(secreto, otpauthUrl(user, secreto), false);
    }

    /** Confirma la configuración de 2FA verificando el primer código. */
    @Transactional
    public MfaSetupResponse activar2fa(MfaCodeRequest request) {
        User user = getAuthenticatedUser();
        if (user.getTwoFactorSecret() == null) {
            throw new RuntimeException("Primero genera el secreto (paso de configuración).");
        }
        String secreto = cryptoService.decrypt(user.getTwoFactorSecret());
        if (!totpService.verificar(secreto, request.getCode())) {
            throw new RuntimeException("Código inválido. Verifica la hora del dispositivo e inténtalo de nuevo.");
        }
        user.setTwoFactorEnabled(true);
        userRepository.save(user);
        auditService.registrar("ACTIVAR_2FA", "USUARIO", user.getId(), user.getUsername());
        return new MfaSetupResponse(secreto, otpauthUrl(user, secreto), true);
    }

    /** Desactiva 2FA (requiere la contraseña actual). */
    @Transactional
    public void desactivar2fa(MfaDisableRequest request) {
        User user = getAuthenticatedUser();
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("La contraseña es incorrecta");
        }
        user.setTwoFactorEnabled(false);
        user.setTwoFactorSecret(null);
        userRepository.save(user);
        auditService.registrar("DESACTIVAR_2FA", "USUARIO", user.getId(), user.getUsername());
    }

    /** Segundo paso del login: valida el código TOTP y emite los tokens definitivos. */
    public AuthResponse verificarMfa(MfaVerifyRequest request) {
        String username;
        try {
            if (!jwtService.isMfaToken(request.getMfaToken())) {
                throw new RuntimeException("Token inválido");
            }
            username = jwtService.extractUsername(request.getMfaToken());
        } catch (Exception e) {
            throw new RuntimeException("La verificación expiró. Inicia sesión nuevamente.");
        }

        User user = userRepository.findByUsernameOrEmail(username, username)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado"));
        if (!user.isTwoFactorEnabled() || user.getTwoFactorSecret() == null) {
            throw new RuntimeException("La verificación 2FA no está activa para este usuario.");
        }
        String secreto = cryptoService.decrypt(user.getTwoFactorSecret());
        if (!totpService.verificar(secreto, request.getCode())) {
            throw new RuntimeException("Código de verificación inválido.");
        }

        String accessToken = jwtService.generateToken(new HashMap<>(), user);
        String refreshToken = jwtService.generateRefreshToken(user);
        auditService.registrar(user.getUsername(), "LOGIN", "USUARIO", user.getId(),
                user.getUsername() + " inició sesión (2FA)");
        return buildAuthResponse(user, accessToken, refreshToken);
    }

    private String otpauthUrl(User user, String secreto) {
        String cuenta = user.getEmail() != null ? user.getEmail() : user.getUsername();
        return totpService.otpauthUrl(secreto, cuenta, "HelpDesk PRO");
    }

    private User getAuthenticatedUser() {
        String principal = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication().getName();
        return userRepository.findByUsernameOrEmail(principal, principal)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado"));
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

        // Rechazar refresh tokens revocados por cambio/restablecimiento de contraseña
        int tvUser = user.getTokenVersion() != null ? user.getTokenVersion() : 0;
        if (jwtService.extractTokenVersion(request.getRefreshToken()) != tvUser) {
            throw new RuntimeException("Sesión expirada. Inicia sesión nuevamente.");
        }

        String newAccessToken = jwtService.generateToken(new HashMap<>(), user);
        // Rotación de refresh token: se emite uno nuevo en cada renovación
        String newRefreshToken = jwtService.generateRefreshToken(user);
        return buildAuthResponse(user, newAccessToken, newRefreshToken);
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
        // Revocar todas las sesiones emitidas antes del cambio de contraseña
        user.setTokenVersion((user.getTokenVersion() != null ? user.getTokenVersion() : 0) + 1);
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
        // Mensaje genérico para no permitir enumerar usuarios/correos existentes
        if (userRepository.existsByUsername(request.getUsername())
                || userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("No se pudo completar el registro con los datos proporcionados.");
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

    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        // No revelar si el correo está registrado (evita enumeración de usuarios):
        // si no existe la cuenta, se termina silenciosamente con la misma respuesta genérica.
        User user = userRepository.findByEmail(request.getEmail()).orElse(null);
        if (user == null) {
            return;
        }

        // Invalidar solicitudes pendientes anteriores para permitir reintentar
        // (por ejemplo, si el correo nunca llegó o el enlace falló).
        List<PasswordResetRequest> pendientes = passwordResetRequestRepository
                .findByUsuarioIdAndStatus(user.getId(), PasswordResetRequest.ResetStatus.PENDIENTE);
        if (!pendientes.isEmpty()) {
            pendientes.forEach(p -> p.setStatus(PasswordResetRequest.ResetStatus.EXPIRADO));
            passwordResetRequestRepository.saveAll(pendientes);
        }

        String token = UUID.randomUUID().toString();

        PasswordResetRequest resetRequest = PasswordResetRequest.builder()
                // Se guarda solo el hash del token; el valor en claro viaja únicamente por correo
                .token(hashToken(token))
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
                .findByTokenAndStatus(hashToken(request.getToken()), PasswordResetRequest.ResetStatus.PENDIENTE)
                .orElseThrow(() -> new RuntimeException("El enlace de restablecimiento no es válido o ya fue utilizado."));

        // El enlace expira a las 24 horas (igual que indica el correo).
        if (resetRequest.getFechaSolicitud() != null
                && resetRequest.getFechaSolicitud().isBefore(LocalDateTime.now().minusHours(24))) {
            resetRequest.setStatus(PasswordResetRequest.ResetStatus.EXPIRADO);
            passwordResetRequestRepository.save(resetRequest);
            throw new RuntimeException("El enlace de restablecimiento ha expirado. Solicita uno nuevo.");
        }

        User user = resetRequest.getUsuario();
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        // Revocar sesiones vigentes tras el restablecimiento
        user.setTokenVersion((user.getTokenVersion() != null ? user.getTokenVersion() : 0) + 1);
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

    /** Registra un intento fallido y bloquea temporalmente la cuenta al superar el máximo. */
    private void registrarIntentoFallido(String usernameOrEmail) {
        userRepository.findByUsernameOrEmail(usernameOrEmail, usernameOrEmail).ifPresent(u -> {
            int intentos = (u.getFailedLoginAttempts() != null ? u.getFailedLoginAttempts() : 0) + 1;
            if (intentos >= MAX_LOGIN_ATTEMPTS) {
                u.setFailedLoginAttempts(0);
                u.setLockedUntil(LocalDateTime.now().plusMinutes(LOCK_MINUTES));
            } else {
                u.setFailedLoginAttempts(intentos);
            }
            userRepository.save(u);
            auditService.registrar(usernameOrEmail, "LOGIN_FALLIDO", "USUARIO", u.getId(),
                    "Intento de inicio de sesión fallido");
        });
    }

    /** IP del cliente de la petición actual (para el rate limiting por IP). */
    private String currentIp() {
        try {
            ServletRequestAttributes attrs =
                    (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                DeviceInfoResolver.DeviceInfo di = DeviceInfoResolver.resolve(attrs.getRequest());
                if (di != null && di.ip() != null && !di.ip().isBlank()) {
                    return di.ip();
                }
            }
        } catch (Exception ignored) {
            // sin contexto de petición
        }
        return "desconocida";
    }

    /** Hash SHA-256 (hex) del token de restablecimiento para almacenarlo de forma segura. */
    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new RuntimeException("Error procesando el token de restablecimiento");
        }
    }

    /** Captura el dispositivo (tipo, modelo, SO, navegador, IP) de la petición actual. */
    private void aplicarDispositivoActual(User user) {
        try {
            ServletRequestAttributes attrs =
                    (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs == null) {
                return;
            }
            HttpServletRequest request = attrs.getRequest();
            DeviceInfoResolver.DeviceInfo di = DeviceInfoResolver.resolve(request);
            user.setDispositivoTipo(di.tipo());
            user.setDispositivoModelo(di.modelo());
            user.setDispositivoSo(di.so());
            user.setNavegador(di.navegador());
            user.setIpUltima(di.ip());
        } catch (Exception e) {
            log.debug("No se pudo detectar el dispositivo del usuario: {}", e.getMessage());
        }
    }

    private AuthResponse buildAuthResponse(User user, String token, String refreshToken) {        List<String> roleNames = user.getRoles().stream()
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
                .twoFactorEnabled(user.isTwoFactorEnabled())
                .build();
    }
}
