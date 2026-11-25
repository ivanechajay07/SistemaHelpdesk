package com.empresa.helpdesk.modules.push.service;

import com.empresa.helpdesk.modules.push.entity.PushDeviceToken;
import com.empresa.helpdesk.modules.push.repository.PushDeviceTokenRepository;
import com.empresa.helpdesk.modules.user.entity.User;
import com.empresa.helpdesk.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Registro de dispositivos y envío de notificaciones push.
 *
 * <p>El envío es asíncrono y silencioso: si FCM no está configurado, la
 * aplicación sigue funcionando sin notificaciones push.</p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PushService {

    private final PushDeviceTokenRepository deviceRepository;
    private final UserRepository userRepository;
    private final FcmClient fcmClient;

    @Transactional
    public void registrar(String token, String plataforma) {
        User usuario = usuarioActual();
        String platform = plataforma == null || plataforma.isBlank() ? "android" : plataforma.trim();

        deviceRepository.findByToken(token).ifPresentOrElse(existente -> {
            existente.setUsuario(usuario);
            existente.setPlataforma(platform);
            existente.setActualizadoEn(LocalDateTime.now());
            deviceRepository.save(existente);
        }, () -> deviceRepository.save(PushDeviceToken.builder()
                .usuario(usuario)
                .token(token)
                .plataforma(platform)
                .actualizadoEn(LocalDateTime.now())
                .build()));

        log.debug("Token push registrado para el usuario {}", usuario.getUsername());
    }

    @Transactional
    public void eliminar(String token) {
        if (token == null || token.isBlank()) {
            return;
        }
        deviceRepository.findByToken(token).ifPresent(deviceRepository::delete);
    }

    /** Push de un mensaje de chat al destinatario (excepto al remitente). */
    @Async
    public void enviarMensajeChat(Long usuarioId, String remitente, String contenido,
                                  String ticketCodigo, Long ticketId) {
        if (!fcmClient.disponible() || usuarioId == null) {
            return;
        }
        String titulo = "Nuevo mensaje de " + (remitente == null || remitente.isBlank() ? "un usuario" : remitente);
        String cuerpo = (ticketCodigo != null ? ticketCodigo + ": " : "") + recortar(contenido, 160);
        enviarATokens(usuarioId, titulo, cuerpo, ticketId, "CHAT");
    }

    /** Push de un evento de ticket (asignación, resolución, etc.) por username. */
    @Async
    public void enviarAUsername(String username, String titulo, String cuerpo, Long ticketId) {
        if (!fcmClient.disponible() || username == null || username.isBlank()) {
            return;
        }
        userRepository.findByUsernameOrEmail(username, username)
                .ifPresent(usuario -> enviarATokens(usuario.getId(), titulo, recortar(cuerpo, 160), ticketId, "TICKET"));
    }

    private void enviarATokens(Long usuarioId, String titulo, String cuerpo, Long ticketId, String tipo) {
        for (PushDeviceToken device : deviceRepository.findByUsuarioId(usuarioId)) {
            FcmClient.Resultado resultado = fcmClient.enviar(device.getToken(), titulo, cuerpo, ticketId, tipo);
            if (resultado == FcmClient.Resultado.INVALIDO) {
                // Token vencido o app desinstalada: se limpia para no reintentar.
                deviceRepository.delete(device);
            }
        }
    }

    private User usuarioActual() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null) {
            throw new RuntimeException("No autenticado");
        }
        return userRepository.findByUsernameOrEmail(auth.getName(), auth.getName())
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
    }

    private String recortar(String texto, int largo) {
        if (texto == null) {
            return "";
        }
        String limpio = texto.replaceAll("\\s+", " ").trim();
        return limpio.length() > largo ? limpio.substring(0, largo) + "…" : limpio;
    }
}
