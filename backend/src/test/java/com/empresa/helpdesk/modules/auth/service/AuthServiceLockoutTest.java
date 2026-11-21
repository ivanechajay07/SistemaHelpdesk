package com.empresa.helpdesk.modules.auth.service;

import com.empresa.helpdesk.modules.audit.service.AuditService;
import com.empresa.helpdesk.modules.auth.dto.AuthRequest;
import com.empresa.helpdesk.modules.auth.dto.RefreshRequest;
import com.empresa.helpdesk.modules.notification.service.EmailService;
import com.empresa.helpdesk.modules.user.entity.User;
import com.empresa.helpdesk.modules.user.repository.PasswordResetRequestRepository;
import com.empresa.helpdesk.modules.user.repository.RoleRepository;
import com.empresa.helpdesk.modules.user.repository.UserRepository;
import com.empresa.helpdesk.security.CryptoService;
import com.empresa.helpdesk.security.JwtService;
import com.empresa.helpdesk.security.RateLimiterService;
import com.empresa.helpdesk.security.TotpService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceLockoutTest {

    @Mock private UserRepository userRepository;
    @Mock private RoleRepository roleRepository;
    @Mock private PasswordResetRequestRepository passwordResetRequestRepository;
    @Mock private JwtService jwtService;
    @Mock private AuthenticationManager authenticationManager;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private EmailService emailService;
    @Mock private RateLimiterService rateLimiter;
    @Mock private AuditService auditService;
    @Mock private TotpService totpService;
    @Mock private CryptoService cryptoService;
    @Mock private RefreshTokenService refreshTokenService;

    private AuthService authService;
    private User user;

    @BeforeEach
    void setUp() {
        authService = new AuthService(userRepository, roleRepository, passwordResetRequestRepository,
                jwtService, authenticationManager, passwordEncoder, emailService, rateLimiter,
                auditService, totpService, cryptoService, refreshTokenService);
        ReflectionTestUtils.setField(authService, "maxLoginAttempts", 5);
        ReflectionTestUtils.setField(authService, "lockMinutes", 15L);
        ReflectionTestUtils.setField(authService, "idleTimeoutMinutes", 15L);

        user = User.builder()
                .id(8L)
                .username("admin")
                .email("admin@test.local")
                .password("hash")
                .activo(true)
                .failedLoginAttempts(4)
                .tokenVersion(0)
                .build();
    }

    @Test
    void cincoIntentosFallidosBloqueanLaCuentaQuinceMinutos() {
        when(userRepository.findByUsernameOrEmail("admin", "admin")).thenReturn(Optional.of(user));
        when(authenticationManager.authenticate(any())).thenThrow(new BadCredentialsException("bad"));
        when(userRepository.save(user)).thenReturn(user);

        LocalDateTime antes = LocalDateTime.now();
        AuthService.CuentaBloqueadaException ex = assertThrows(
                AuthService.CuentaBloqueadaException.class,
                () -> authService.login(request("admin", "mala")));

        assertTrue(ex.getMessage().contains("15 minuto"), ex.getMessage());
        assertNotNull(user.getLockedUntil(), "la cuenta queda bloqueada");
        assertFalse(user.isAccountNonLocked());
        assertTrue(user.getLockedUntil().isAfter(antes.plusMinutes(14)));
        assertTrue(user.getLockedUntil().isBefore(antes.plusMinutes(16)));
        assertEquals(0, user.getFailedLoginAttempts(), "el contador se reinicia al bloquear");
        verify(refreshTokenService).revocarTodos(8L);
    }

    @Test
    void cadaFalloInformaCuantosIntentosQuedan() {
        user.setFailedLoginAttempts(1);
        when(userRepository.findByUsernameOrEmail("admin", "admin")).thenReturn(Optional.of(user));
        when(authenticationManager.authenticate(any())).thenThrow(new BadCredentialsException("bad"));
        when(userRepository.save(user)).thenReturn(user);

        AuthService.CredencialesInvalidasException ex = assertThrows(
                AuthService.CredencialesInvalidasException.class,
                () -> authService.login(request("admin", "mala")));

        assertEquals(3, ex.getIntentosRestantes(), "5 máximo - 2 intentos consumidos");
        assertTrue(ex.getMessage().contains("Te quedan 3 intento"), ex.getMessage());
        assertNull(user.getLockedUntil(), "todavía no debe estar bloqueada");
    }

    @Test
    void unaCuentaBloqueadaInformaLosMinutosRestantes() {
        user.setLockedUntil(LocalDateTime.now().plusMinutes(10));
        when(userRepository.findByUsernameOrEmail("admin", "admin")).thenReturn(Optional.of(user));

        AuthService.CuentaBloqueadaException ex = assertThrows(
                AuthService.CuentaBloqueadaException.class,
                () -> authService.login(request("admin", "mala")));

        assertTrue(ex.getMessage().contains("10 minuto"), ex.getMessage());
        assertEquals(10, ex.getMinutosRestantes());
        // El bloqueo se detecta antes de intentar autenticar.
        verify(authenticationManager, never()).authenticate(any());
    }

    @Test
    void elLoginExitosoReiniciaElContadorDeIntentos() {
        user.setFailedLoginAttempts(3);
        when(authenticationManager.authenticate(any())).thenReturn(null);
        when(userRepository.findByUsernameOrEmail("admin", "admin")).thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);
        when(jwtService.generateToken(any(), any())).thenReturn("access");
        when(refreshTokenService.emitir(user)).thenReturn("refresh");

        var response = authService.login(request("admin", "correcta"));

        assertEquals("access", response.getAccessToken());
        assertEquals("refresh", response.getRefreshToken());
        assertEquals(0, user.getFailedLoginAttempts());
        assertNull(user.getLockedUntil());
        assertNotNull(user.getLastActivity());
    }

    @Test
    void unaSesionInactivaNoSePuedeRenovar() {
        user.setLastActivity(LocalDateTime.now().minusMinutes(16));
        when(refreshTokenService.rotar("refresh-viejo"))
                .thenReturn(new RefreshTokenService.Rotacion(user, "refresh-nuevo"));

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> authService.refresh(refreshRequest("refresh-viejo")));

        assertTrue(ex.getMessage().toLowerCase().contains("inactividad"));
        verify(refreshTokenService).revocarTodos(8L);
    }

    @Test
    void unaSesionActivaSiSePuedeRenovar() {
        user.setLastActivity(LocalDateTime.now().minusMinutes(2));
        when(refreshTokenService.rotar("refresh")).thenReturn(new RefreshTokenService.Rotacion(user, "refresh-nuevo"));
        when(jwtService.generateToken(any(), any())).thenReturn("access-nuevo");

        var response = authService.refresh(refreshRequest("refresh"));

        assertEquals("access-nuevo", response.getAccessToken());
        assertEquals("refresh-nuevo", response.getRefreshToken());
        verify(refreshTokenService, never()).revocarTodos(any());
    }

    private AuthRequest request(String username, String password) {
        AuthRequest request = new AuthRequest();
        request.setUsername(username);
        request.setPassword(password);
        return request;
    }

    private RefreshRequest refreshRequest(String token) {
        RefreshRequest request = new RefreshRequest();
        request.setRefreshToken(token);
        return request;
    }
}
