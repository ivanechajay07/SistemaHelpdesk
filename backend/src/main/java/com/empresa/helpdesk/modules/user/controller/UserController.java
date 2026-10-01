package com.empresa.helpdesk.modules.user.controller;

import com.empresa.helpdesk.modules.user.dto.UserRequest;
import com.empresa.helpdesk.modules.user.dto.UserResponse;
import com.empresa.helpdesk.modules.user.dto.UserSummaryResponse;
import com.empresa.helpdesk.modules.user.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Tag(name = "Usuarios", description = "Endpoints para la gestión de usuarios")
public class UserController {

    private final UserService userService;

    @GetMapping
    @Operation(summary = "Obtener todos los usuarios")
    @PreAuthorize("hasAnyAuthority('USER_MANAGE', 'ROLE_ADMIN')")
    public ResponseEntity<Page<UserResponse>> getAllUsers(Pageable pageable) {
        return ResponseEntity.ok(userService.getAllUsers(pageable));
    }

    @GetMapping("/role/{roleName}")
    @Operation(summary = "Obtener usuarios por su rol (resumen sin datos sensibles)")
    public ResponseEntity<java.util.List<UserSummaryResponse>> getUsersByRole(@PathVariable String roleName) {
        return ResponseEntity.ok(userService.getUsersByRole(roleName));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtener usuario por ID")
    @PreAuthorize("hasAnyAuthority('USER_MANAGE', 'ROLE_ADMIN')")
    public ResponseEntity<UserResponse> getUserById(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    @PostMapping
    @Operation(summary = "Crear nuevo usuario")
    @PreAuthorize("hasAnyAuthority('USER_MANAGE', 'ROLE_ADMIN')")
    public ResponseEntity<UserResponse> createUser(@Valid @RequestBody UserRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.createUser(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Actualizar usuario")
    @PreAuthorize("hasAnyAuthority('USER_MANAGE', 'ROLE_ADMIN')")
    public ResponseEntity<UserResponse> updateUser(@PathVariable Long id, @Valid @RequestBody UserRequest request) {
        return ResponseEntity.ok(userService.updateUser(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Eliminar usuario")
    @PreAuthorize("hasAnyAuthority('USER_MANAGE', 'ROLE_ADMIN')")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/activate")
    @Operation(summary = "Activar cuenta pendiente de registro", description = "Activa la cuenta y notifica por correo al usuario")
    @PreAuthorize("hasAnyAuthority('USER_MANAGE', 'ROLE_ADMIN')")
    public ResponseEntity<UserResponse> activateUser(@PathVariable Long id) {
        return ResponseEntity.ok(userService.activateUser(id));
    }

    @PostMapping("/{id}/reject")
    @Operation(summary = "Rechazar registro pendiente", description = "Elimina la cuenta pendiente y notifica por correo al usuario")
    @PreAuthorize("hasAnyAuthority('USER_MANAGE', 'ROLE_ADMIN')")
    public ResponseEntity<Void> rejectUser(@PathVariable Long id) {
        userService.rejectUser(id);
        return ResponseEntity.noContent().build();
    }
}
