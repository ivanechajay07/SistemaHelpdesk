package com.empresa.helpdesk.modules.user.service;

import com.empresa.helpdesk.modules.user.dto.RoleRequest;
import com.empresa.helpdesk.modules.user.entity.Permission;
import com.empresa.helpdesk.modules.user.entity.Role;
import com.empresa.helpdesk.modules.user.repository.PermissionRepository;
import com.empresa.helpdesk.modules.user.repository.RoleRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RoleServiceTest {

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private PermissionRepository permissionRepository;

    private RoleService service;

    @BeforeEach
    void setUp() {
        service = new RoleService(roleRepository, permissionRepository);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void unNoAdminNoPuedeModificarElRolAdmin() {
        autenticar("supervisor", "ROLE_SUPERVISOR");
        Role admin = rol(1L, "ADMIN");
        when(roleRepository.findById(1L)).thenReturn(Optional.of(admin));

        assertThrows(AccessDeniedException.class,
                () -> service.updateRolePermissions(1L, request(2L)));
    }

    @Test
    void unNoAdminNoPuedeModificarSuPropioRol() {
        autenticar("supervisor", "ROLE_SUPERVISOR");
        Role propio = rol(2L, "SUPERVISOR");
        when(roleRepository.findById(2L)).thenReturn(Optional.of(propio));

        assertThrows(AccessDeniedException.class,
                () -> service.updateRolePermissions(2L, request(10L)));
    }

    @Test
    void unNoAdminNoPuedeOtorgarPermisosQueNoTiene() {
        autenticar("supervisor", "ROLE_SUPERVISOR", "TICKET_VIEW_ALL");
        Role tecnico = rol(3L, "TECNICO");
        Permission userManage = permiso(10L, "USER_MANAGE");

        when(roleRepository.findById(3L)).thenReturn(Optional.of(tecnico));
        when(permissionRepository.findAllById(any())).thenReturn(List.of(userManage));

        assertThrows(AccessDeniedException.class,
                () -> service.updateRolePermissions(3L, request(10L)));
    }

    @Test
    void unNoAdminPuedeOtorgarUnPermisoQueYaPosee() {
        autenticar("supervisor", "ROLE_SUPERVISOR", "TICKET_VIEW_ALL");
        Role tecnico = rol(3L, "TECNICO");
        Permission viewAll = permiso(11L, "TICKET_VIEW_ALL");

        when(roleRepository.findById(3L)).thenReturn(Optional.of(tecnico));
        when(permissionRepository.findAllById(any())).thenReturn(List.of(viewAll));
        when(roleRepository.save(tecnico)).thenReturn(tecnico);

        assertDoesNotThrow(() -> service.updateRolePermissions(3L, request(11L)));
        assertTrue(tecnico.getPermissions().contains(viewAll));
    }

    @Test
    void unAdminSiPuedeModificarElRolAdmin() {
        autenticar("admin", "ROLE_ADMIN");
        Role admin = rol(1L, "ADMIN");
        Permission edit = permiso(12L, "TICKET_EDIT");

        when(roleRepository.findById(1L)).thenReturn(Optional.of(admin));
        when(permissionRepository.findAllById(any())).thenReturn(List.of(edit));
        when(roleRepository.save(admin)).thenReturn(admin);

        assertDoesNotThrow(() -> service.updateRolePermissions(1L, request(12L)));
        assertTrue(admin.getPermissions().contains(edit));
    }

    private void autenticar(String usuario, String... authorities) {
        var auths = java.util.Arrays.stream(authorities)
                .map(SimpleGrantedAuthority::new)
                .toList();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(usuario, null, auths));
    }

    private RoleRequest request(Long... permissionIds) {
        RoleRequest request = new RoleRequest();
        request.setPermissionIds(java.util.Arrays.asList(permissionIds));
        return request;
    }

    private Role rol(Long id, String name) {
        return Role.builder().id(id).name(name).permissions(new HashSet<>()).build();
    }

    private Permission permiso(Long id, String name) {
        return Permission.builder().id(id).name(name).build();
    }
}
