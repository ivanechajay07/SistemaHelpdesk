package com.empresa.helpdesk.security.upload;

/** Error de validación de un archivo subido (contenido, tamaño o tipo no permitido). */
public class UploadValidationException extends RuntimeException {
    public UploadValidationException(String message) {
        super(message);
    }
}
