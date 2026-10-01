package com.empresa.helpdesk.security;

import com.empresa.helpdesk.modules.user.entity.User;
import com.empresa.helpdesk.modules.user.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        final String authHeader = request.getHeader("Authorization");
        final String jwt;
        final String username;

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        jwt = authHeader.substring(7);

        // Un token inválido o expirado no debe romper la petición: simplemente
        // se continúa sin autenticar (los endpoints protegidos responderán 401).
        // Esto es clave para endpoints públicos como el QR de inventario, que
        // pueden recibir un Authorization obsoleto desde el navegador.
        try {
            username = jwtService.extractUsername(jwt);

            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                UserDetails userDetails = this.userDetailsService.loadUserByUsername(username);

                if (jwtService.isTokenValid(jwt, userDetails)) {
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities()
                    );
                    authToken.setDetails(
                            new WebAuthenticationDetailsSource().buildDetails(request)
                    );
                    SecurityContextHolder.getContext().setAuthentication(authToken);

                    // Actualizar la última actividad y el dispositivo del usuario
                    // (máximo una vez por minuto)
                    touchPresence(username, request);
                }
            }
        } catch (Exception e) {
            SecurityContextHolder.clearContext();
            if (log.isDebugEnabled()) {
                log.debug("Token JWT inválido o expirado, se continúa sin autenticar: {}", e.getMessage());
            }
        }

        filterChain.doFilter(request, response);
    }

    private void touchPresence(String username, HttpServletRequest request) {
        try {
            userRepository.findByUsernameOrEmail(username, username).ifPresent(user -> {
                LocalDateTime now = LocalDateTime.now();
                LocalDateTime last = user.getLastActivity();
                if (last == null || last.isBefore(now.minusSeconds(60))) {
                    user.setLastActivity(now);
                    DeviceInfoResolver.DeviceInfo di = DeviceInfoResolver.resolve(request);
                    user.setDispositivoTipo(di.tipo());
                    user.setDispositivoModelo(di.modelo());
                    user.setDispositivoSo(di.so());
                    user.setNavegador(di.navegador());
                    user.setIpUltima(di.ip());
                    userRepository.save(user);
                }
            });
        } catch (Exception ignored) {
            // La presencia nunca debe romper la petición
        }
    }
}
