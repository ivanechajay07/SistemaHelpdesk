package com.empresa.helpdesk.security;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Cifrado simétrico AES-GCM para almacenar de forma segura las contraseñas
 * del directorio de correos corporativos.
 *
 * Versiones de clave:
 *  - v2 (actual): clave derivada con PBKDF2-HMAC-SHA256 + sal e iteraciones.
 *  - v1 (heredada): clave = SHA-256(secreto). Se conserva SOLO para poder
 *    descifrar los datos ya almacenados con la versión anterior.
 * Los datos nuevos se cifran con v2; el prefijo "v2:" distingue el formato.
 */
@Service
public class CryptoService {

    private static final String V2_PREFIX = "v2:";
    private static final String V2_SALT = "helpdesk-crypto-v2-salt";
    private static final int V2_ITERATIONS = 120_000;
    private static final int V2_KEY_BITS = 256;

    @Value("${app.crypto.secret}")
    private String secret;

    private SecretKeySpec keyV1; // heredada (SHA-256)
    private SecretKeySpec keyV2; // actual (PBKDF2)

    @PostConstruct
    public void init() {
        try {
            byte[] legacyHash = MessageDigest.getInstance("SHA-256")
                    .digest(secret.getBytes(StandardCharsets.UTF_8));
            keyV1 = new SecretKeySpec(legacyHash, "AES");

            PBEKeySpec spec = new PBEKeySpec(
                    secret.toCharArray(),
                    V2_SALT.getBytes(StandardCharsets.UTF_8),
                    V2_ITERATIONS,
                    V2_KEY_BITS);
            byte[] derived = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
                    .generateSecret(spec)
                    .getEncoded();
            keyV2 = new SecretKeySpec(derived, "AES");
        } catch (Exception e) {
            throw new IllegalStateException("No se pudo inicializar el cifrado", e);
        }
    }

    public String encrypt(String plaintext) {
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            byte[] iv = new byte[12];
            new SecureRandom().nextBytes(iv);
            cipher.init(Cipher.ENCRYPT_MODE, keyV2, new GCMParameterSpec(128, iv));
            byte[] cipherText = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            ByteBuffer buffer = ByteBuffer.allocate(4 + iv.length + cipherText.length);
            buffer.putInt(iv.length);
            buffer.put(iv);
            buffer.put(cipherText);
            return V2_PREFIX + Base64.getEncoder().encodeToString(buffer.array());
        } catch (Exception e) {
            throw new RuntimeException("Error al cifrar el dato", e);
        }
    }

    public String decrypt(String encoded) {
        try {
            SecretKeySpec key = keyV1;
            String payload = encoded;
            if (encoded.startsWith(V2_PREFIX)) {
                key = keyV2;
                payload = encoded.substring(V2_PREFIX.length());
            }
            byte[] all = Base64.getDecoder().decode(payload);
            ByteBuffer buffer = ByteBuffer.wrap(all);
            int ivLength = buffer.getInt();
            if (ivLength < 12 || ivLength > 16 || buffer.remaining() < ivLength + 1) {
                throw new IllegalArgumentException("Dato cifrado inválido");
            }
            byte[] iv = new byte[ivLength];
            buffer.get(iv);
            byte[] cipherText = new byte[buffer.remaining()];
            buffer.get(cipherText);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, iv));
            return new String(cipher.doFinal(cipherText), StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new RuntimeException("Error al descifrar el dato", e);
        }
    }
}
