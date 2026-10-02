package com.empresa.helpdesk.modules.user.service;

import com.empresa.helpdesk.modules.user.dto.ProfileUpdateRequest;
import com.empresa.helpdesk.modules.user.dto.UserRequest;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.empresa.helpdesk.modules.user.dto.UserResponse;
import com.empresa.helpdesk.modules.user.dto.UserSummaryResponse;
import com.empresa.helpdesk.modules.user.entity.Role;
import com.empresa.helpdesk.modules.user.entity.User;
import com.empresa.helpdesk.modules.user.repository.RoleRepository;
import com.empresa.helpdesk.modules.user.repository.UserRepository;
import com.empresa.helpdesk.modules.notification.service.EmailService;
import com.empresa.helpdesk.modules.audit.service.AuditService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Optional;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    @Value("${app.file.upload-dir:./uploads}")
    private String uploadDir;

    private static final long MAX_AVATAR_BYTES = 2L * 1024 * 1024;
    private static final List<String> AVATAR_EXT = List.of("png", "jpg", "jpeg", "webp");

    public record AvatarResource(Path path, MediaType mediaType) {}

    @Transactional(readOnly = true)
    public Page<UserResponse> getAllUsers(Pageable pageable) {
        return userRepository.findAll(pageable).map(this::mapToResponse);
    }
    
    @Transactional(readOnly = true)
    public List<UserSummaryResponse> getUsersByRole(String roleName) {
        return userRepository.findByRoles_Name(roleName).stream()
                .map(this::mapToSummary)
                .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public UserResponse getUserById(Long id) {
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        return mapToResponse(user);
    }

    @Transactional
    public UserResponse createUser(UserRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("El nombre de usuario ya está en uso");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("El correo ya está en uso");
        }
        if (request.getPassword() == null || request.getPassword().isBlank()) {
            throw new RuntimeException("La contraseña es requerida para crear el usuario");
        }

        Set<Role> roles = new HashSet<>();
        if (request.getRoleIds() != null && !request.getRoleIds().isEmpty()) {
            for (Long roleId : request.getRoleIds()) {
                Role role = roleRepository.findById(roleId).orElseThrow(() -> new RuntimeException("Rol no encontrado"));
                roles.add(role);
            }
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .nombre(request.getNombre())
                .apellidos(request.getApellidos())
                .telefono(request.getTelefono())
                .direccion(request.getDireccion())
                .activo(request.isActivo())
                .roles(roles)
                .build();

        User saved = userRepository.save(user);
        auditService.registrar("CREAR_USUARIO", "USUARIO", saved.getId(), saved.getUsername());

        return mapToResponse(saved);
    }

    @Transactional
    public UserResponse updateUser(Long id, UserRequest request) {
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        boolean wasActive = user.isActivo();

        if (!user.getUsername().equals(request.getUsername()) && userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("El nombre de usuario ya está en uso");
        }
        if (!user.getEmail().equals(request.getEmail()) && userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("El correo ya está en uso");
        }

        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setNombre(request.getNombre());
        user.setApellidos(request.getApellidos());
        user.setTelefono(request.getTelefono());
        user.setDireccion(request.getDireccion());
        user.setActivo(request.isActivo());

        if (request.getPassword() != null && !request.getPassword().isEmpty()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        if (request.getRoleIds() != null) {
            if (request.getRoleIds().isEmpty()) {
                throw new RuntimeException("Debe asignar al menos un rol al usuario");
            }
            Set<Role> roles = new HashSet<>();
            for (Long roleId : request.getRoleIds()) {
                Role role = roleRepository.findById(roleId).orElseThrow(() -> new RuntimeException("Rol no encontrado"));
                roles.add(role);
            }
            user.setRoles(roles);
        }

        User saved = userRepository.save(user);

        // Si el administrador activó la cuenta, notificar al usuario por correo
        if (!wasActive && saved.isActivo()) {
            try {
                emailService.sendAccountActivatedEmail(saved.getEmail(), saved.getNombre());
            } catch (Exception e) {
                log.error("Error enviando correo de cuenta activada a {}: {}", saved.getEmail(), e.getMessage());
            }
        }

        auditService.registrar(wasActive ? "EDITAR_USUARIO" : "ACTIVAR_USUARIO", "USUARIO", saved.getId(), saved.getUsername());

        return mapToResponse(saved);
    }

    /** Actualiza el perfil del usuario autenticado (nombre, apellidos, email, teléfono, dirección). */
    @Transactional
    public UserResponse updateMyProfile(ProfileUpdateRequest request) {
        String principal = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsernameOrEmail(principal, principal)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        if (!user.getEmail().equalsIgnoreCase(request.getEmail())
                && userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("El correo ya está en uso por otro usuario");
        }

        user.setNombre(request.getNombre());
        user.setApellidos(request.getApellidos());
        user.setEmail(request.getEmail());
        user.setTelefono(request.getTelefono());
        user.setDireccion(request.getDireccion());

        User saved = userRepository.save(user);
        auditService.registrar("EDITAR_PERFIL", "USUARIO", saved.getId(), saved.getUsername());
        return mapToResponse(saved);
    }

    /** Preferencias de notificación del usuario autenticado. */
    @Transactional(readOnly = true)
    public Map<String, Boolean> getNotificationPreferences() {
        User user = getAuthenticatedUser();
        if (user.getNotificationPrefs() == null || user.getNotificationPrefs().isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(user.getNotificationPrefs(), new TypeReference<Map<String, Boolean>>() {});
        } catch (Exception e) {
            return Map.of();
        }
    }

    /** Guarda las preferencias de notificación del usuario autenticado. */
    @Transactional
    public Map<String, Boolean> updateNotificationPreferences(Map<String, Boolean> preferences) {
        User user = getAuthenticatedUser();
        Map<String, Boolean> prefs = preferences != null ? preferences : Map.of();
        try {
            user.setNotificationPrefs(objectMapper.writeValueAsString(prefs));
        } catch (Exception e) {
            throw new RuntimeException("No se pudieron guardar las preferencias de notificación");
        }
        userRepository.save(user);
        return prefs;
    }

    /** Guarda la foto de perfil del usuario autenticado (PNG/JPG/WebP, máx. 2 MB). */
    @Transactional
    public UserResponse guardarAvatar(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new RuntimeException("El archivo está vacío");
        }
        if (file.getSize() > MAX_AVATAR_BYTES) {
            throw new RuntimeException("La imagen no debe superar 2 MB");
        }
        String ext = StringUtils.getFilenameExtension(file.getOriginalFilename());
        ext = ext != null ? ext.toLowerCase() : "";
        if (!AVATAR_EXT.contains(ext)) {
            throw new RuntimeException("Formato no permitido. Usa PNG, JPG o WebP");
        }

        User user = getAuthenticatedUser();
        try {
            Path dir = Paths.get(uploadDir, "avatars").toAbsolutePath().normalize();
            Files.createDirectories(dir);
            for (String e : AVATAR_EXT) {
                Files.deleteIfExists(dir.resolve(user.getId() + "." + e));
            }
            Path target = dir.resolve(user.getId() + "." + ext).normalize();
            if (!target.startsWith(dir)) {
                throw new RuntimeException("Ruta no válida");
            }
            try (InputStream in = file.getInputStream()) {
                Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
            }
            user.setAvatarUrl(user.getId() + "." + ext);
            userRepository.save(user);
            auditService.registrar("EDITAR_AVATAR", "USUARIO", user.getId(), user.getUsername());
            return mapToResponse(user);
        } catch (IOException e) {
            throw new RuntimeException("No se pudo guardar la foto de perfil");
        }
    }

    /** Elimina la foto de perfil del usuario autenticado. */
    @Transactional
    public void eliminarAvatar() {
        User user = getAuthenticatedUser();
        try {
            Path dir = Paths.get(uploadDir, "avatars").toAbsolutePath().normalize();
            for (String e : AVATAR_EXT) {
                Files.deleteIfExists(dir.resolve(user.getId() + "." + e));
            }
        } catch (IOException ignored) {
            // si no se puede borrar el archivo, igual se limpia la referencia
        }
        user.setAvatarUrl(null);
        userRepository.save(user);
        auditService.registrar("ELIMINAR_AVATAR", "USUARIO", user.getId(), user.getUsername());
    }

    /** Devuelve el archivo de avatar de un usuario (si existe). */
    @Transactional(readOnly = true)
    public Optional<AvatarResource> obtenerAvatar(Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null || user.getAvatarUrl() == null || user.getAvatarUrl().isBlank()) {
            return Optional.empty();
        }
        Path dir = Paths.get(uploadDir, "avatars").toAbsolutePath().normalize();
        Path file = dir.resolve(user.getAvatarUrl()).normalize();
        if (!file.startsWith(dir) || !Files.exists(file) || !Files.isReadable(file)) {
            return Optional.empty();
        }
        String ext = StringUtils.getFilenameExtension(user.getAvatarUrl());
        MediaType type = switch (ext != null ? ext.toLowerCase() : "") {
            case "png" -> MediaType.IMAGE_PNG;
            case "webp" -> MediaType.parseMediaType("image/webp");
            default -> MediaType.IMAGE_JPEG;
        };
        return Optional.of(new AvatarResource(file, type));
    }

    private User getAuthenticatedUser() {
        String principal = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsernameOrEmail(principal, principal)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
    }

    @Transactional
    public void deleteUser(Long id) {
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        // No permitir que un usuario se elimine a sí mismo
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getName() != null
                && (auth.getName().equalsIgnoreCase(user.getUsername())
                    || auth.getName().equalsIgnoreCase(user.getEmail()))) {
            throw new RuntimeException("No puedes eliminar tu propia cuenta");
        }

        // Proteger al último administrador del sistema
        boolean esAdmin = user.getRoles().stream().anyMatch(r -> "ADMIN".equals(r.getName()));
        if (esAdmin && userRepository.findByRoles_Name("ADMIN").size() <= 1) {
            throw new RuntimeException("No puedes eliminar al último administrador del sistema");
        }

        userRepository.delete(user);
        auditService.registrar("ELIMINAR_USUARIO", "USUARIO", id, user.getUsername());
    }

    @Transactional
    public UserResponse activateUser(Long id) {
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        if (user.isActivo()) {
            throw new RuntimeException("La cuenta ya está activa");
        }
        user.setActivo(true);
        User saved = userRepository.save(user);
        try {
            emailService.sendAccountActivatedEmail(saved.getEmail(), saved.getNombre());
        } catch (Exception e) {
            log.error("Error enviando correo de cuenta activada a {}: {}", saved.getEmail(), e.getMessage());
        }
        auditService.registrar("ACTIVAR_USUARIO", "USUARIO", saved.getId(), saved.getUsername());
        return mapToResponse(saved);
    }

    @Transactional
    public void rejectUser(Long id) {
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        if (user.isActivo()) {
            throw new RuntimeException("No se puede rechazar una cuenta que ya fue activada");
        }
        try {
            emailService.sendAccountRejectedEmail(user.getEmail(), user.getNombre());
        } catch (Exception e) {
            log.error("Error enviando correo de rechazo a {}: {}", user.getEmail(), e.getMessage());
        }
        userRepository.delete(user);
        auditService.registrar("RECHAZAR_USUARIO", "USUARIO", id, user.getUsername() + " (" + user.getEmail() + ")");
    }

    private UserResponse mapToResponse(User user) {
        List<String> roleNames = user.getRoles().stream()
                .map(Role::getName)
                .collect(Collectors.toList());

        return UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .nombre(user.getNombre())
                .apellidos(user.getApellidos())
                .telefono(user.getTelefono())
                .direccion(user.getDireccion())
                .activo(user.isActivo())
                .roles(roleNames)
                .ultimaConexion(user.getLastActivity() != null ? user.getLastActivity() : user.getLastLogin())
                .estadoConexion(computeEstadoConexion(user))
                .dispositivoTipo(user.getDispositivoTipo())
                .dispositivoModelo(user.getDispositivoModelo())
                .dispositivoSo(user.getDispositivoSo())
                .navegador(user.getNavegador())
                .ipUltima(user.getIpUltima())
                .avatarUrl(user.getAvatarUrl() != null ? "/api/v1/users/" + user.getId() + "/avatar" : null)
                .build();
    }

    private UserSummaryResponse mapToSummary(User user) {
        return UserSummaryResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .nombre(user.getNombre())
                .apellidos(user.getApellidos())
                .build();
    }

    private String computeEstadoConexion(User user) {
        if (!user.isActivo()) {
            return "DESCONECTADO";
        }
        java.time.LocalDateTime last = user.getLastActivity() != null ? user.getLastActivity() : user.getLastLogin();
        if (last == null) {
            return "DESCONECTADO";
        }
        java.time.Duration since = java.time.Duration.between(last, java.time.LocalDateTime.now());
        if (since.toMinutes() <= 5) {
            return "CONECTADO";
        }
        if (since.toMinutes() <= 15) {
            return "AUSENTE";
        }
        return "DESCONECTADO";
    }
}
