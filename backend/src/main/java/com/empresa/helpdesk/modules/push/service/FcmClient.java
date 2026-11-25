package com.empresa.helpdesk.modules.push.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.Signature;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;

/**
 * Cliente mínimo de Firebase Cloud Messaging (API HTTP v1).
 *
 * <p>No usa el SDK de Firebase: firma un JWT RS256 con la cuenta de servicio y
 * pide un access token OAuth2, evitando dependencias pesadas y conflictos de
 * versiones. Si no hay credenciales configuradas, todas las operaciones son
 * un no-op (la app funciona igual, solo sin push).</p>
 */
@Service
@Slf4j
public class FcmClient {

    public enum Resultado {
        OK,
        /** El token ya no es válido: debe eliminarse de la base. */
        INVALIDO,
        ERROR,
        /** Push deshabilitado o sin credenciales. */
        OMITIDO
    }

    private static final String SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
    private static final String FCM_URL = "https://fcm.googleapis.com/v1/projects/%s/messages:send";
    private static final String CANAL_ANDROID = "helpdesk-tickets";

    private final ObjectMapper json;
    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @Value("${app.push.enabled:false}")
    private boolean enabled;

    @Value("${app.push.credentials-base64:}")
    private String credencialesBase64;

    @Value("${app.push.credentials-file:}")
    private String credencialesArchivo;

    private volatile boolean inicializado;
    private volatile Cuenta cuenta;
    private volatile String tokenAcceso;
    private volatile Instant tokenExpira = Instant.EPOCH;

    public FcmClient(ObjectMapper json) {
        this.json = json;
    }

    /** true solo si el push está habilitado y las credenciales son válidas. */
    public boolean disponible() {
        return enabled && obtenerCuenta() != null;
    }

