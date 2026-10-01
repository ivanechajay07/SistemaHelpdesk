package com.empresa.helpdesk.modules.chat.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;

/**
 * Firma y verifica enlaces de descarga de adjuntos del chat.
 *
 * Los archivos ya no se sirven públicamente desde /uploads/**. En su lugar se
 * emite una URL con expiración y firma HMAC que el endpoint
 * /api/v1/chat/attachments/{archivo} valida antes de entregar el contenido.
 * Así el enlace funciona en un &lt;a href&gt; del navegador (sin cabecera
 * Authorization) sin exponer los archivos de forma permanente.
 */
@Service
@Slf4j
public class AttachmentLinkService {

    private static final String PREFIX = "/uploads/";
    private static final String PUBLIC_PATH = "/api/v1/chat/attachments/";
    private static final long TTL_SECONDS = 6 * 60 * 60; // 6 horas

    @Value("${app.crypto.secret}")
    private String secret;

    public String toPublicUrl(String storedUrl) {
        String filename = extraerNombre(storedUrl);
        if (filename == null) {
            return storedUrl; // URL externa o formato desconocido: se devuelve tal cual
        }
        long exp = Instant.now().getEpochSecond() + TTL_SECONDS;
        return PUBLIC_PATH + filename + "?exp=" + exp + "&sig=" + firmar(filename, exp);
    }

    public boolean verificar(String filename, long exp, String sig) {
        if (filename == null || filename.isBlank() || sig == null || sig.isBlank()) {
            return false;
        }
        if (filename.contains("/") || filename.contains("\\") || filename.contains("..")) {
            return false;
        }
        if (exp < Instant.now().getEpochSecond()) {
            return false;
        }
        String esperado = firmar(filename, exp);
        return MessageDigest.isEqual(
                esperado.getBytes(StandardCharsets.UTF_8),
                sig.getBytes(StandardCharsets.UTF_8));
    }

    /** Extrae el nombre base si la URL corresponde a un archivo almacenado en /uploads/. */
    public String extraerNombre(String storedUrl) {
        if (storedUrl == null || storedUrl.isBlank()) {
            return null;
        }
        int idx = storedUrl.lastIndexOf(PREFIX);
        if (idx < 0) {
            return null;
        }
        String name = storedUrl.substring(idx + PREFIX.length());
        if (name.isBlank() || name.contains("/") || name.contains("\\") || name.contains("..")) {
            return null;
        }
        return name;
    }

    private String firmar(String filename, long exp) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] digest = mac.doFinal((filename + ":" + exp).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            throw new IllegalStateException("No se pudo firmar el enlace del adjunto", e);
        }
    }
}
