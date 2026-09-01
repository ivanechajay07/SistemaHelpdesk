package com.empresa.helpdesk.modules.auth.controller;

import com.empresa.helpdesk.modules.auth.dto.AuthRequest;
import com.empresa.helpdesk.modules.auth.dto.AuthResponse;
import com.empresa.helpdesk.modules.auth.dto.ChangePasswordRequest;
import com.empresa.helpdesk.modules.auth.dto.ForgotPasswordRequest;
import com.empresa.helpdesk.modules.auth.dto.RefreshRequest;
import com.empresa.helpdesk.modules.auth.dto.RegisterRequest;
import com.empresa.helpdesk.modules.auth.dto.ResetPasswordRequest;
import com.empresa.helpdesk.modules.auth.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Endpoints para autenticación de usuarios")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    @Operation(summary = "Iniciar sesión", description = "Autentica al usuario y devuelve un token JWT")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody AuthRequest request
    ) {
        return ResponseEntity.ok(authService.login(request));
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
    public ResponseEntity<AuthResponse> refresh(@Valid @RequestBody RefreshRequest request) {
        return ResponseEntity.ok(authService.refresh(request));
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
            return ResponseEntity.ok(Map.of("message", "Se ha enviado un correo con las instrucciones para restablecer tu contraseña."));
        } catch (RuntimeException e) {
            if (e.getMessage().contains("No se encontró")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
            }
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
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
}
