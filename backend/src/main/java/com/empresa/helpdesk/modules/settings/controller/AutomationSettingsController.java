package com.empresa.helpdesk.modules.settings.controller;

import com.empresa.helpdesk.modules.settings.dto.AutomationSettingsDto;
import com.empresa.helpdesk.modules.settings.service.AutomationSettingsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/settings/automation")
@RequiredArgsConstructor
@PreAuthorize("hasAnyAuthority('ROLE_ADMIN')")
@Tag(name = "Automatización", description = "Configuración de automatizaciones del sistema")
public class AutomationSettingsController {

    private final AutomationSettingsService service;

    @GetMapping
    @Operation(summary = "Obtener la configuración de automatización")
    public ResponseEntity<AutomationSettingsDto> get() {
        return ResponseEntity.ok(service.get());
    }

    @PutMapping
    @Operation(summary = "Actualizar la configuración de automatización")
    public ResponseEntity<AutomationSettingsDto> update(@RequestBody AutomationSettingsDto dto) {
        return ResponseEntity.ok(service.update(dto));
    }
}
