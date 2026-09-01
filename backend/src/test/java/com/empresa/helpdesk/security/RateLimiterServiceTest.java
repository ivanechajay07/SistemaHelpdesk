package com.empresa.helpdesk.security;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class RateLimiterServiceTest {

    private final RateLimiterService rateLimiter = new RateLimiterService();

    @Test
    void permiteHastaElLimiteDeIntentos() {
        for (int i = 0; i < 5; i++) {
            assertDoesNotThrow(() -> rateLimiter.verificar("login:test", 5, 60));
        }
        assertThrows(RateLimitException.class, () -> rateLimiter.verificar("login:test", 5, 60));
    }

    @Test
    void clavesDiferentesNoSeAfectan() {
        assertDoesNotThrow(() -> rateLimiter.verificar("login:a", 1, 60));
        assertDoesNotThrow(() -> rateLimiter.verificar("login:b", 1, 60));
        assertThrows(RateLimitException.class, () -> rateLimiter.verificar("login:a", 1, 60));
    }

    @Test
    void resetearVuelveAHabilitarLosIntentos() {
        assertDoesNotThrow(() -> rateLimiter.verificar("register:x@mail.com", 1, 60));
        assertThrows(RateLimitException.class, () -> rateLimiter.verificar("register:x@mail.com", 1, 60));

        rateLimiter.resetear("register:x@mail.com");
        assertDoesNotThrow(() -> rateLimiter.verificar("register:x@mail.com", 1, 60));
    }
}
