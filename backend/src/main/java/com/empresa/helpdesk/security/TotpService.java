package com.empresa.helpdesk.security;

import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.security.SecureRandom;

/**
 * Implementación de TOTP (RFC 6238) con HOTP (RFC 4226) y Base32 (RFC 4648),
 * sin dependencias externas. Compatible con Google Authenticator, Authy, etc.
 */
@Service
public class TotpService {

    private static final String BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    private static final int SECRET_BYTES = 20;      // 160 bits
    private static final int DIGITS = 6;
    private static final int PERIOD_SECONDS = 30;
    private static final int DEFAULT_SKEW = 1;       // ±1 ventana (±30s)

    /** Genera un secreto aleatorio codificado en Base32 (sin relleno). */
    public String generarSecreto() {
        byte[] bytes = new byte[SECRET_BYTES];
        new SecureRandom().nextBytes(bytes);
        return base32Encode(bytes);
    }

    public String otpauthUrl(String secretoBase32, String cuenta, String emisor) {
        String label = emisor + ":" + cuenta;
        return "otpauth://totp/" + urlEncode(label)
                + "?secret=" + secretoBase32
                + "&issuer=" + urlEncode(emisor)
                + "&algorithm=SHA1&digits=" + DIGITS + "&period=" + PERIOD_SECONDS;
    }

    public boolean verificar(String secretoBase32, String codigo) {
        return verificar(secretoBase32, codigo, DEFAULT_SKEW);
    }

    public boolean verificar(String secretoBase32, String codigo, int skew) {
        if (secretoBase32 == null || codigo == null) {
            return false;
        }
        String limpio = codigo.replaceAll("\\s", "");
        if (!limpio.matches("\\d{" + DIGITS + "}")) {
            return false;
        }
        byte[] key = base32Decode(secretoBase32);
        long contador = System.currentTimeMillis() / 1000L / PERIOD_SECONDS;
        for (int i = -skew; i <= skew; i++) {
            if (generarCodigo(key, contador + i).equals(limpio)) {
                return true;
            }
        }
        return false;
    }

    /** Código actual (para pruebas/diagnóstico). */
    public String generarCodigoActual(String secretoBase32) {
        byte[] key = base32Decode(secretoBase32);
        return generarCodigo(key, System.currentTimeMillis() / 1000L / PERIOD_SECONDS);
    }

    private String generarCodigo(byte[] key, long contador) {
        try {
            byte[] data = ByteBuffer.allocate(8).putLong(contador).array();
            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(key, "HmacSHA1"));
            byte[] hash = mac.doFinal(data);
            int offset = hash[hash.length - 1] & 0x0F;
            int binary = ((hash[offset] & 0x7F) << 24)
                    | ((hash[offset + 1] & 0xFF) << 16)
                    | ((hash[offset + 2] & 0xFF) << 8)
                    | (hash[offset + 3] & 0xFF);
            int otp = binary % 1_000_000;
            return String.format("%0" + DIGITS + "d", otp);
        } catch (Exception e) {
            throw new IllegalStateException("No se pudo generar el código TOTP", e);
        }
    }

    private String base32Encode(byte[] data) {
        StringBuilder sb = new StringBuilder();
        int buffer = 0;
        int bitsLeft = 0;
        for (byte b : data) {
            buffer = (buffer << 8) | (b & 0xFF);
            bitsLeft += 8;
            while (bitsLeft >= 5) {
                sb.append(BASE32_ALPHABET.charAt((buffer >> (bitsLeft - 5)) & 0x1F));
                bitsLeft -= 5;
            }
        }
        if (bitsLeft > 0) {
            sb.append(BASE32_ALPHABET.charAt((buffer << (5 - bitsLeft)) & 0x1F));
        }
        return sb.toString();
    }

    private byte[] base32Decode(String base32) {
        String s = base32.trim().toUpperCase().replace("=", "").replace(" ", "");
        int buffer = 0;
        int bitsLeft = 0;
        java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
        for (char c : s.toCharArray()) {
            int val = BASE32_ALPHABET.indexOf(c);
            if (val < 0) {
                throw new IllegalArgumentException("Secreto Base32 inválido");
            }
            buffer = (buffer << 5) | val;
            bitsLeft += 5;
            if (bitsLeft >= 8) {
                out.write((buffer >> (bitsLeft - 8)) & 0xFF);
                bitsLeft -= 8;
            }
        }
        return out.toByteArray();
    }

    private String urlEncode(String value) {
        return java.net.URLEncoder.encode(value, java.nio.charset.StandardCharsets.UTF_8);
    }
}
