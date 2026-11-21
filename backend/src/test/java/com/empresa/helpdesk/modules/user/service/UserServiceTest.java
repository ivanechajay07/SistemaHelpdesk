package com.empresa.helpdesk.modules.user.service;

import com.empresa.helpdesk.modules.auth.service.RefreshTokenService;
import com.empresa.helpdesk.modules.audit.service.AuditService;
import com.empresa.helpdesk.modules.notification.service.EmailService;
import com.empresa.helpdesk.modules.user.dto.ProfileUpdateRequest;
import com.empresa.helpdesk.modules.user.dto.UserRequest;
import com.empresa.helpdesk.modules.user.entity.Role;
import com.empresa.helpdesk.modules.user.entity.User;
import com.empresa.helpdesk.modules.user.repository.RoleRepository;
import com.empresa.helpdesk.modules.user.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private RoleRepository roleRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private EmailService emailService;
    @Mock
    private AuditService auditService;
    @Mock
    private RefreshTokenService refreshTokenService;
    @Mock
    private com.empresa.helpdesk.security.upload.FileValidationService fileValidationService;

    private UserService service;

    @BeforeEach
    void setUp() {
        service = new UserService(userRepository, roleRepository, passwordEncoder,
                emailService, auditService, new ObjectMapper(), refreshTokenService,
                fileValidationService);
        ReflectionTestUtils.setField(service, "uploadDir", System.getProperty("java.io.tmpdir"));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void unUsuarioConUserManageNoPuedeAsignarElRolAdmin() {
        User actor = usuario(2L, "gestor", "gestor@test.local", "USER_MANAGE");
        User objetivo = usuario(3L, "cliente", "cliente@test.local");
        Role admin = Role.builder().id(99L).name("ADMIN").permissions(new HashSet<>()).build();

        autenticar(actor, "ROLE_TECNICO", "USER_MANAGE");
        when(userRepository.findByUsernameOrEmail("gestor", "gestor")).thenReturn(Optional.of(actor));
        when(userRepository.findById(3L)).thenReturn(Optional.of(objetivo));
        when(roleRepository.findById(99L)).thenReturn(Optional.of(admin));

        UserRequest request = requestPara(objetivo, Set.of(99L));
        assertThrows(AccessDeniedException.class, () -> service.updateUser(3L, request));

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void unUsuarioConUserManageNoPuedeEditarUnaCuentaAdmin() {
        User actor = usuario(2L, "gestor", "gestor@test.local", "USER_MANAGE");
        User objetivo = usuario(3L, "admin2", "admin2@test.local");
        objetivo.setRoles(Set.of(Role.builder().id(1L).name("ADMIN").permissions(new HashSet<>()).build()));

        autenticar(actor, "ROLE_TECNICO", "USER_MANAGE");
        when(userRepository.findByUsernameOrEmail("gestor", "gestor")).thenReturn(Optional.of(actor));
        when(userRepository.findById(3L)).thenReturn(Optional.of(objetivo));

        assertThrows(AccessDeniedException.class,
                () -> service.updateUser(3L, requestPara(objetivo, Set.of(5L))));

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void unUsuarioConUserManageNoPuedeCambiarLaPasswordDeOtro() {
        User actor = usuario(2L, "gestor", "gestor@test.local", "USER_MANAGE");
        User objetivo = usuario(3L, "cliente", "cliente@test.local");

        autenticar(actor, "ROLE_TECNICO", "USER_MANAGE");
        when(userRepository.findByUsernameOrEmail("gestor", "gestor")).thenReturn(Optional.of(actor));
        when(userRepository.findById(3L)).thenReturn(Optional.of(objetivo));

        UserRequest request = requestPara(objetivo, Set.of(5L));
        request.setPassword("NuevaClave123");

        assertThrows(AccessDeniedException.class, () -> service.updateUser(3L, request));
        verify(passwordEncoder, never()).encode(anyString());
    }

    @Test
    void cambiarElCorreoSinPasswordActualFalla() {
        User actor = usuario(2L, "cliente", "viejo@test.local");
        autenticar(actor, "ROLE_CLIENTE");
        when(userRepository.findByUsernameOrEmail("cliente", "cliente")).thenReturn(Optional.of(actor));
        when(userRepository.existsByEmail("nuevo@test.local")).thenReturn(false);

        ProfileUpdateRequest request = ProfileUpdateRequest.builder()
                .nombre("Nombre")
                .apellidos("Apellido")
                .email("nuevo@test.local")
                .build();

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> service.updateMyProfile(request));

        assertTrue(ex.getMessage().toLowerCase().contains("contraseña"));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void cambiarElCorreoConPasswordCorrectaSePermite() {
        User actor = usuario(2L, "cliente", "viejo@test.local");
        actor.setPassword("hash-actual");
        autenticar(actor, "ROLE_CLIENTE");
        when(userRepository.findByUsernameOrEmail("cliente", "cliente")).thenReturn(Optional.of(actor));
        when(userRepository.existsByEmail("nuevo@test.local")).thenReturn(false);
        when(passwordEncoder.matches("Actual1234", "hash-actual")).thenReturn(true);
        when(userRepository.save(actor)).thenReturn(actor);

        ProfileUpdateRequest request = ProfileUpdateRequest.builder()
                .nombre("Nombre")
                .apellidos("Apellido")
                .email("nuevo@test.local")
                .currentPassword("Actual1234")
                .build();

        var response = service.updateMyProfile(request);

        assertEquals("nuevo@test.local", response.getEmail());
        verify(userRepository).save(actor);
    }

    @Test
    void desactivarUnaCuentaRevocaSusSesiones() {
        User actor = usuario(1L, "admin", "admin@test.local", "USER_MANAGE");
        actor.setRoles(Set.of(Role.builder().id(1L).name("ADMIN").permissions(new HashSet<>()).build()));
        User objetivo = usuario(3L, "cliente", "cliente@test.local");
        objetivo.setActivo(true);

        autenticar(actor, "ROLE_ADMIN");
        when(userRepository.findByUsernameOrEmail("admin", "admin")).thenReturn(Optional.of(actor));
        when(userRepository.findById(3L)).thenReturn(Optional.of(objetivo));
        when(roleRepository.findById(5L)).thenReturn(Optional.of(
                Role.builder().id(5L).name("TECNICO").permissions(new HashSet<>()).build()));
        when(userRepository.save(objetivo)).thenReturn(objetivo);

        UserRequest request = requestPara(objetivo, Set.of(5L));
        request.setActivo(false);

        service.updateUser(3L, request);

        assertFalse(objetivo.isActivo());
        assertEquals(1, objetivo.getTokenVersion());
        verify(refreshTokenService).revocarTodos(3L);
    }

    private UserRequest requestPara(User objetivo, Set<Long> roles) {
        return UserRequest.builder()
                .username(objetivo.getUsername())
                .email(objetivo.getEmail())
                .nombre(objetivo.getNombre())
                .apellidos(objetivo.getApellidos())
                .activo(true)
                .roleIds(new HashSet<>(roles))
                .build();
    }

    private User usuario(Long id, String username, String email, String... permisos) {
        Role role = Role.builder()
                .id(5L)
                .name("TECNICO")
                .permissions(new HashSet<>())
                .build();
        Arrays.stream(permisos).forEach(p -> role.getPermissions().add(
                com.empresa.helpdesk.modules.user.entity.Permission.builder().name(p).build()));
        User user = User.builder()
                .id(id)
                .username(username)
                .email(email)
                .password("hash")
                .nombre("Nombre")
                .apellidos("Apellido")
                .activo(true)
                .tokenVersion(0)
                .roles(new HashSet<>(Set.of(role)))
                .build();
        return user;
    }

    private void autenticar(User user, String... authorities) {
        var auths = Arrays.stream(authorities).map(SimpleGrantedAuthority::new).toList();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user.getUsername(), null, auths));
    }
}
