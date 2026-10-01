package com.empresa.helpdesk.modules.chat.controller;

import com.empresa.helpdesk.modules.chat.service.AttachmentLinkService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Entrega adjuntos del chat mediante enlaces firmados y con expiración.
 * El acceso no requiere cabecera Authorization (el enlace se abre directamente
 * en el navegador), pero exige una firma HMAC válida emitida por el servidor.
 */
@RestController
@RequestMapping("/api/v1/chat/attachments")
@RequiredArgsConstructor
public class AttachmentController {

    private final AttachmentLinkService linkService;

    @GetMapping("/{filename}")
    public ResponseEntity<Resource> download(
            @PathVariable String filename,
            @RequestParam long exp,
            @RequestParam String sig) {

        if (!linkService.verificar(filename, exp, sig)) {
            return ResponseEntity.status(403).build();
        }

        Path uploadDir = Paths.get("uploads").toAbsolutePath().normalize();
        Path file = uploadDir.resolve(filename).normalize();

        // Defensa contra path traversal
        if (!file.startsWith(uploadDir)) {
            return ResponseEntity.badRequest().build();
        }

        Resource resource = new FileSystemResource(file);
        if (!resource.exists() || !resource.isReadable()) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .body(resource);
    }
}
