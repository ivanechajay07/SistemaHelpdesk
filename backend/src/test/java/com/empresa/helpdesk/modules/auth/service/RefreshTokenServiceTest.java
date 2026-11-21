package com.empresa.helpdesk.modules.auth.service;

import com.empresa.helpdesk.modules.auth.entity.RefreshToken;
import com.empresa.helpdesk.modules.auth.repository.RefreshTokenRepository;
import com.empresa.helpdesk.modules.user.entity.User;
import com.empresa.helpdesk.modules.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RefreshTokenServiceTest {

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private UserRepository userRepository;

    private RefreshTokenService service;
    private User user;

    @BeforeEach
    void setUp() {
        service = new RefreshTokenService(refreshTokenRepository, userRepository);
        ReflectionTestUtils.setField(service, "refreshExpirationMs", 604_800_000L);

        user = User.builder()
                .id(7L)
                .username("admin")
                .email("admin@test.local")
                .password("hash")
                .activo(true)
                .tokenVersion(0)
                .build();
    }

    @Test
    void emitirGuardaSoloElHashYDevuelveTokenAleatorio() {
        when(refreshTokenRepository.save(any(RefreshToken.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        String token = service.emitir(user);

        assertNotNull(token);
        assertFalse(token.isBlank());

        ArgumentCaptor<RefreshToken> captor = ArgumentCaptor.forClass(RefreshToken.class);
        verify(refreshTokenRepository).save(captor.capture());
        RefreshToken guardado = captor.getValue();

        assertEquals(sha256(token), guardado.getTokenHash(), "nunca se guarda el token en claro");
        assertNotEquals(token, guardado.getTokenHash());
        assertFalse(guardado.isRevocado());
        assertTrue(guardado.getExpira().isAfter(LocalDateTime.now()));
        assertNotNull(guardado.getFamilia());
    }

    @Test
    void rotarRevocaElTokenAnteriorYEmiteUnoNuevoEnLaMismaFamilia() {
        RefreshToken actual = tokenVigente("old-token", "familia-1");
        when(refreshTokenRepository.findByTokenHash(sha256("old-token"))).thenReturn(Optional.of(actual));
        when(refreshTokenRepository.save(any(RefreshToken.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        RefreshTokenService.Rotacion rotacion = service.rotar("old-token");

        assertNotNull(rotacion.token());
        assertNotEquals("old-token", rotacion.token());
        assertTrue(actual.isRevocado(), "el token usado se marca como revocado");

        ArgumentCaptor<RefreshToken> captor = ArgumentCaptor.forClass(RefreshToken.class);
        verify(refreshTokenRepository, times(2)).save(captor.capture());
        List<RefreshToken> guardados = captor.getAllValues();
        assertEquals("familia-1", guardados.get(1).getFamilia(), "el nuevo token mantiene la familia");
        assertFalse(guardados.get(1).isRevocado());
    }

    @Test
    void reutilizarUnTokenYaRotadoInvalidaTodasLasSesiones() {
        RefreshToken comprometido = tokenVigente("old-token", "familia-1");
        comprometido.setRevocado(true);
        when(refreshTokenRepository.findByTokenHash(sha256("old-token")))
                .thenReturn(Optional.of(comprometido));
        when(userRepository.findById(7L)).thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);

        assertThrows(RefreshTokenService.ReuseDetectedException.class, () -> service.rotar("old-token"));

        verify(refreshTokenRepository).revocarFamilia("familia-1");
        verify(refreshTokenRepository).revocarTodos(7L);
        assertEquals(1, user.getTokenVersion(), "se invalidan también los access tokens vigentes");
    }

    @Test
    void rechazaTokenExpirado() {
        RefreshToken expirado = tokenVigente("expirado", "familia-2");
        expirado.setExpira(LocalDateTime.now().minusMinutes(1));
        when(refreshTokenRepository.findByTokenHash(sha256("expirado"))).thenReturn(Optional.of(expirado));
        when(refreshTokenRepository.save(any(RefreshToken.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> service.rotar("expirado"));

        assertTrue(ex.getMessage().toLowerCase().contains("expir"));
        assertTrue(expirado.isRevocado());
    }

    @Test
    void rechazaTokenDeCuentaDesactivada() {
        user.setActivo(false);
        RefreshToken token = tokenVigente("token", "familia-3");
        when(refreshTokenRepository.findByTokenHash(sha256("token"))).thenReturn(Optional.of(token));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> service.rotar("token"));
        assertTrue(ex.getMessage().toLowerCase().contains("desactivada"));
    }

    @Test
    void revocarMarcaElTokenComoRevocado() {
        RefreshToken token = tokenVigente("logout", "familia-4");
        when(refreshTokenRepository.findByTokenHash(sha256("logout"))).thenReturn(Optional.of(token));
        when(refreshTokenRepository.save(any(RefreshToken.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        service.revocar("logout");

        assertTrue(token.isRevocado());
        verify(refreshTokenRepository).save(token);
    }

    @Test
    void invalidarSesionesIncrementaVersionYRevocaTokens() {
        when(userRepository.save(user)).thenReturn(user);

        service.invalidarSesiones(user);

        assertEquals(1, user.getTokenVersion());
        verify(refreshTokenRepository).revocarTodos(7L);
    }

    @Test
    void tokenDesconocidoNoPermiteRenovar() {
        when(refreshTokenRepository.findByTokenHash(any())).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> service.rotar("no-existe"));
        verify(refreshTokenRepository, never()).revocarFamilia(any());
        verify(refreshTokenRepository, never()).revocarTodos(anyLong());
    }

    private RefreshToken tokenVigente(String raw, String familia) {
        return RefreshToken.builder()
                .id(1L)
                .usuario(user)
                .tokenHash(sha256(raw))
                .familia(familia)
                .expira(LocalDateTime.now().plusDays(1))
                .revocado(false)
                .creado(LocalDateTime.now())
                .build();
    }

    private String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
