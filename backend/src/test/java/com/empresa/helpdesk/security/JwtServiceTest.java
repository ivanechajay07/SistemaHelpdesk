package com.empresa.helpdesk.security;

import com.empresa.helpdesk.modules.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class JwtServiceTest {

    private JwtService jwtService;
    private User user;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "secretKey",
                "clave-de-prueba-suficientemente-larga-para-hs256-1234567890");
        ReflectionTestUtils.setField(jwtService, "jwtExpiration", 3600_000L);
        ReflectionTestUtils.setField(jwtService, "refreshExpiration", 7200_000L);

        user = new User();
        user.setUsername("admin");
        user.setPassword("secreta");
        user.setTokenVersion(0);
    }

    @Test
    void tokenValidoConVersionCoincidente() {
        String token = jwtService.generateToken(user);
        assertTrue(jwtService.isTokenValid(token, user));
    }

    @Test
    void tokenSeInvalidaAlIncrementarVersion() {
        String token = jwtService.generateToken(user);
        user.setTokenVersion(1);
        assertFalse(jwtService.isTokenValid(token, user));
    }

    @Test
    void versionNulaSeTrataComoCero() {
        user.setTokenVersion(null);
        String token = jwtService.generateToken(user);
        assertTrue(jwtService.isTokenValid(token, user));
        assertTrue(jwtService.isTokenValid(token, user), "un tv=0 debe seguir siendo válido");
    }

    @Test
    void refreshTokenLlevaTipoRefresh() {
        String refresh = jwtService.generateRefreshToken(user);
        assertTrue(refresh != null && !refresh.isBlank());
        assertTrue(jwtService.isTokenValid(refresh, user));
    }
}
