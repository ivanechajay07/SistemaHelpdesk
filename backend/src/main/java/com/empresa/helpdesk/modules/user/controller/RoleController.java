package com.empresa.helpdesk.modules.user.controller;

import com.empresa.helpdesk.modules.user.dto.PermissionResponse;
import com.empresa.helpdesk.modules.user.dto.RoleRequest;
import com.empresa.helpdesk.modules.user.dto.RoleResponse;
import com.empresa.helpdesk.modules.user.service.RoleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/roles")
@RequiredArgsConstructor
@Tag(name = "Roles", description = "Endpoints para la gestión de roles y permisos")
@PreAuthorize("hasAnyAuthority('ROLE_MANAGE', 'ROLE_ADMIN')")
public class RoleController {

    private final RoleService roleService;

    @GetMapping
    @Operation(summary = "Obtener todos los roles")
    public ResponseEntity<List<RoleResponse>> getAllRoles() {
        return ResponseEntity.ok(roleService.getAllRoles());
    }

    @GetMapping("/permissions")
    @Operation(summary = "Obtener todos los permisos disponibles")
    public ResponseEntity<List<PermissionResponse>> getAllPermissions() {
        return ResponseEntity.ok(roleService.getAllPermissions());
    }

    @PutMapping("/{id}/permissions")
    @Operation(summary = "Actualizar permisos de un rol")
    public ResponseEntity<RoleResponse> updateRolePermissions(
            @PathVariable Long id,
            @RequestBody @Valid RoleRequest request) {
        return ResponseEntity.ok(roleService.updateRolePermissions(id, request));
    }
}