    public Resultado enviar(String deviceToken, String titulo, String cuerpo, Long ticketId, String tipo) {
        Cuenta actual = obtenerCuenta();
        if (actual == null) {
            return Resultado.OMITIDO;
        }

        try {
            ObjectNode root = json.createObjectNode();
            ObjectNode message = root.putObject("message");
            message.put("token", deviceToken);

            ObjectNode notificacion = message.putObject("notification");
            notificacion.put("title", titulo);
            notificacion.put("body", cuerpo);

            ObjectNode datos = message.putObject("data");
            datos.put("tipo", tipo);
            if (ticketId != null) {
                datos.put("ticketId", String.valueOf(ticketId));
            }

            ObjectNode android = message.putObject("android");
            android.put("priority", "HIGH");
            android.putObject("notification").put("channel_id", CANAL_ANDROID);

            HttpRequest request = HttpRequest.newBuilder(URI.create(String.format(FCM_URL, actual.projectId())))
                    .timeout(Duration.ofSeconds(15))
                    .header("Authorization", "Bearer " + tokenAcceso(actual))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(root)))
                    .build();

            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                return Resultado.OK;
            }

            String body = response.body() == null ? "" : response.body();
            log.warn("FCM respondió {}: {}", response.statusCode(), recortar(body, 300));
            return esTokenInvalido(body) ? Resultado.INVALIDO : Resultado.ERROR;
        } catch (Exception e) {
            log.warn("No se pudo enviar la notificación push: {}", e.getMessage());
            return Resultado.ERROR;
        }
    }

    // ===== Credenciales =====

    private Cuenta obtenerCuenta() {
        if (!enabled) {
            return null;
        }
        if (!inicializado) {
            synchronized (this) {
                if (!inicializado) {
                    cuenta = cargarCuenta();
                    inicializado = true;
                }
            }
        }
        return cuenta;
    }

    private Cuenta cargarCuenta() {
        try {
            byte[] datos = null;
            if (tieneTexto(credencialesArchivo)) {
                datos = Files.readAllBytes(Path.of(credencialesArchivo.trim()));
            } else if (tieneTexto(credencialesBase64)) {
                datos = Base64.getMimeDecoder().decode(credencialesBase64.trim());
            }

            if (datos == null) {
                log.warn("Push habilitado pero sin credenciales: define FIREBASE_CREDENTIALS_BASE64 o FIREBASE_CREDENTIALS_FILE");
                return null;
            }

            JsonNode node = json.readTree(datos);
            String projectId = node.path("project_id").asText();
            String clientEmail = node.path("client_email").asText();
            String privateKey = node.path("private_key").asText();
            String tokenUri = node.path("token_uri").asText("https://oauth2.googleapis.com/token");

            if (!tieneTexto(projectId) || !tieneTexto(clientEmail) || !tieneTexto(privateKey)) {
                log.warn("Las credenciales FCM no tienen project_id, client_email o private_key");
                return null;
            }

            log.info("Push FCM habilitado para el proyecto {}", projectId);
            return new Cuenta(projectId, clientEmail, tokenUri, privateKey);
        } catch (Exception e) {
            log.warn("No se pudieron leer las credenciales FCM: {}", e.getMessage());
            return null;
        }
    }

    // ===== OAuth2 (JWT RS256 -> access token) =====

    private String tokenAcceso(Cuenta actual) throws Exception {
        if (tokenAcceso != null && Instant.now().isBefore(tokenExpira)) {
            return tokenAcceso;
        }

        synchronized (this) {
            if (tokenAcceso != null && Instant.now().isBefore(tokenExpira)) {
                return tokenAcceso;
            }

            String assertion = firmarJwt(actual);
            String form = "grant_type=" + URLEncoder.encode("urn:ietf:params:oauth:grant-type:jwt-bearer", StandardCharsets.UTF_8)
                    + "&assertion=" + URLEncoder.encode(assertion, StandardCharsets.UTF_8);

            HttpRequest request = HttpRequest.newBuilder(URI.create(actual.tokenUri()))
                    .timeout(Duration.ofSeconds(15))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(form))
                    .build();

            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw new IllegalStateException("OAuth FCM " + response.statusCode() + ": " + recortar(response.body(), 200));
            }

            JsonNode node = json.readTree(response.body());
            tokenAcceso = node.path("access_token").asText();
            long expira = node.path("expires_in").asLong(3600);
            tokenExpira = Instant.now().plusSeconds(Math.max(60, expira - 60));
            return tokenAcceso;
        }
    }

    private String firmarJwt(Cuenta actual) throws Exception {
        String header = base64Url(json.writeValueAsBytes(Map.of("alg", "RS256", "typ", "JWT")));
        long ahora = Instant.now().getEpochSecond();
        String claims = base64Url(json.writeValueAsBytes(Map.of(
                "iss", actual.clientEmail(),
                "scope", SCOPE,
                "aud", actual.tokenUri(),
                "iat", ahora,
                "exp", ahora + 3600
        )));

        String contenido = header + "." + claims;
        return contenido + "." + firmar(contenido, actual.privateKey());
    }

    private String firmar(String contenido, String pem) throws Exception {
        String limpio = pem
                .replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "")
                .replaceAll("\\s", "");
        byte[] der = Base64.getDecoder().decode(limpio);
        PrivateKey key = KeyFactory.getInstance("RSA").generatePrivate(new PKCS8EncodedKeySpec(der));

        Signature signature = Signature.getInstance("SHA256withRSA");
        signature.initSign(key);
        signature.update(contenido.getBytes(StandardCharsets.UTF_8));
        return base64Url(signature.sign());
    }

    private String base64Url(byte[] data) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(data);
    }

    private boolean esTokenInvalido(String body) {
        return body.contains("UNREGISTERED")
                || body.contains("INVALID_ARGUMENT")
                || body.contains("registration token");
    }

    private boolean tieneTexto(String valor) {
        return valor != null && !valor.isBlank();
    }

    private String recortar(String texto, int largo) {
        if (texto == null) {
            return "";
        }
        return texto.length() > largo ? texto.substring(0, largo) : texto;
    }

    private record Cuenta(String projectId, String clientEmail, String tokenUri, String privateKey) {
    }
}
