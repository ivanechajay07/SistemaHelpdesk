package com.empresa.helpdesk.security;

import com.empresa.helpdesk.modules.user.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Service
public class JwtService {

    @Value("${app.jwt.secret}")
    private String secretKey;

    @Value("${app.jwt.expiration}")
    private long jwtExpiration;

    /** Expiración del refresh token (por defecto 7 días). */
    @Value("${app.jwt.refresh-expiration:604800000}")
    private long refreshExpiration;

    /** Expiración del token temporal de 2FA (por defecto 5 minutos). */
    @Value("${app.jwt.mfa-expiration:300000}")
    private long mfaExpiration;

    /** Falla rápido si el secreto es débil o no está configurado. */
    @PostConstruct
    public void validateSecret() {
        if (secretKey == null || secretKey.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException(
                    "app.jwt.secret debe tener al menos 32 caracteres (256 bits) para HS256. "
                    + "Definelo en tu archivo .env con JWT_SECRET.");
        }
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    public String generateToken(UserDetails userDetails) {
        return generateToken(new HashMap<>(), userDetails);
    }

    public String generateToken(
            Map<String, Object> extraClaims,
            UserDetails userDetails
    ) {
        return buildToken(extraClaims, userDetails, jwtExpiration);
    }

    /** Genera un refresh token con vida útil más larga y claim tipo=refresh. */
    public String generateRefreshToken(UserDetails userDetails) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("tipo", "refresh");
        return buildToken(claims, userDetails, refreshExpiration);
    }

    /** Token temporal emitido tras validar credenciales cuando la cuenta tiene 2FA activo. */
    public String generateMfaToken(UserDetails userDetails) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("tipo", "mfa");
        return buildToken(claims, userDetails, mfaExpiration);
    }

    public boolean isMfaToken(String token) {
        try {
            return "mfa".equals(extractClaim(token, c -> c.get("tipo", String.class)));
        } catch (Exception e) {
            return false;
        }
    }

    private String buildToken(
            Map<String, Object> extraClaims,
            UserDetails userDetails,
            long expiration
    ) {
        // "tv" (token version): permite invalidar todos los tokens emitidos
        // cuando cambia la contraseña (revocación de sesiones). Se incluye
        // siempre (0 si el usuario aún no tiene versión asignada).
        if (userDetails instanceof User user) {
            extraClaims.put("tv", user.getTokenVersion() != null ? user.getTokenVersion() : 0);
        }
        return Jwts
                .builder()
                .claims(extraClaims)
                .subject(userDetails.getUsername())
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getSignInKey(), Jwts.SIG.HS256)
                .compact();
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        if (!username.equals(userDetails.getUsername()) || isTokenExpired(token)) {
            return false;
        }
        // No permitir tokens de cuentas desactivadas o bloqueadas
        if (!userDetails.isEnabled() || !userDetails.isAccountNonLocked()) {
            return false;
        }
        // Verificar que el token no haya sido revocado por cambio de contraseña.
        // Se normaliza null -> 0 para no invalidar tokens de usuarios que aún
        // no tienen versión asignada (p. ej. cuentas creadas antes del cambio).
        if (userDetails instanceof User user) {
            int tvToken = extractTokenVersion(token);
            int tvUser = user.getTokenVersion() != null ? user.getTokenVersion() : 0;
            return tvToken == tvUser;
        }
        return true;
    }

    /** Devuelve la versión de token incluida en el JWT (o 0 si no existe). */
    public int extractTokenVersion(String token) {
        Integer tv = extractClaim(token, c -> c.get("tv", Integer.class));
        return tv != null ? tv : 0;
    }

    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    private Claims extractAllClaims(String token) {
        return Jwts
                .parser()
                .verifyWith(getSignInKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private SecretKey getSignInKey() {
        byte[] keyBytes = secretKey.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
