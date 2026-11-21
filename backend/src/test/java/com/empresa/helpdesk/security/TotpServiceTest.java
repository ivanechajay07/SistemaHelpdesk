package com.empresa.helpdesk.security;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TotpServiceTest {

    private final TotpService totp = new TotpService();

    @Test
    void generaYVerificaCodigoActual() {
        String secreto = totp.generarSecreto();
        assertNotNull(secreto);
        String codigo = totp.generarCodigoActual(secreto);
        assertTrue(codigo.matches("\\d{6}"));
        assertTrue(totp.verificar(secreto, codigo));
    }

    @Test
    void rechazaCodigoInvalido() {
        String secreto = totp.generarSecreto();
        assertFalse(totp.verificar(secreto, "abcdef"));
        assertFalse(totp.verificar(secreto, "12345"));
        assertFalse(totp.verificar(secreto, null));
        assertFalse(totp.verificar(null, "123456"));
    }

    @Test
    void verificarPasoDevuelveLaVentanaDelCodigo() {
        String secreto = totp.generarSecreto();
        String codigo = totp.generarCodigoActual(secreto);

        long paso = totp.verificarPaso(secreto, codigo);

        assertTrue(paso >= 0, "un código válido debe devolver su ventana TOTP");
        assertTrue(totp.verificar(secreto, codigo));
    }

    @Test
    void verificarPasoRechazaFormatosInvalidos() {
        String secreto = totp.generarSecreto();

        assertEquals(-1, totp.verificarPaso(secreto, "abcdef"));
        assertEquals(-1, totp.verificarPaso(secreto, "12345"));
        assertEquals(-1, totp.verificarPaso(secreto, null));
        assertEquals(-1, totp.verificarPaso(null, "123456"));
    }

    @Test
    void laUrlOtpauthEsValida() {
        String secreto = totp.generarSecreto();
        String url = totp.otpauthUrl(secreto, "admin@test.local", "HelpDesk PRO");
        assertTrue(url.startsWith("otpauth://totp/"));
        assertTrue(url.contains("secret=" + secreto));
        assertTrue(url.contains("issuer=HelpDesk"));
    }
}
