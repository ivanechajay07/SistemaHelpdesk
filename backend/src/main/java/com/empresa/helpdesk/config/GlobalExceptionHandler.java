package com.empresa.helpdesk.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.empresa.helpdesk.security.RateLimitException;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(org.springframework.web.bind.MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidationExceptions(org.springframework.web.bind.MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(error -> 
            errors.put(error.getField(), error.getDefaultMessage())
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errors);
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<Map<String, String>> handleBadCredentials(BadCredentialsException ex) {
        Map<String, String> response = new HashMap<>();
        response.put("message", "Credenciales inválidas. Verifica tu usuario y contraseña.");
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
    }



    @ExceptionHandler(DisabledException.class)
    public ResponseEntity<Map<String, String>> handleDisabled(DisabledException ex) {
        Map<String, String> response = new HashMap<>();
        response.put("message", "Tu cuenta está desactivada. Contacta al administrador.");
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
    }

    @ExceptionHandler(LockedException.class)
    public ResponseEntity<Map<String, String>> handleLocked(LockedException ex) {
        Map<String, String> response = new HashMap<>();
        response.put("message", "Tu cuenta está bloqueada temporalmente por intentos fallidos.");
        return ResponseEntity.status(HttpStatus.LOCKED).body(response);
    }

    /** Bloqueo temporal por intentos fallidos (incluye minutos restantes). */
    @ExceptionHandler(com.empresa.helpdesk.modules.auth.service.AuthService.CuentaBloqueadaException.class)
    public ResponseEntity<Map<String, Object>> handleCuentaBloqueada(
            com.empresa.helpdesk.modules.auth.service.AuthService.CuentaBloqueadaException ex) {
        Map<String, Object> response = new HashMap<>();
        response.put("message", ex.getMessage());
        response.put("lockedMinutes", ex.getMinutosRestantes());
        return ResponseEntity.status(HttpStatus.LOCKED).body(response);
    }

    /** Credenciales incorrectas: informa cuántos intentos quedan antes del bloqueo. */
    @ExceptionHandler(com.empresa.helpdesk.modules.auth.service.AuthService.CredencialesInvalidasException.class)
    public ResponseEntity<Map<String, Object>> handleCredencialesInvalidas(
            com.empresa.helpdesk.modules.auth.service.AuthService.CredencialesInvalidasException ex) {
        Map<String, Object> response = new HashMap<>();
        response.put("message", ex.getMessage());
        response.put("attemptsRemaining", ex.getIntentosRestantes());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, String>> handleAccessDenied(AccessDeniedException ex) {
        Map<String, String> response = new HashMap<>();
        response.put("message", ex.getMessage() != null ? ex.getMessage() : "No tienes permiso para realizar esta acción.");
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
    }

    @ExceptionHandler(RateLimitException.class)
    public ResponseEntity<Map<String, String>> handleRateLimit(RateLimitException ex) {
        Map<String, String> response = new HashMap<>();
        response.put("message", ex.getMessage());
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(response);
    }

    /** Reutilización de refresh token: sesión comprometida, se fuerza re-login. */
    @ExceptionHandler(com.empresa.helpdesk.modules.auth.service.RefreshTokenService.ReuseDetectedException.class)
    public ResponseEntity<Map<String, String>> handleRefreshReuse(
            com.empresa.helpdesk.modules.auth.service.RefreshTokenService.ReuseDetectedException ex) {
        Map<String, String> response = new HashMap<>();
        response.put("message", ex.getMessage());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
    }

    /** Nunca exponer detalles de SQL/esquema/constraints al cliente. */
    @ExceptionHandler(org.springframework.dao.DataAccessException.class)
    public ResponseEntity<Map<String, String>> handleDataAccess(org.springframework.dao.DataAccessException ex) {
        log.error("Error de acceso a datos", ex);
        Map<String, String> response = new HashMap<>();
        response.put("message", "No se pudo completar la operación por un conflicto con los datos.");
        return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
    }

    @ExceptionHandler(org.springframework.http.converter.HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, String>> handleUnreadable(
            org.springframework.http.converter.HttpMessageNotReadableException ex) {
        Map<String, String> response = new HashMap<>();
        response.put("message", "La solicitud no tiene un formato válido.");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, String>> handleTypeMismatch(
            org.springframework.web.method.annotation.MethodArgumentTypeMismatchException ex) {
        Map<String, String> response = new HashMap<>();
        response.put("message", "Parámetro inválido en la solicitud.");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, String>> handleMaxUpload(
            org.springframework.web.multipart.MaxUploadSizeExceededException ex) {
        Map<String, String> response = new HashMap<>();
        response.put("message", "El archivo supera el tamaño máximo permitido.");
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(response);
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, String>> handleRuntimeException(RuntimeException ex) {
        // Las RuntimeException se usan para errores de negocio con mensajes
        // controlados. Si el mensaje parece técnico (SQL, clases internas), se
        // sustituye por uno genérico para no filtrar detalles del sistema.
        log.warn("Error de negocio: {}", ex.getMessage());
        Map<String, String> response = new HashMap<>();
        response.put("message", mensajeSeguro(ex.getMessage()));
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    private String mensajeSeguro(String message) {
        if (message == null || message.isBlank()) {
            return "No se pudo procesar la solicitud.";
        }
        String lower = message.toLowerCase();
        String[] indicadores = {
                "sql", "constraint", "duplicate entry", "data too long", "foreign key",
                "could not execute", "nested exception", "org.springframework", "org.hibernate",
                "java.", "jdbc", "column", "table '", "syntax error"
        };
        for (String indicador : indicadores) {
            if (lower.contains(indicador)) {
                return "No se pudo procesar la solicitud.";
            }
        }
        return message;
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleException(Exception ex) {
        // No exponer detalles internos (SQL, rutas, clases) al cliente
        log.error("Error interno no controlado", ex);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Ocurrió un error interno. Intenta nuevamente o contacta al administrador.");
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }
}
