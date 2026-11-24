package com.empresa.helpdesk.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.net.URI;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Defensa CSRF adicional para peticiones que modifican estado.
 *
 * <p>Los navegadores envían Origin/Referer en POST/PUT/PATCH/DELETE. Si el
 * valor no coincide con un origen permitido ni con el mismo host, se rechaza.
 * Las peticiones sin Origin (curl, integraciones) se permiten porque no llevan
 * cookies automáticamente.</p>
 */
@Component
public class OriginValidationFilter extends OncePerRequestFilter {

    private final Set<String> allowedOrigins;

    public OriginValidationFilter(@Value("${app.cors.allowed-origins:}") String allowedOrigins) {
        this.allowedOrigins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .map(this::normalize)
                .collect(Collectors.toSet());
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        if (isSafeMethod(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        String origin = request.getHeader("Origin");
        if (origin == null || origin.isBlank()) {
            String referer = request.getHeader("Referer");
            if (referer != null && !referer.isBlank()) {
                origin = originFromReferer(referer);
            }
        }

        if (origin != null && !origin.isBlank() && !isAllowed(request, origin)) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write("{\"message\":\"Origen de la solicitud no permitido.\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private boolean isAllowed(HttpServletRequest request, String origin) {
        String normalized = normalize(origin);
        if (allowedOrigins.contains(normalized)) {
            return true;
        }
        String host = request.getHeader("Host");
        if (host == null || host.isBlank()) {
            return false;
        }
        String forwardedProto = request.getHeader("X-Forwarded-Proto");
        String proto = forwardedProto != null && !forwardedProto.isBlank()
                ? forwardedProto.split(",")[0].trim()
                : request.getScheme();
        return normalized.equals(normalize(proto + "://" + host));
    }

    private String originFromReferer(String referer) {
        try {
            URI uri = URI.create(referer);
            if (uri.getScheme() == null || uri.getHost() == null) {
                return null;
            }
            return uri.getScheme() + "://" + uri.getHost()
                    + (uri.getPort() > 0 ? ":" + uri.getPort() : "");
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private String normalize(String value) {
        return value.trim().toLowerCase().replaceAll("/+$", "");
    }

    private boolean isSafeMethod(String method) {
        return "GET".equalsIgnoreCase(method)
                || "HEAD".equalsIgnoreCase(method)
                || "OPTIONS".equalsIgnoreCase(method)
                || "TRACE".equalsIgnoreCase(method);
    }
}
