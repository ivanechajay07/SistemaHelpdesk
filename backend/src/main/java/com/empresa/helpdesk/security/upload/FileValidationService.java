package com.empresa.helpdesk.security.upload;

import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.Paths;
import java.util.Base64;
import java.util.Iterator;
import java.util.Locale;
import java.util.Set;

/**
 * Validación de archivos por contenido real (magic bytes), no solo por extensión.
 *
 * <p>Comprueba tamaño, extensión permitida, firma binaria, que las imágenes se
 * puedan decodificar y que sus dimensiones no permitan bombas de descompresión.
 * El nombre devuelto ya viene saneado para almacenarse.</p>
 */
@Service
public class FileValidationService {

    /** 50 MP: evita imágenes desproporcionadas (decompression bombs). */
    private static final long MAX_PIXELES = 50_000_000L;

    public enum FileType {
        JPEG, PNG, GIF, WEBP, PDF, ZIP, OLE, TEXT, UNKNOWN
    }

    public record ValidatedFile(String nombreSeguro, String extension, String contentType,
                                long size, byte[] content) {
    }

    public record ValidatedDataUrl(String dataUrl, String mimeType, long size) {
    }

    private final MalwareScanner malwareScanner;

    public FileValidationService(MalwareScanner malwareScanner) {
        this.malwareScanner = malwareScanner;
    }

    public ValidatedFile validar(MultipartFile file, Set<String> extensionesPermitidas, long maxBytes) {
        if (file == null || file.isEmpty()) {
            throw new UploadValidationException("El archivo está vacío.");
        }
        if (file.getSize() > maxBytes) {
            throw new UploadValidationException(
                    "El archivo supera el tamaño máximo permitido (" + (maxBytes / (1024 * 1024)) + " MB).");
        }

        String original = file.getOriginalFilename() != null ? file.getOriginalFilename() : "archivo";
        String base = Paths.get(StringUtils.cleanPath(original)).getFileName().toString();
        base = base.replaceAll("[^A-Za-z0-9._-]", "_");
        if (base.isBlank() || ".".equals(base) || "..".equals(base)) {
            throw new UploadValidationException("Nombre de archivo no válido.");
        }

        String extension = StringUtils.getFilenameExtension(base);
        extension = extension != null ? extension.toLowerCase(Locale.ROOT) : "";
        Set<String> permitidas = extensionesPermitidas.stream()
                .map(e -> e.toLowerCase(Locale.ROOT))
                .collect(java.util.stream.Collectors.toSet());
        if (extension.isBlank() || !permitidas.contains(extension)) {
            throw new UploadValidationException("Tipo de archivo no permitido.");
        }

        byte[] contenido;
        try {
            contenido = file.getBytes();
        } catch (IOException e) {
            throw new UploadValidationException("No se pudo leer el archivo.");
        }
        if (contenido.length == 0 || contenido.length > maxBytes) {
            throw new UploadValidationException("El archivo tiene un tamaño no válido.");
        }

        FileType real = detectarTipo(contenido);
        FileType esperado = tipoEsperado(extension);
        if (esperado == FileType.UNKNOWN || real != esperado) {
            throw new UploadValidationException(
                    "El contenido del archivo no coincide con el tipo declarado.");
        }
        if (real == FileType.TEXT && !esTextoPlanoSeguro(contenido)) {
            throw new UploadValidationException("El archivo de texto contiene caracteres no permitidos.");
        }
        if (esImagen(real)) {
            validarDimensiones(contenido);
        }

        malwareScanner.escanear(contenido, base);

        return new ValidatedFile(base, extension, contentType(real, extension), contenido.length, contenido);
    }

    /**
     * Valida una imagen enviada como data URL (evidencias y firmas en JSON).
     * Devuelve la data URL normalizada o lanza {@link UploadValidationException}.
     */
    public ValidatedDataUrl validarImagenDataUrl(String dataUrl, long maxBytes) {
        if (dataUrl == null || dataUrl.isBlank()) {
            throw new UploadValidationException("La imagen es obligatoria.");
        }
        String valor = dataUrl.trim();
        if (!valor.startsWith("data:image/")) {
            throw new UploadValidationException("La imagen debe enviarse como data URL de imagen.");
        }
        int coma = valor.indexOf(',');
        if (coma < 0) {
            throw new UploadValidationException("La imagen tiene un formato inválido.");
        }
        String meta = valor.substring("data:image/".length(), coma); // png;base64
        if (!meta.toLowerCase(Locale.ROOT).endsWith(";base64") || !meta.contains(";")) {
            throw new UploadValidationException("La imagen debe estar codificada en base64.");
        }
        String mime = meta.substring(0, meta.indexOf(';')).toLowerCase(Locale.ROOT);
        FileType esperado = switch (mime) {
            case "png" -> FileType.PNG;
            case "jpeg", "jpg" -> FileType.JPEG;
            case "gif" -> FileType.GIF;
            case "webp" -> FileType.WEBP;
            default -> FileType.UNKNOWN;
        };
        if (esperado == FileType.UNKNOWN) {
            throw new UploadValidationException("Formato de imagen no permitido (usa PNG, JPG, GIF o WebP).");
        }

        String base64 = valor.substring(coma + 1);
        // Estimación rápida antes de decodificar para evitar consumo de memoria.
        if (base64.length() > (maxBytes * 4L / 3L) + 16L) {
            throw new UploadValidationException("La imagen supera el tamaño máximo permitido.");
        }

        byte[] contenido;
        try {
            contenido = Base64.getDecoder().decode(base64);
        } catch (IllegalArgumentException e) {
            throw new UploadValidationException("La imagen no es un base64 válido.");
        }
        if (contenido.length == 0 || contenido.length > maxBytes) {
            throw new UploadValidationException("La imagen supera el tamaño máximo permitido.");
        }
        if (detectarTipo(contenido) != esperado) {
            throw new UploadValidationException("El contenido de la imagen no coincide con su tipo.");
        }
        validarDimensiones(contenido);
        if (esperado != FileType.WEBP) {
            malwareScanner.escanear(contenido, "imagen." + mime);
        }

        String normalizada = "data:image/" + ("jpg".equals(mime) ? "jpeg" : mime)
                + ";base64," + Base64.getEncoder().encodeToString(contenido);
        return new ValidatedDataUrl(normalizada, mime, contenido.length);
    }

