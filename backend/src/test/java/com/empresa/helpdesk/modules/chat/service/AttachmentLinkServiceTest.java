package com.empresa.helpdesk.modules.chat.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AttachmentLinkServiceTest {

    private AttachmentLinkService service;

    @BeforeEach
    void setUp() {
        service = new AttachmentLinkService();
        ReflectionTestUtils.setField(service, "secret", "secreto-de-prueba-para-firma-hmac-1234567890");
    }

    @Test
    void generaUrlFirmadaParaAdjunto() {
        String url = service.toPublicUrl("/uploads/abc123_imagen.png");
        assertTrue(url.startsWith("/api/v1/chat/attachments/abc123_imagen.png?exp="), url);
        assertTrue(url.contains("&sig="), url);
    }

    @Test
    void verificaFirmaValida() {
        String url = service.toPublicUrl("/uploads/abc123_imagen.png");
        Matcher m = Pattern.compile("exp=(\\d+)&sig=([0-9a-f]+)").matcher(url);
        assertTrue(m.find());
        long exp = Long.parseLong(m.group(1));
        String sig = m.group(2);
        assertTrue(service.verificar("abc123_imagen.png", exp, sig));
    }

    @Test
    void rechazaFirmaManipulada() {
        long exp = System.currentTimeMillis() / 1000 + 3600;
        assertFalse(service.verificar("abc123_imagen.png", exp, "00ff00ff"));
        String url = service.toPublicUrl("/uploads/abc123_imagen.png");
        Matcher m = Pattern.compile("exp=(\\d+)&sig=([0-9a-f]+)").matcher(url);
        assertTrue(m.find());
        assertFalse(service.verificar("otro_archivo.png", Long.parseLong(m.group(1)), m.group(2)));
    }

    @Test
    void extraeNombreSoloDeUploads() {
        assertEquals("f.png", service.extraerNombre("/uploads/f.png"));
        assertNull(service.extraerNombre("http://externo/x.png"));
        assertNull(service.extraerNombre("/uploads/../etc/passwd"));
    }
}
