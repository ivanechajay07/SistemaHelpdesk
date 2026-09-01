package com.empresa.helpdesk.modules.user.service;

import com.empresa.helpdesk.modules.user.dto.PermissionResponse;
import com.empresa.helpdesk.modules.user.dto.RoleRequest;
import com.empresa.helpdesk.modules.user.dto.RoleResponse;
import com.empresa.helpdesk.modules.user.entity.Permission;
import com.empresa.helpdesk.modules.user.entity.Role;
import com.empresa.helpdesk.modules.user.repository.PermissionRepository;
import com.empresa.helpdesk.modules.user.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
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

        List<Permission> newPermissions = permissionRepository.findAllById(request.getPermissionIds());
        
        role.setPermissions(new HashSet<>(newPermissions));
        Role updatedRole = roleRepository.save(role);

        return mapToResponse(updatedRole);
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
