package com.empresa.helpdesk.modules.notification.controller;

import com.empresa.helpdesk.modules.notification.dto.NotificationDto;
import com.empresa.helpdesk.modules.notification.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
@Tag(name = "Notificaciones", description = "Feed de eventos del sistema")
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    @Operation(summary = "Obtener notificaciones recientes (tickets generados, cambios de contraseña y registros pendientes)")
    public ResponseEntity<List<NotificationDto>> getNotifications() {
        return ResponseEntity.ok(notificationService.getNotifications());
    }
}
