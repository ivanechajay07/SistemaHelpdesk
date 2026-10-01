package com.empresa.helpdesk.modules.notification.service;

import com.empresa.helpdesk.modules.task.entity.Task;
import com.empresa.helpdesk.modules.ticket.entity.Ticket;
import com.empresa.helpdesk.modules.user.entity.User;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    // Gmail no permite enviar con un From distinto al usuario autenticado por SMTP;
    // si MAIL_USERNAME no está definido se usa el correo del administrador.
    private static final String DEFAULT_FROM = "ivanechajay07@gmail.com";

    private static final String BRAND = "#3b82f6";     // azul corporativo
    private static final String DARK = "#0b1220";      // fondo general del correo
    private static final String CARD = "#0f172a";      // tarjeta principal
    private static final String PANEL = "#1e293b";     // paneles internos
    private static final String TEXT = "#f8fafc";      // texto principal (blanco)
    private static final String SOFT = "#cbd5e1";      // texto secundario
    private static final String MUTED = "#94a3b8";     // texto atenuado
    private static final String BORDER = "#334155";

    private static final String EMAIL_SHELL = """
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta name="color-scheme" content="dark">
          <meta name="supported-color-schemes" content="dark">
          <title>{{TITLE}}</title>
        </head>
        <body style="margin:0;padding:0;background-color:{{DARK}};font-family:Helvetica,Arial,sans-serif;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:{{DARK}};width:100%;">
            <tr>
              <td align="center" style="padding:28px 12px;">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:{{CARD}};border:1px solid {{BORDER}};border-radius:12px;overflow:hidden;">
                  <tr>
                    <td bgcolor="{{PANEL}}" style="background-color:{{PANEL}};padding:22px 32px;text-align:center;">
                      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                        <tr>
                          <td align="center" bgcolor="{{BRAND}}" style="background-color:{{BRAND}};border-radius:8px;width:40px;height:40px;">
                            <span style="color:#ffffff;font-size:18px;font-weight:bold;line-height:40px;">HD</span>
                          </td>
                        </tr>
                      </table>
                      <p style="margin:10px 0 0;color:{{TEXT}};font-size:13px;font-weight:bold;letter-spacing:1.5px;">HELPDESK PRO</p>
                      <p style="margin:2px 0 0;color:{{MUTED}};font-size:11px;">Sistema de Gestión de Soporte Técnico</p>
                    </td>
                  </tr>
                  <tr>
                    <td bgcolor="{{BRAND}}" style="background-color:{{BRAND}};padding:14px 32px;text-align:center;">
                      <h1 style="margin:0;color:#ffffff;font-size:17px;font-weight:bold;">{{TITLE}}</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:28px 32px;background-color:{{CARD}};">
                      {{BODY}}
                    </td>
                  </tr>
                  <tr>
                    <td bgcolor="{{PANEL}}" style="background-color:{{PANEL}};padding:18px 32px;border-top:1px solid {{BORDER}};text-align:center;">
                      <p style="margin:0;color:{{MUTED}};font-size:11px;">HELPDESK PRO · Sistema de Gestión de Soporte Técnico</p>
                      <p style="margin:4px 0 0;color:{{MUTED}};font-size:10px;">Documento generado electrónicamente por el sistema.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
        """.replace("{{DARK}}", DARK).replace("{{BRAND}}", BRAND).replace("{{CARD}}", CARD)
        .replace("{{PANEL}}", PANEL).replace("{{BORDER}}", BORDER)
        .replace("{{TEXT}}", TEXT).replace("{{SOFT}}", SOFT).replace("{{MUTED}}", MUTED);

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String fromEmail;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    private void sendHtmlEmail(String to, String subject, String htmlBody) {
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, "utf-8");
            helper.setText(htmlBody, true);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setFrom(StringUtils.hasText(fromEmail) ? fromEmail : DEFAULT_FROM);
            mailSender.send(mimeMessage);
            log.info("Email enviado exitosamente a {} - Asunto: {}", to, subject);
        } catch (Exception e) {
            log.error("FALLO al enviar correo a {} - Asunto: {} - Verifica la configuracion SMTP (MAIL_USERNAME, MAIL_PASSWORD)", to, subject, e);
            throw new RuntimeException("No se pudo enviar el correo. Verifica la configuración de correo del servidor.", e);
        }
    }

    // ========== Plantilla y bloques reutilizables ==========

    private String buildEmail(String title, String bodyHtml) {
        return EMAIL_SHELL.replace("{{TITLE}}", title).replace("{{BODY}}", bodyHtml);
    }

    private String greeting(String name) {
        return "<p style=\"margin:0 0 14px;color:" + TEXT + ";font-size:15px;\">Estimado(a) <b>" + esc(name) + "</b>,</p>";
    }

    private String paragraph(String text) {
        return "<p style=\"margin:0 0 12px;color:" + SOFT + ";font-size:14px;line-height:1.55;\">" + esc(text) + "</p>";
    }

    private String note(String text) {
        return "<p style=\"margin:16px 0 0;color:" + MUTED + ";font-size:12px;line-height:1.5;\">" + esc(text) + "</p>";
    }

    private String detailsCard(List<String[]> rows) {
        StringBuilder sb = new StringBuilder();
        sb.append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background-color:")
          .append(PANEL).append(";border:1px solid ").append(BORDER)
          .append(";border-radius:8px;margin:18px 0;overflow:hidden;\">");
        sb.append("<tr><td bgcolor=\"").append(PANEL).append("\" style=\"background-color:")
          .append(PANEL).append(";padding:16px 20px;\">");
        for (String[] row : rows) {
            sb.append("<p style=\"margin:6px 0;color:").append(SOFT).append(";font-size:13px;\">")
              .append("<span style=\"color:").append(MUTED).append(";\">").append(esc(row[0])).append(":</span> <b style=\"color:")
              .append(TEXT).append(";\">")
              .append(esc(row[1])).append("</b></p>")
              .append(System.lineSeparator());
        }
        sb.append("</td></tr></table>");
        return sb.toString();
    }

    private String ctaButton(String url, String label) {
        return "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin:22px 0;\">"
                + "<tr><td align=\"center\">"
                + "<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"border-collapse:collapse;\">"
                + "<tr><td align=\"center\" bgcolor=\"" + BRAND + "\" style=\"background-color:" + BRAND + ";border-radius:8px;padding:13px 32px;\">"
                + "<a href=\"" + esc(url) + "\" style=\"display:inline-block;background-color:" + BRAND + ";color:#ffffff;font-size:14px;font-weight:bold;line-height:20px;text-decoration:none;\">"
                + esc(label) + "</a>"
                + "</td></tr></table>"
                + "</td></tr></table>";
    }

    private String noticeBox(String text, boolean isWarning) {
        String bg = isWarning ? "#450a0a" : PANEL;
        String border = isWarning ? "#b91c1c" : BORDER;
        String accent = isWarning ? "#ef4444" : BRAND;
        String color = isWarning ? "#fecaca" : SOFT;
        return "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background-color:" + bg
                + ";border:1px solid " + border + ";border-left:4px solid " + accent + ";border-radius:6px;margin:18px 0;\">"
                + "<tr><td bgcolor=\"" + bg + "\" style=\"background-color:" + bg + ";padding:12px 16px;\">"
                + "<p style=\"margin:0;color:" + color + ";font-size:13px;\">" + esc(text) + "</p>"
                + "</td></tr></table>";
    }

    private String safe(Object value) {
        return value != null ? String.valueOf(value) : "—";
    }

    private String esc(String value) {
        if (value == null) return "";
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }

    // ========== Correos de tickets ==========

    @Async
    public void sendTicketCreatedEmail(String to, Ticket ticket) {
        String card = detailsCard(List.of(
                new String[]{"Código", safe(ticket.getCodigo())},
                new String[]{"Título", safe(ticket.getTitulo())},
                new String[]{"Prioridad", safe(ticket.getPrioridad())},
                new String[]{"Categoría", safe(ticket.getSubcategoria().getCategory().getName() + " / " + ticket.getSubcategoria().getName())}
        ));
        String body = greeting(ticket.getSolicitante().getNombre())
                + paragraph("Su ticket ha sido registrado exitosamente en nuestro sistema. Un técnico lo atenderá a la brevedad.")
                + card
                + note("Puede dar seguimiento a su ticket iniciando sesión en el sistema.");
        sendHtmlEmail(to, "Ticket Registrado: " + ticket.getCodigo(), buildEmail("Nuevo Ticket Registrado", body));
    }

    @Async
    public void sendTicketCreatedAdminNotification(String to, Ticket ticket) {
        String card = detailsCard(List.of(
                new String[]{"Código", safe(ticket.getCodigo())},
                new String[]{"Título", safe(ticket.getTitulo())},
                new String[]{"Solicitante", safe(ticket.getSolicitante().getNombre() + " " + ticket.getSolicitante().getApellidos())},
                new String[]{"Prioridad", safe(ticket.getPrioridad())},
                new String[]{"Categoría", safe(ticket.getSubcategoria().getCategory().getName() + " / " + ticket.getSubcategoria().getName())}
        ));
        String body = greeting("Administrador")
                + paragraph("Se ha generado un nuevo ticket en el sistema y requiere asignación de un técnico.")
                + card
                + note("Ingrese al sistema para asignar un técnico a este ticket.");
        sendHtmlEmail(to, "Nuevo Ticket Generado: " + ticket.getCodigo(), buildEmail("Nuevo Ticket Generado", body));
    }

    @Async
    public void sendTicketAssignmentEmail(String to, Ticket ticket, User tecnico) {
        String card = detailsCard(List.of(
                new String[]{"Código", safe(ticket.getCodigo())},
                new String[]{"Título", safe(ticket.getTitulo())},
                new String[]{"Descripción", safe(ticket.getDescripcion())},
                new String[]{"Prioridad", safe(ticket.getPrioridad())},
                new String[]{"Solicitante", safe(ticket.getSolicitante().getNombre() + " " + ticket.getSolicitante().getApellidos())}
        ));
        String body = greeting(tecnico.getNombre())
                + paragraph("Se le ha asignado un nuevo ticket para su atención.")
                + card
                + note("Ingrese al sistema para atender este ticket.");
        sendHtmlEmail(to, "Ticket Asignado: " + ticket.getCodigo(), buildEmail("Ticket Asignado", body));
    }

    /**
     * Notifica al cliente (solicitante) que su ticket ya tiene un técnico asignado.
     * A partir de este momento el cliente puede abrir el detalle del ticket.
     */
    @Async
    public void sendTicketAssignedToClientEmail(String to, Ticket ticket, User tecnico) {
        String nombreTecnico = tecnico.getNombre() + " " + tecnico.getApellidos();
        String card = detailsCard(List.of(
                new String[]{"Código", safe(ticket.getCodigo())},
                new String[]{"Título", safe(ticket.getTitulo())},
                new String[]{"Técnico asignado", safe(nombreTecnico)},
                new String[]{"Prioridad", safe(ticket.getPrioridad())}
        ));
        String body = greeting(ticket.getSolicitante().getNombre())
                + paragraph("Su ticket ya tiene un técnico asignado. " + nombreTecnico
                        + " será quien se encargue de atender su solicitud.")
                + card
                + note("Ya puede ingresar al sistema para ver el detalle de su ticket y conversar con el técnico.");
        sendHtmlEmail(to, "Técnico Asignado a tu Ticket: " + ticket.getCodigo(), buildEmail("Ticket Asignado", body));
    }

    @Async
    public void sendTicketResolvedEmail(String to, Ticket ticket, String resolucion) {
        String card = detailsCard(List.of(
                new String[]{"Código", safe(ticket.getCodigo())},
                new String[]{"Título", safe(ticket.getTitulo())},
                new String[]{"Solución aplicada", safe(resolucion)}
        ));
        String body = greeting(ticket.getSolicitante().getNombre())
                + paragraph("El técnico ha marcado su ticket como resuelto.")
                + noticeBox("Por favor ingrese al sistema y confirme si la solución fue correcta.", false)
                + card
                + note("Al confirmar la solución, el ticket se cerrará definitivamente.");
        sendHtmlEmail(to, "Confirma la solución de tu Ticket: " + ticket.getCodigo(), buildEmail("Ticket Resuelto", body));
    }

    @Async
    public void sendTicketConfirmedAdminNotification(String to, Ticket ticket) {
        String card = detailsCard(List.of(
                new String[]{"Código", safe(ticket.getCodigo())},
                new String[]{"Título", safe(ticket.getTitulo())},
                new String[]{"Solicitante", safe(ticket.getSolicitante().getNombre() + " " + ticket.getSolicitante().getApellidos())},
                new String[]{"Técnico asignado", safe(ticket.getTecnico() != null
                        ? ticket.getTecnico().getNombre() + " " + ticket.getTecnico().getApellidos()
                        : "Sin asignar")},
                new String[]{"Estado final", "CERRADO"}
        ));
        String body = greeting("Administrador")
                + paragraph("El cliente confirmó que su ticket fue resuelto satisfactoriamente y este ha sido cerrado.")
                + card
                + note("Este ticket completó todo su ciclo de vida exitosamente.");
        sendHtmlEmail(to, "Solución Confirmada por el Cliente: " + ticket.getCodigo(), buildEmail("Solución Confirmada", body));
    }

    // ========== Correos de tareas ==========

    @Async
    public void sendTaskAssignedEmail(String to, Task task, User tecnico) {
        String creador = task.getCreador() != null
                ? task.getCreador().getNombre() + " " + task.getCreador().getApellidos()
                : "Sistema";
        String descripcion = task.getDescripcion() != null && !task.getDescripcion().isBlank()
                ? task.getDescripcion()
                : "Sin descripción";
        String card = detailsCard(List.of(
                new String[]{"Título", safe(task.getTitulo())},
                new String[]{"Descripción", safe(descripcion)},
                new String[]{"Prioridad", safe(task.getPrioridad())},
                new String[]{"Periodo", safe(task.getFechaInicio()) + " al " + safe(task.getFechaFin())},
                new String[]{"Asignada por", safe(creador)}
        ));
        String body = greeting(tecnico.getNombre())
                + paragraph("Se le ha asignado una nueva tarea en el gestor de tareas. Ingrese al sistema para revisarla y marcar su avance.")
                + card
                + note("Recuerde actualizar el estado de la tarea (En proceso / Completada) desde el Gestor de Tareas.");
        sendHtmlEmail(to, "Nueva Tarea Asignada: " + task.getTitulo(), buildEmail("Nueva Tarea Asignada", body));
    }

    // ========== Correos de contraseña ==========

    public void sendPasswordResetEmail(String to, String nombre, String token) {
        String resetUrl = frontendUrl + "/reset-password?token=" + token;
        String body = greeting(nombre)
                + paragraph("Recibimos una solicitud para restablecer su contraseña. Haga clic en el botón de abajo para crear una nueva.")
                + ctaButton(resetUrl, "Restablecer Mi Contraseña")
                + note("Si no solicitó este cambio, puede ignorar este correo. Su contraseña permanecerá igual. Este enlace expirará en 24 horas.");
        sendHtmlEmail(to, "Restablece tu contraseña - HelpDeskPRO", buildEmail("Restablecer Contraseña", body));
    }

    public void sendPasswordChangedConfirmation(String to, String nombre) {
        String body = greeting(nombre)
                + paragraph("Su contraseña ha sido restablecida exitosamente.")
                + noticeBox("Ya puede iniciar sesión con su nueva contraseña.", false)
                + note("Si no realizó este cambio, contacte al administrador de inmediato.");
        sendHtmlEmail(to, "Contraseña Restablecida - HelpDeskPRO", buildEmail("Contraseña Restablecida", body));
    }

    @Async
    public void sendPasswordChangedAdminNotification(String to, String adminNombre, String usuarioNombre, String usuarioEmail) {
        String card = detailsCard(List.of(
                new String[]{"Usuario", safe(usuarioNombre)},
                new String[]{"Email", safe(usuarioEmail)},
                new String[]{"Estado", "Completado"}
        ));
        String body = greeting(adminNombre)
                + paragraph("Un usuario ha restablecido su contraseña exitosamente.")
                + card
                + note("Esta acción fue realizada mediante el enlace de restablecimiento.");
        sendHtmlEmail(to, "Notificación: Contraseña Cambiada - HelpDeskPRO", buildEmail("Contraseña Cambiada", body));
    }

    // ========== Correos de cuenta ==========

    @Async
    public void sendAccountActivatedEmail(String to, String nombre) {
        String loginUrl = frontendUrl + "/login";
        String body = greeting(nombre)
                + paragraph("El administrador ha aprobado y activado su cuenta. Ya puede acceder al sistema con su usuario y contraseña.")
                + ctaButton(loginUrl, "Iniciar Sesión")
                + note("Si no creó esta cuenta, puede ignorar este mensaje.");
        sendHtmlEmail(to, "Cuenta Activada - HelpDeskPRO", buildEmail("Cuenta Activada", body));
    }

    @Async
    public void sendAccountRejectedEmail(String to, String nombre) {
        String body = greeting(nombre)
                + paragraph("Lamentablemente su solicitud de registro no fue aprobada por el administrador, por lo que su cuenta no fue habilitada para acceder al sistema.")
                + noticeBox("Si cree que esto es un error, puede comunicarse con el administrador o registrarse nuevamente.", true)
                + note("Este es un mensaje automático de HelpDeskPRO.");
        sendHtmlEmail(to, "Registro Rechazado - HelpDeskPRO", buildEmail("Registro Rechazado", body));
    }
}