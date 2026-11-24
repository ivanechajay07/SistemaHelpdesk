package com.empresa.helpdesk.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class OriginValidationFilterTest {

    private final OriginValidationFilter filter =
            new OriginValidationFilter("http://localhost:5174,https://app.example.com");

    @Test
    void permiteOrigenConfigurado() throws Exception {
        MockHttpServletRequest request = post();
        request.addHeader("Origin", "https://app.example.com");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertEquals(200, response.getStatus());
    }

    @Test
    void permiteMismoHostDetectadoPorNginx() throws Exception {
        MockHttpServletRequest request = post();
        request.setScheme("http");
        request.addHeader("Host", "192.168.1.10:5174");
        request.addHeader("Origin", "http://192.168.1.10:5174");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertEquals(200, response.getStatus());
    }

    @Test
    void bloqueaOrigenExterno() throws Exception {
        MockHttpServletRequest request = post();
        request.addHeader("Origin", "https://evil.example");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertEquals(403, response.getStatus());
        assertTrue(response.getContentAsString().contains("Origen"));
    }

    @Test
    void permitePeticionesSinOriginParaClientesApi() throws Exception {
        MockHttpServletRequest request = post();
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertEquals(200, response.getStatus());
    }

    @Test
    void noValidaPeticionesGet() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/tickets");
        request.addHeader("Origin", "https://evil.example");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertEquals(200, response.getStatus());
    }

    private MockHttpServletRequest post() {
        return new MockHttpServletRequest("POST", "/api/v1/tickets");
    }
}
