package com.empresa.helpdesk.security.upload;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class FileValidationServiceTest {

    private FileValidationService service;

    @BeforeEach
    void setUp() {
        // Sin CLAMAV_HOST configurado, el escáner se omite.
        service = new FileValidationService(new MalwareScanner());
    }

    @Test
    void aceptaUnaImagenPngReal() throws Exception {
        byte[] png = png();

        var resultado = service.validar(
                archivo("foto.png", png), Set.of("png"), 2_000_000);

        assertEquals("png", resultado.extension());
        assertEquals("image/png", resultado.contentType());
        assertEquals(png.length, resultado.size());
    }

    @Test
    void rechazaUnaExtensionQueNoCoincideConElContenido() {
        MockMultipartFile falso = archivo("foto.png",
                "<?php echo 'malicioso'; ?>".getBytes(StandardCharsets.UTF_8));

        assertThrows(UploadValidationException.class,
                () -> service.validar(falso, Set.of("png"), 2_000_000));
    }

    @Test
    void rechazaExtensionesNoPermitidas() throws Exception {
        assertThrows(UploadValidationException.class,
                () -> service.validar(archivo("script.exe", png()), Set.of("png"), 2_000_000));
    }

    @Test
    void rechazaArchivosQueSuperanElTamano() throws Exception {
        assertThrows(UploadValidationException.class,
                () -> service.validar(archivo("foto.png", png()), Set.of("png"), 10));
    }

    @Test
    void aceptaPdfYDocumentosOffice() {
        var pdf = service.validar(
                archivo("informe.pdf", "%PDF-1.7\ncontenido".getBytes(StandardCharsets.UTF_8)),
                Set.of("pdf"), 1_000_000);
        assertEquals("application/pdf", pdf.contentType());

        byte[] docx = new byte[]{0x50, 0x4B, 0x03, 0x04, 0, 0, 0, 0};
        var office = service.validar(archivo("reporte.docx", docx), Set.of("docx"), 1_000_000);
        assertEquals("application/zip", office.contentType());
    }

    @Test
    void unZipRenombradoADocSeRechaza() {
        byte[] zip = new byte[]{0x50, 0x4B, 0x03, 0x04, 0, 0, 0, 0};

        assertThrows(UploadValidationException.class,
                () -> service.validar(archivo("reporte.doc", zip), Set.of("doc"), 1_000_000));
    }

    @Test
    void validaImagenesEnDataUrl() throws Exception {
        String dataUrl = "data:image/png;base64,"
                + Base64.getEncoder().encodeToString(png());

        var resultado = service.validarImagenDataUrl(dataUrl, 2_000_000);

        assertEquals("png", resultado.mimeType());
        assertTrue(resultado.dataUrl().startsWith("data:image/png;base64,"));
    }

    @Test
    void rechazaDataUrlQueNoEsImagen() {
        String dataUrl = "data:text/html;base64,"
                + Base64.getEncoder().encodeToString("<script>alert(1)</script>".getBytes(StandardCharsets.UTF_8));

        assertThrows(UploadValidationException.class,
                () -> service.validarImagenDataUrl(dataUrl, 2_000_000));
    }

    @Test
    void rechazaDataUrlConContenidoFalso() {
        String dataUrl = "data:image/png;base64,"
                + Base64.getEncoder().encodeToString("no soy una imagen".getBytes(StandardCharsets.UTF_8));

        assertThrows(UploadValidationException.class,
                () -> service.validarImagenDataUrl(dataUrl, 2_000_000));
    }

    @Test
    void rechazaImagenesConDimensionesExcesivas() throws Exception {
        // Cabecera PNG con dimensiones 100000x100000 (bomba de descompresión).
        byte[] png = png();
        png[16] = (byte) 0x86;
        png[17] = (byte) 0xA0;
        png[18] = 0x01;
        png[19] = 0x00;
        png[20] = (byte) 0x86;
        png[21] = (byte) 0xA0;
        png[22] = 0x01;
        png[23] = 0x00;

        assertThrows(UploadValidationException.class,
                () -> service.validar(archivo("grande.png", png), Set.of("png"), 2_000_000));
    }

    private MockMultipartFile archivo(String nombre, byte[] contenido) {
        return new MockMultipartFile("file", nombre, null, contenido);
    }

    private byte[] png() throws Exception {
        BufferedImage imagen = new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(imagen, "png", out);
        return out.toByteArray();
    }
}
