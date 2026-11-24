package com.empresa.helpdesk.modules.auth.controller;

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
import com.empresa.helpdesk.modules.auth.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Endpoints para autenticación de usuarios")
public class AuthController {

    private static final String REFRESH_COOKIE = "HD_REFRESH";

    private final AuthService authService;

    /** En producción debe ser true (HTTPS). En local HTTP se deja false. */
    @Value("${app.security.cookie-secure:false}")
    private boolean cookieSecure;

    @Value("${app.jwt.refresh-expiration:604800000}")
    private long refreshExpirationMs;

    private ResponseCookie buildRefreshCookie(String token) {
        return ResponseCookie.from(REFRESH_COOKIE, token)
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite("Strict")
                .path("/api/v1/auth")
                .maxAge(Duration.ofMillis(refreshExpirationMs))
                .build();
    }

    private ResponseCookie clearRefreshCookie() {
        return ResponseCookie.from(REFRESH_COOKIE, "")
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite("Strict")
                .path("/api/v1/auth")
                .maxAge(Duration.ZERO)
                .build();
    }

    /** Devuelve la respuesta sin exponer el refresh token en el cuerpo. */
    private ResponseEntity<AuthResponse> withRefreshCookie(AuthResponse response) {
        String refreshToken = response.getRefreshToken();
        response.setRefreshToken(null);
        if (refreshToken == null) {
            return ResponseEntity.ok(response);
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, buildRefreshCookie(refreshToken).toString())
                .body(response);
    }

    @PostMapping("/login")
    @Operation(summary = "Iniciar sesión", description = "Autentica al usuario y devuelve un token JWT")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody AuthRequest request
    ) {
        return withRefreshCookie(authService.login(request));
    }

    @PostMapping("/heartbeat")
    @Operation(summary = "Heartbeat de presencia", description = "Actualiza la última actividad del usuario autenticado")
    public ResponseEntity<Map<String, String>> heartbeat() {
        authService.heartbeat();
        return ResponseEntity.ok(Map.of("message", "ok"));
    }

    @GetMapping("/me")
    @Operation(summary = "Perfil actual", description = "Devuelve los datos y permisos actuales del usuario autenticado")
    public ResponseEntity<AuthResponse> me() {
        return ResponseEntity.ok(authService.me());
    }

    @PostMapping("/refresh")
    @Operation(summary = "Renovar access token", description = "Genera un nuevo access token a partir del refresh token")
    public ResponseEntity<AuthResponse> refresh(
            @CookieValue(name = REFRESH_COOKIE, required = false) String cookieToken,
            @RequestBody(required = false) RefreshRequest request
    ) {
        String token = cookieToken;
        if (token == null || token.isBlank()) {
            token = request != null ? request.getRefreshToken() : null;
        }
        if (token == null || token.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        RefreshRequest refreshRequest = new RefreshRequest();
        refreshRequest.setRefreshToken(token);
        return withRefreshCookie(authService.refresh(refreshRequest));
    }

    @PostMapping("/logout")
    @Operation(summary = "Cerrar sesión", description = "Revoca el refresh token del dispositivo actual")
    public ResponseEntity<Map<String, String>> logout(
            @CookieValue(name = REFRESH_COOKIE, required = false) String cookieToken,
            @RequestBody(required = false) RefreshRequest request
    ) {
        String token = cookieToken;
        if (token == null || token.isBlank()) {
            token = request != null ? request.getRefreshToken() : null;
        }
        authService.logout(token);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, clearRefreshCookie().toString())
                .body(Map.of("message", "Sesión cerrada correctamente."));
    }

    @PostMapping("/change-password")
    @Operation(summary = "Cambiar contraseña propia", description = "El usuario autenticado cambia su contraseña")
    public ResponseEntity<Map<String, String>> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        try {
            authService.changePassword(request);
            return ResponseEntity.ok(Map.of("message", "Tu contraseña ha sido actualizada exitosamente."));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/register")
    @Operation(summary = "Registrar nuevo usuario", description = "Crea una cuenta de usuario inactiva pendiente de activación")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PostMapping("/forgot-password")
    @Operation(summary = "Solicitar cambio de contraseña", description = "Envía un correo con enlace para restablecer la contraseña")
    public ResponseEntity<Map<String, String>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request
    ) {
        try {
            authService.forgotPassword(request);
        } catch (RuntimeException e) {
            // No se revela información sobre la existencia de la cuenta; si falla
            // el envío del correo se informa un error genérico de servicio.
            return ResponseEntity.badRequest().body(Map.of("message",
                    "No se pudo procesar la solicitud. Intenta nuevamente más tarde."));
        }
        return ResponseEntity.ok(Map.of("message",
                "Si el correo está registrado, recibirás las instrucciones para restablecer tu contraseña."));
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Restablecer contraseña", description = "Cambia la contraseña usando el token recibido por correo")
    public ResponseEntity<Map<String, String>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request
    ) {
        try {
            authService.resetPassword(request);
            return ResponseEntity.ok(Map.of("message", "Tu contraseña ha sido restablecida exitosamente. Ahora puedes iniciar sesión."));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/sessions/revoke-others")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Cerrar otras sesiones", description = "Invalida los tokens de los demás dispositivos y renueva el de este")
    public ResponseEntity<AuthResponse> revokeOtherSessions() {
        return withRefreshCookie(authService.cerrarOtrasSesiones());
    }

    @PostMapping("/2fa/verify")
    @Operation(summary = "Verificar código 2FA", description = "Segundo paso del login cuando la cuenta tiene 2FA activo")
    public ResponseEntity<AuthResponse> verify2fa(@Valid @RequestBody MfaVerifyRequest request) {
        return withRefreshCookie(authService.verificarMfa(request));
    }

    @PostMapping("/2fa/setup/complete")
    @Operation(summary = "Completar configuración 2FA obligatoria",
            description = "Verifica el primer código de Google Authenticator y emite la sesión")
    public ResponseEntity<AuthResponse> completeMfaSetup(
            @Valid @RequestBody MfaSetupCompleteRequest request
    ) {
        return withRefreshCookie(authService.completarConfiguracion2fa(request));
    }

    @PostMapping("/2fa/setup")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Iniciar configuración 2FA", description = "Genera el secreto y la URL otpauth para la app autenticadora")
    public ResponseEntity<MfaSetupResponse> setup2fa() {
        return ResponseEntity.ok(authService.iniciar2fa());
    }

    @PostMapping("/2fa/enable")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Activar 2FA", description = "Verifica el primer código y activa la verificación en dos pasos")
    public ResponseEntity<MfaSetupResponse> enable2fa(@Valid @RequestBody MfaCodeRequest request) {
        return ResponseEntity.ok(authService.activar2fa(request));
    }

    @PostMapping("/2fa/disable")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Desactivar 2FA", description = "Desactiva 2FA; requiere la contraseña actual")
    public ResponseEntity<Map<String, String>> disable2fa(@Valid @RequestBody MfaDisableRequest request) {
        authService.desactivar2fa(request);
        return ResponseEntity.ok(Map.of("message", "La verificación en dos pasos fue desactivada."));
    }
}
