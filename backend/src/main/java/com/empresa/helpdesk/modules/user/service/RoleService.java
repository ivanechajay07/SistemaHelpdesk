package com.empresa.helpdesk.modules.user.service;

import com.empresa.helpdesk.modules.user.dto.PermissionResponse;
import com.empresa.helpdesk.modules.user.dto.RoleRequest;
import com.empresa.helpdesk.modules.user.dto.RoleResponse;
import com.empresa.helpdesk.modules.user.entity.Permission;
import com.empresa.helpdesk.modules.user.entity.Role;
import com.empresa.helpdesk.modules.user.repository.PermissionRepository;
import com.empresa.helpdesk.modules.user.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoleService {

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;

    /** Orden jerárquico de los roles por defecto; el resto se ordena alfabéticamente. */
    private static final List<String> ROLE_ORDER = List.of("ADMIN", "SUPERVISOR", "TECNICO", "CLIENTE");

    @Transactional(readOnly = true)
    public List<RoleResponse> getAllRoles() {
        return roleRepository.findAll().stream()
                .sorted(Comparator
                        .comparingInt((Role r) -> {
                            String nombre = r.getName() != null ? r.getName().toUpperCase() : "";
                            int idx = ROLE_ORDER.indexOf(nombre);
                            return idx < 0 ? ROLE_ORDER.size() : idx;
                        })
                        .thenComparing(r -> r.getName() != null ? r.getName() : ""))
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PermissionResponse> getAllPermissions() {
        return permissionRepository.findAll().stream()
                .map(this::mapPermissionToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public RoleResponse updateRolePermissions(Long roleId, RoleRequest request) {
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new RuntimeException("Role not found"));

        List<Permission> newPermissions = permissionRepository.findAllById(request.getPermissionIds());

        // Evita escalada de privilegios: un usuario no administrador no puede
        // modificar el rol ADMIN, ni su propio rol, ni otorgar permisos que él
        // mismo no posee.
        if (!isCurrentUserAdmin()) {
            if ("ADMIN".equalsIgnoreCase(role.getName())) {
                throw new AccessDeniedException(
                        "Solo un administrador puede modificar los permisos del rol ADMIN");
            }
            var auth = SecurityContextHolder.getContext().getAuthentication();
            java.util.Set<String> propias = auth == null ? java.util.Set.of()
                    : auth.getAuthorities().stream()
                        .map(org.springframework.security.core.GrantedAuthority::getAuthority)
                        .collect(Collectors.toSet());
            if (propias.contains("ROLE_" + role.getName().toUpperCase())) {
                throw new AccessDeniedException("No puedes modificar los permisos de tu propio rol");
            }
            boolean otorgaPermisoAjeno = newPermissions.stream()
                    .map(p -> p.getName() != null ? p.getName().toUpperCase() : "")
                    .anyMatch(nombre -> !propias.contains(nombre));
            if (otorgaPermisoAjeno) {
                throw new AccessDeniedException(
                        "No puedes otorgar permisos que no tienes asignados");
            }
        }

        role.setPermissions(new HashSet<>(newPermissions));
        Role updatedRole = roleRepository.save(role);

        return mapToResponse(updatedRole);
    }

    private boolean isCurrentUserAdmin() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
    }

    private RoleResponse mapToResponse(Role role) {
        return RoleResponse.builder()
                .id(role.getId())
                .name(role.getName())
                .description(role.getDescription())
                .permissions(role.getPermissions().stream()
                        .map(this::mapPermissionToResponse)
                        .collect(Collectors.toList()))
                .build();
    }

    private PermissionResponse mapPermissionToResponse(Permission permission) {
        return PermissionResponse.builder()
                .id(permission.getId())
                .name(permission.getName())
                .description(permission.getDescription())
                .build();
    }
}
