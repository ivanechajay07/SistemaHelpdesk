package com.empresa.helpdesk.modules.settings.dto;

/** Preferencias de automatización del sistema. */
public record AutomationSettingsDto(
        boolean autoAssignment,
        boolean slaEscalation
) {
}
