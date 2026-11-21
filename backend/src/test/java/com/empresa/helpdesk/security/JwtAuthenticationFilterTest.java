package com.empresa.helpdesk.security;

import com.empresa.helpdesk.modules.user.entity.User;
import com.empresa.helpdesk.modules.user.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JwtAuthenticationFilterTest {

    @Mock private JwtService jwtService;
    @Mock private UserDetailsService userDetailsService;
    @Mock private UserRepository userRepository;

    private JwtAuthenticationFilter filter;
    private User user;

    @BeforeEach
    void setUp() {
        filter = new JwtAuthenticationFilter(jwtService, userDetailsService, userRepository);
        ReflectionTestUtils.setField(filter, "idleTimeoutMinutes", 15L);

        user = User.builder()
                .id(1L)
                .username("admin")
                .password("hash")
                .activo(true)
                .tokenVersion(0)
                .build();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void autenticaUnaSesionConActividadReciente() throws Exception {
        user.setLastActivity(LocalDateTime.now().minusMinutes(2));
        prepararTokenValido();

        MockFilterChain chain = new MockFilterChain();
        filter.doFilter(peticion(), new MockHttpServletResponse(), chain);

        assertNotNull(SecurityContextHolder.getContext().getAuthentication());
        assertNotNull(chain.getRequest(), "la petición continúa al siguiente filtro");
    }

    @Test
    void noAutenticaUnaSesionInactiva() throws Exception {
        user.setLastActivity(LocalDateTime.now().minusMinutes(16));
        prepararTokenValido();

        MockFilterChain chain = new MockFilterChain();
        filter.doFilter(peticion(), new MockHttpServletResponse(), chain);

        assertNull(SecurityContextHolder.getContext().getAuthentication(),
                "una sesión inactiva debe exigir un nuevo login");
        assertNotNull(chain.getRequest());
    }

    private void prepararTokenValido() {
        when(jwtService.extractUsername("jwt-valido")).thenReturn("admin");
        when(userDetailsService.loadUserByUsername("admin")).thenReturn(user);
        when(jwtService.isTokenValid("jwt-valido", user)).thenReturn(true);
    }

    private MockHttpServletRequest peticion() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer jwt-valido");
        return request;
    }
}