    private FileType detectarTipo(byte[] b) {
        if (b.length >= 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) {
            return FileType.JPEG;
        }
        if (b.length >= 8 && (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G'
                && b[4] == 0x0D && b[5] == 0x0A && b[6] == 0x1A && b[7] == 0x0A) {
            return FileType.PNG;
        }
        if (b.length >= 6 && b[0] == 'G' && b[1] == 'I' && b[2] == 'F' && b[3] == '8'
                && (b[4] == '7' || b[4] == '9') && b[5] == 'a') {
            return FileType.GIF;
        }
        if (b.length >= 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
                && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') {
            return FileType.WEBP;
        }
        if (b.length >= 5 && b[0] == '%' && b[1] == 'P' && b[2] == 'D' && b[3] == 'F' && b[4] == '-') {
            return FileType.PDF;
        }
        if (b.length >= 4 && b[0] == 'P' && b[1] == 'K'
                && ((b[2] == 3 && b[3] == 4) || (b[2] == 5 && b[3] == 6) || (b[2] == 7 && b[3] == 8))) {
            return FileType.ZIP;
        }
        if (b.length >= 8 && (b[0] & 0xFF) == 0xD0 && (b[1] & 0xFF) == 0xCF
                && (b[2] & 0xFF) == 0x11 && (b[3] & 0xFF) == 0xE0) {
            return FileType.OLE;
        }
        if (esTextoPlanoSeguro(b)) {
            return FileType.TEXT;
        }
        return FileType.UNKNOWN;
    }

    private FileType tipoEsperado(String extension) {
        return switch (extension.toLowerCase(Locale.ROOT)) {
            case "jpg", "jpeg" -> FileType.JPEG;
            case "png" -> FileType.PNG;
            case "gif" -> FileType.GIF;
            case "webp" -> FileType.WEBP;
            case "pdf" -> FileType.PDF;
            case "docx", "xlsx", "zip" -> FileType.ZIP;
            case "doc", "xls" -> FileType.OLE;
            case "txt", "csv" -> FileType.TEXT;
            default -> FileType.UNKNOWN;
        };
    }

    private boolean esImagen(FileType type) {
        return type == FileType.JPEG || type == FileType.PNG
                || type == FileType.GIF || type == FileType.WEBP;
    }

    private String contentType(FileType type, String extension) {
        return switch (type) {
            case JPEG -> "image/jpeg";
            case PNG -> "image/png";
            case GIF -> "image/gif";
            case WEBP -> "image/webp";
            case PDF -> "application/pdf";
            case ZIP -> "application/zip";
            case OLE -> "application/octet-stream";
            case TEXT -> "text/plain";
            default -> "application/octet-stream";
        };
    }

    private boolean esTextoPlanoSeguro(byte[] b) {
        int limite = Math.min(b.length, 8192);
        for (int i = 0; i < limite; i++) {
            int v = b[i] & 0xFF;
            if (v == 0) {
                return false;
            }
            if (v < 0x09 || (v > 0x0D && v < 0x20)) {
                return false;
            }
        }
        return true;
    }

    private void validarDimensiones(byte[] contenido) {
        // El JRE no incluye lector WebP: para ese formato se valida solo la firma.
        if (contenido.length >= 12 && contenido[0] == 'R' && contenido[1] == 'I'
                && contenido[2] == 'F' && contenido[3] == 'F'
                && contenido[8] == 'W' && contenido[9] == 'E'
                && contenido[10] == 'B' && contenido[11] == 'P') {
            return;
        }
        try (ImageInputStream iis = ImageIO.createImageInputStream(new ByteArrayInputStream(contenido))) {
            if (iis == null) {
                throw new UploadValidationException("La imagen no se pudo leer.");
            }
            Iterator<ImageReader> readers = ImageIO.getImageReaders(iis);
            if (!readers.hasNext()) {
                throw new UploadValidationException("La imagen no tiene un formato válido.");
            }
            ImageReader reader = readers.next();
            try {
                reader.setInput(iis, true, true);
                long ancho = reader.getWidth(0);
                long alto = reader.getHeight(0);
                if (ancho <= 0 || alto <= 0 || ancho * alto > MAX_PIXELES) {
                    throw new UploadValidationException("La imagen tiene dimensiones no permitidas.");
                }
            } finally {
                reader.dispose();
            }
        } catch (UploadValidationException e) {
            throw e;
        } catch (Exception e) {
            throw new UploadValidationException("La imagen está dañada o no es válida.");
        }
    }
}
