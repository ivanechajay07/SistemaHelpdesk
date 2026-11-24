package com.empresa.helpdesk.modules.auth.controller;

import com.empresa.helpdesk.modules.auth.dto.AuthRequest;
import com.empresa.helpdesk.modules.auth.dto.AuthResponse;
import com.empresa.helpdesk.modules.auth.service.AuthService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * La APK Android no puede usar la cookie HttpOnly (origen distinto), por lo que
 * con X-Session-Mode: body el refresh token viaja en el cuerpo.
 */
class AuthControllerSessionModeTest {

    private final AuthService authService = mock(AuthService.class);

    @AfterEach
    void limpiarContexto() {
        RequestContextHolder.resetRequestAttributes();
    }

    @Test
    void navegadorRecibeCookieYNoElTokenEnElCuerpo() {
        AuthController controller = controlador();
        when(authService.login(any())).thenReturn(respuestaConRefresh());

        ResponseEntity<AuthResponse> response = controller.login(new AuthRequest("admin", "Secreta1!"));

        assertNull(response.getBody().getRefreshToken());
        assertNotNull(response.getHeaders().getFirst(HttpHeaders.SET_COOKIE));
    }

    @Test
    void appMovilRecibeElTokenEnElCuerpoYSinCookie() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Session-Mode", "body");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

        AuthController controller = controlador();
        when(authService.login(any())).thenReturn(respuestaConRefresh());

        ResponseEntity<AuthResponse> response = controller.login(new AuthRequest("admin", "Secreta1!"));

        assertEquals("refresh-token-de-prueba", response.getBody().getRefreshToken());
        assertNull(response.getHeaders().getFirst(HttpHeaders.SET_COOKIE));
    }

    private AuthController controlador() {
        AuthController controller = new AuthController(authService);
        ReflectionTestUtils.setField(controller, "cookieSecure", true);
        ReflectionTestUtils.setField(controller, "refreshExpirationMs", 604800000L);
        return controller;
    }

    private AuthResponse respuestaConRefresh() {
        return AuthResponse.builder()
                .accessToken("access-token-de-prueba")
                .refreshToken("refresh-token-de-prueba")
                .id(1L)
                .username("admin")
                .roles(List.of("ADMIN"))
                .build();
    }
}
