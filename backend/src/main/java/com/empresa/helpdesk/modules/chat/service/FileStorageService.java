package com.empresa.helpdesk.modules.chat.service;

import com.empresa.helpdesk.modules.chat.entity.FileAttachment;
import com.empresa.helpdesk.modules.chat.entity.Message;
import com.empresa.helpdesk.modules.chat.repository.FileAttachmentRepository;
import com.empresa.helpdesk.modules.ticket.entity.Ticket;
import com.empresa.helpdesk.modules.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FileStorageService {

    private final FileAttachmentRepository fileAttachmentRepository;

    @Value("${app.file.upload-dir}")
    private String uploadDir;

    public FileAttachment storeFile(MultipartFile file, Ticket ticket, User user, Message message) {
        // Normalizar nombre
        String originalFileName = StringUtils.cleanPath(file.getOriginalFilename() != null ? file.getOriginalFilename() : "archivo_desconocido");
        
        try {
            // Validar que no contenga caracteres inválidos
            if (originalFileName.contains("..")) {
                throw new RuntimeException("El archivo contiene una secuencia de path inválida: " + originalFileName);
            }

            // Crear directorio si no existe
            Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
            Files.createDirectories(uploadPath);

            // Generar un nombre único para almacenamiento
            String extension = "";
            int i = originalFileName.lastIndexOf('.');
            if (i > 0) {
                extension = originalFileName.substring(i);
            }
            String savedFileName = UUID.randomUUID().toString() + extension;
            
            // Copiar el archivo
            Path targetLocation = uploadPath.resolve(savedFileName);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            // Generar URL para descarga/visualización
            String fileDownloadUri = ServletUriComponentsBuilder.fromCurrentContextPath()
                    .path("/api/v1/tickets/attachments/")
                    .path(savedFileName)
                    .toUriString();

            // Guardar en Base de Datos
            FileAttachment attachment = FileAttachment.builder()
                    .nombreOriginal(originalFileName)
                    .nombreGuardado(savedFileName)
                    .tipoArchivo(file.getContentType())
                    .tamano(file.getSize())
                    .urlArchivo(fileDownloadUri)
                    .ticket(ticket)
                    .usuario(user)
                    .mensaje(message)
                    .build();

            return fileAttachmentRepository.save(attachment);
            
        } catch (IOException ex) {
            throw new RuntimeException("No se pudo almacenar el archivo " + originalFileName + ". Por favor, intenta de nuevo.", ex);
        }
    }
}
