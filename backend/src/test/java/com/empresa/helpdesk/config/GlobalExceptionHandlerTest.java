package com.empresa.helpdesk.config;

import com.empresa.helpdesk.modules.auth.service.AuthService;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void noFiltraDetallesDeSqlAlCliente() {
        ResponseEntity<Map<String, String>> response = handler.handleDataAccess(
                new DataIntegrityViolationException("Duplicate entry 'x' for key 'usuarios.email'"));

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        String mensaje = response.getBody().get("message");
        assertFalse(mensaje.toLowerCase().contains("duplicate"));
        assertFalse(mensaje.toLowerCase().contains("key"));
    }

    @Test
    void sanitizaMensajesTecnicosDeRuntimeException() {
        ResponseEntity<Map<String, String>> response = handler.handleRuntimeException(
                new RuntimeException("could not execute statement [SQL] ..."));

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("No se pudo procesar la solicitud.", response.getBody().get("message"));
    }

    @Test
    void conservaLosMensajesDeNegocio() {
        ResponseEntity<Map<String, String>> response = handler.handleRuntimeException(
                new RuntimeException("La contraseña actual es incorrecta"));

        assertEquals("La contraseña actual es incorrecta", response.getBody().get("message"));
    }

    @Test
    void elBloqueoTemporalResponde423ConMinutos() {
        ResponseEntity<Map<String, Object>> response = handler.handleCuentaBloqueada(
                new AuthService.CuentaBloqueadaException(
                        "Cuenta bloqueada temporalmente. Intenta de nuevo en 15 minuto(s).", 15));

        assertEquals(HttpStatus.LOCKED, response.getStatusCode());
        assertEquals(15L, response.getBody().get("lockedMinutes"));
        assertTrue(response.getBody().get("message").toString().contains("15 minuto"));
    }

    @Test
    void losIntentosRestantesSeDevuelvenEnLaRespuesta() {
        ResponseEntity<Map<String, Object>> response = handler.handleCredencialesInvalidas(
                new AuthService.CredencialesInvalidasException(
                        "Credenciales inválidas. Te quedan 3 intento(s).", 3));

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertEquals(3, response.getBody().get("attemptsRemaining"));
        assertTrue(response.getBody().get("message").toString().contains("3 intento"));
    }
}
