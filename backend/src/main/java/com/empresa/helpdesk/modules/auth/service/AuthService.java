package com.empresa.helpdesk.modules.auth.service;

import com.empresa.helpdesk.modules.auth.dto.AuthRequest;
import com.empresa.helpdesk.modules.auth.dto.AuthResponse;
import com.empresa.helpdesk.modules.auth.dto.ChangePasswordRequest;
import com.empresa.helpdesk.modules.auth.dto.ForgotPasswordRequest;
import com.empresa.helpdesk.modules.auth.dto.MfaCodeRequest;
import com.empresa.helpdesk.modules.auth.dto.MfaDisableRequest;
import com.empresa.helpdesk.modules.auth.dto.MfaSetupCompleteRequest;
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
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
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
import java.time.Duration;
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
    private final RefreshTokenService refreshTokenService;

    @Value("${app.security.max-login-attempts:5}")
    private int maxLoginAttempts;

    @Value("${app.security.lock-minutes:15}")
    private long lockMinutes;

    @Value("${app.security.idle-timeout-minutes:15}")
    private long idleTimeoutMinutes;

    @Value("${app.security.login-ip-attempts:120}")
    private int loginIpAttempts;

    @Value("${app.security.login-ip-window-seconds:60}")
    private int loginIpWindowSeconds;

    /** Obliga a los ADMIN a configurar Google Authenticator en el primer login. */
    @Value("${app.security.require-2fa-for-admins:true}")
    private boolean require2faForAdmins;

    public AuthResponse login(AuthRequest request) {
        // Límite por IP (defensa contra fuerza bruta distribuida). El límite por
        // usuario sigue siendo 5/min; este es más amplio para oficinas con NAT.
        rateLimiter.verificar("login-ip:" + currentIp(), loginIpAttempts, loginIpWindowSeconds);

        // Si la cuenta ya está bloqueada, informar de inmediato los minutos restantes
        // (antes del rate limit por usuario, para no ocultar el bloqueo con un 429).
        userRepository.findByUsernameOrEmail(request.getUsername(), request.getUsername())
                .filter(u -> !u.isAccountNonLocked())
                .ifPresent(u -> {
                    throw cuentaBloqueada(request.getUsername());
                });

        // Rate limiting: máx. 5 intentos por minuto por usuario
        rateLimiter.verificar("login:" + request.getUsername().toLowerCase(), 5, 60);

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getUsername(),
                            request.getPassword()
                    )
            );
        } catch (org.springframework.security.authentication.LockedException e) {
            throw cuentaBloqueada(request.getUsername());
        } catch (org.springframework.security.authentication.BadCredentialsException e) {
            ResultadoIntento resultado = registrarIntentoFallido(request.getUsername());
            if (resultado == null) {
                // Usuario inexistente: mensaje genérico (no se revela si existe).
                throw e;
            }
            if (resultado.bloqueadoHasta() != null) {
                throw cuentaBloqueada(request.getUsername());
            }
            throw new CredencialesInvalidasException(
                    "Credenciales inválidas. Te quedan " + resultado.intentosRestantes()
                    + " intento(s) antes de que la cuenta se bloquee.",
                    resultado.intentosRestantes());
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

        // Los administradores deben configurar Google Authenticator antes de entrar.
        if (require2faForAdmins && esAdmin(user)) {
            String secreto = totpService.generarSecreto();
            user.setTwoFactorSecret(cryptoService.encrypt(secreto));
            user.setTwoFactorEnabled(false);
            user.setTwoFactorLastStep(null);
            userRepository.save(user);
            auditService.registrar("CONFIGURAR_2FA_REQUERIDA", "USUARIO", user.getId(),
                    user.getUsername() + " debe configurar 2FA");
            return AuthResponse.builder()
                    .mfaSetupRequired(true)
                    .mfaSetupToken(jwtService.generateMfaSetupToken(user))
                    .mfaSetupSecret(secreto)
                    .mfaSetupOtpauthUrl(otpauthUrl(user, secreto))
                    .id(user.getId())
                    .username(user.getUsername())
                    .build();
        }

        String jwtToken = jwtService.generateToken(new HashMap<>(), user);
        String refreshToken = refreshTokenService.emitir(user);

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
        long paso = totpService.verificarPaso(secreto, request.getCode());
        if (paso < 0) {
            throw new RuntimeException("Código inválido. Verifica la hora del dispositivo e inténtalo de nuevo.");
        }
        registrarPasoTotp(user, paso);
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
        // Límite por IP antes de procesar el token: evita fuerza bruta del código.
        rateLimiter.verificar("mfa-ip:" + currentIp(), 20, 300);

        String username;
        try {
            if (!jwtService.isMfaToken(request.getMfaToken())) {
                throw new RuntimeException("Token inválido");
            }
            username = jwtService.extractUsername(request.getMfaToken());
        } catch (Exception e) {
            throw new RuntimeException("La verificación expiró. Inicia sesión nuevamente.");
        }

        // Límite estricto por usuario: 5 códigos cada 5 minutos.
        rateLimiter.verificar("mfa:" + username.toLowerCase(), 5, 300);

        User user = userRepository.findByUsernameOrEmail(username, username)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado"));
        if (!user.isTwoFactorEnabled() || user.getTwoFactorSecret() == null) {
            throw new RuntimeException("La verificación 2FA no está activa para este usuario.");
        }
        String secreto = cryptoService.decrypt(user.getTwoFactorSecret());
        long paso = totpService.verificarPaso(secreto, request.getCode());
        if (paso < 0) {
            throw new RuntimeException("Código de verificación inválido.");
        }
        registrarPasoTotp(user, paso);
        userRepository.save(user);
        rateLimiter.resetear("mfa:" + username.toLowerCase());

        String accessToken = jwtService.generateToken(new HashMap<>(), user);
        String refreshToken = refreshTokenService.emitir(user);
        auditService.registrar(user.getUsername(), "LOGIN", "USUARIO", user.getId(),
                user.getUsername() + " inició sesión (2FA)");
        return buildAuthResponse(user, accessToken, refreshToken);
    }

    /** Completa la configuración obligatoria de Google Authenticator para ADMIN. */
    @Transactional
    public AuthResponse completarConfiguracion2fa(MfaSetupCompleteRequest request) {
        rateLimiter.verificar("mfa-setup-ip:" + currentIp(), 20, 300);

        String username;
        try {
            if (!jwtService.isMfaSetupToken(request.getMfaSetupToken())) {
                throw new RuntimeException("Token de configuración inválido");
            }
            username = jwtService.extractUsername(request.getMfaSetupToken());
        } catch (Exception e) {
            throw new RuntimeException("La configuración expiró. Inicia sesión nuevamente.");
        }

        rateLimiter.verificar("mfa-setup:" + username.toLowerCase(), 5, 300);

        User user = userRepository.findByUsernameOrEmail(username, username)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado"));
        if (!user.isEnabled()) {
            throw new org.springframework.security.authentication.DisabledException("Cuenta desactivada");
        }
        if (user.isTwoFactorEnabled()) {
            throw new RuntimeException("La verificación en dos pasos ya está activa.");
        }
        if (user.getTwoFactorSecret() == null) {
            throw new RuntimeException("Primero inicia sesión para generar el código QR.");
        }

        String secreto = cryptoService.decrypt(user.getTwoFactorSecret());
        long paso = totpService.verificarPaso(secreto, request.getCode());
        if (paso < 0) {
            throw new RuntimeException("Código inválido. Verifica la hora de tu dispositivo.");
        }

        registrarPasoTotp(user, paso);
        user.setTwoFactorEnabled(true);
        userRepository.saveAndFlush(user);
        rateLimiter.resetear("mfa-setup:" + username.toLowerCase());
        auditService.registrar("ACTIVAR_2FA", "USUARIO", user.getId(),
                user.getUsername() + " activó Google Authenticator");

        String accessToken = jwtService.generateToken(new HashMap<>(), user);
        String refreshToken = refreshTokenService.emitir(user);
        return buildAuthResponse(user, accessToken, refreshToken);
    }

    private boolean esAdmin(User user) {
        return user.getRoles().stream()
                .anyMatch(role -> "ADMIN".equalsIgnoreCase(role.getName()));
    }

    /**
     * Cierra todas las demás sesiones: incrementa la versión de token (los tokens
     * de otros dispositivos quedan inválidos) y emite tokens nuevos para el
     * dispositivo actual, de modo que este permanece activo.
     */
    @Transactional
    public AuthResponse cerrarOtrasSesiones() {
        User user = getAuthenticatedUser();
        user.setTokenVersion((user.getTokenVersion() != null ? user.getTokenVersion() : 0) + 1);
        userRepository.saveAndFlush(user);
        // Revocar también los refresh tokens de todos los dispositivos.
        refreshTokenService.revocarTodos(user.getId());
        auditService.registrar("CERRAR_SESIONES", "USUARIO", user.getId(),
                user.getUsername() + " cerró las demás sesiones");

        String accessToken = jwtService.generateToken(new HashMap<>(), user);
        String refreshToken = refreshTokenService.emitir(user);
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

    /** Renueva el access token usando un refresh token válido (rotación en servidor). */
    public AuthResponse refresh(RefreshRequest request) {
        rateLimiter.verificar("refresh-ip:" + currentIp(), 120, 60);
        RefreshTokenService.Rotacion rotacion = refreshTokenService.rotar(request.getRefreshToken());
        User user = rotacion.usuario();

        // Si la sesión estuvo inactiva más allá del límite, no se renueva:
        // hay que volver a iniciar sesión.
        if (idleTimeoutMinutes > 0 && user.getLastActivity() != null
                && user.getLastActivity().isBefore(LocalDateTime.now().minusMinutes(idleTimeoutMinutes))) {
            refreshTokenService.revocarTodos(user.getId());
            throw new RuntimeException("Sesión expirada por inactividad. Inicia sesión nuevamente.");
        }

        String newAccessToken = jwtService.generateToken(new HashMap<>(), user);
        return buildAuthResponse(user, newAccessToken, rotacion.token());
    }

    /** Cierra la sesión actual revocando su refresh token (logout real). */
    @Transactional
    public void logout(String refreshToken) {
        refreshTokenService.revocar(refreshToken);
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
        user.setTwoFactorLastStep(null);
        // saveAndFlush garantiza que la contraseña y el tokenVersion se escriban
        // antes de la revocación masiva de refresh tokens.
        userRepository.saveAndFlush(user);
        refreshTokenService.revocarTodos(user.getId());
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
        // Rate limiting: máx. 3 registros por minuto por correo y 10 por IP
        rateLimiter.verificar("register:" + request.getEmail().toLowerCase(), 3, 60);
        rateLimiter.verificar("register-ip:" + currentIp(), 10, 60);
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
        // Evita abuso del envío de correos (spam/phishing) y fuerza bruta de correos.
        rateLimiter.verificar("forgot:" + request.getEmail().toLowerCase(), 3, 300);
        rateLimiter.verificar("forgot-ip:" + currentIp(), 10, 300);

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
        rateLimiter.verificar("reset-ip:" + currentIp(), 10, 300);

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
        // Revocar sesiones vigentes tras el restablecimiento y desbloquear la cuenta
        user.setTokenVersion((user.getTokenVersion() != null ? user.getTokenVersion() : 0) + 1);
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        user.setTwoFactorLastStep(null);
        userRepository.saveAndFlush(user);
        refreshTokenService.revocarTodos(user.getId());

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

    /** Resultado de un intento fallido: intentos restantes o bloqueo aplicado. */
    private record ResultadoIntento(int intentosRestantes, LocalDateTime bloqueadoHasta) {
    }

    /** Registra un intento fallido y bloquea temporalmente la cuenta al llegar al máximo. */
    private ResultadoIntento registrarIntentoFallido(String usernameOrEmail) {
        var encontrado = userRepository.findByUsernameOrEmail(usernameOrEmail, usernameOrEmail);
        if (encontrado.isEmpty()) {
            return null;
        }
        User u = encontrado.get();
        int intentos = (u.getFailedLoginAttempts() != null ? u.getFailedLoginAttempts() : 0) + 1;
        boolean bloqueadaAhora = intentos >= maxLoginAttempts;
        if (bloqueadaAhora) {
            u.setFailedLoginAttempts(0);
            u.setLockedUntil(LocalDateTime.now().plusMinutes(lockMinutes));
        } else {
            u.setFailedLoginAttempts(intentos);
        }
        userRepository.save(u);
        if (bloqueadaAhora) {
            // Al bloquear la cuenta se invalidan también sus sesiones renovables.
            refreshTokenService.revocarTodos(u.getId());
        }
        auditService.registrar(usernameOrEmail, "LOGIN_FALLIDO", "USUARIO", u.getId(),
                "Intento de inicio de sesión fallido");
        return bloqueadaAhora
                ? new ResultadoIntento(0, u.getLockedUntil())
                : new ResultadoIntento(maxLoginAttempts - intentos, null);
    }

    /** Bloqueo temporal: informa los minutos restantes reales. */
    private CuentaBloqueadaException cuentaBloqueada(String usernameOrEmail) {
        LocalDateTime hasta = userRepository.findByUsernameOrEmail(usernameOrEmail, usernameOrEmail)
                .map(User::getLockedUntil)
                .orElse(null);
        long minutos = lockMinutes;
        if (hasta != null) {
            long segundos = Duration.between(LocalDateTime.now(), hasta).getSeconds();
            minutos = Math.max(1, (segundos + 59) / 60);
        }
        return new CuentaBloqueadaException(
                "Cuenta bloqueada temporalmente por intentos fallidos. "
                + "Intenta de nuevo en " + minutos + " minuto(s).",
                minutos);
    }

    /** Credenciales incorrectas: incluye cuántos intentos quedan antes del bloqueo. */
    public static class CredencialesInvalidasException extends RuntimeException {
        private final int intentosRestantes;

        public CredencialesInvalidasException(String message, int intentosRestantes) {
            super(message);
            this.intentosRestantes = intentosRestantes;
        }

        public int getIntentosRestantes() {
            return intentosRestantes;
        }
    }

    /** Se lanza al intentar entrar con una cuenta bloqueada temporalmente. */
    public static class CuentaBloqueadaException extends RuntimeException {
        private final long minutosRestantes;

        public CuentaBloqueadaException(String message) {
            this(message, 0);
        }

        public CuentaBloqueadaException(String message, long minutosRestantes) {
            super(message);
            this.minutosRestantes = minutosRestantes;
        }

        public long getMinutosRestantes() {
            return minutosRestantes;
        }
    }

    /**
     * Registra el paso TOTP aceptado y rechaza la reutilización de un código
     * que siga siendo válido por el desfase de ±30 s.
     */
    private void registrarPasoTotp(User user, long paso) {
        if (user.getTwoFactorLastStep() != null && paso <= user.getTwoFactorLastStep()) {
            throw new RuntimeException(
                    "Este código ya fue utilizado. Espera al siguiente código de tu aplicación.");
        }
        user.setTwoFactorLastStep(paso);
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
