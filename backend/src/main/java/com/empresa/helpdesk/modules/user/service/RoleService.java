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

import java.util.HashSet;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoleService {

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;

    @Transactional(readOnly = true)
    public List<RoleResponse> getAllRoles() {
        return roleRepository.findAll().stream()
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

        // Evita escalada de privilegios: el rol ADMIN solo lo puede tocar un ADMIN.
        if ("ADMIN".equalsIgnoreCase(role.getName()) && !isCurrentUserAdmin()) {
            throw new AccessDeniedException(
                    "Solo un administrador puede modificar los permisos del rol ADMIN");
        }

        List<Permission> newPermissions = permissionRepository.findAllById(request.getPermissionIds());
        
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
