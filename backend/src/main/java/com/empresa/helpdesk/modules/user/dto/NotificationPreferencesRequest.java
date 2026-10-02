package com.empresa.helpdesk.modules.user.dto;

import lombok.Data;

import java.util.Map;

/** Preferencias de notificación enviadas por el usuario (clave -> activado). */
@Data
public class NotificationPreferencesRequest {
    private Map<String, Boolean> preferences;
}
