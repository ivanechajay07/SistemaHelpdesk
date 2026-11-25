package com.empresa.helpdesk.modules.push.controller;

import com.empresa.helpdesk.modules.push.dto.DeviceTokenRequest;
import com.empresa.helpdesk.modules.push.service.PushService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Registro de tokens de Firebase Cloud Messaging de la app Android.
 * Requiere sesión: el token queda asociado al usuario autenticado.
 */
@RestController
@RequestMapping("/api/v1/push/devices")
@RequiredArgsConstructor
@Tag(name = "Push", description = "Notificaciones push de la app Android")
public class PushDeviceController {

    private final PushService pushService;

    @PostMapping
    @Operation(summary = "Registrar o actualizar el token del dispositivo")
    public ResponseEntity<Map<String, String>> registrar(@Valid @RequestBody DeviceTokenRequest request) {
        pushService.registrar(request.getToken(), request.getPlatform());
        return ResponseEntity.ok(Map.of("message", "Dispositivo registrado para notificaciones."));
    }

    @PostMapping("/unregister")
    @Operation(summary = "Eliminar el token al cerrar sesión")
    public ResponseEntity<Map<String, String>> eliminar(@Valid @RequestBody DeviceTokenRequest request) {
        pushService.eliminar(request.getToken());
        return ResponseEntity.ok(Map.of("message", "Dispositivo desregistrado."));
    }
}
