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

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    // Gmail no permite enviar con un From distinto al usuario autenticado por SMTP;
    // si MAIL_USERNAME no está definido se usa el correo del administrador.
    private static final String DEFAULT_FROM = "ivanechajay07@gmail.com";

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

    @Async
    public void sendTicketCreatedEmail(String to, Ticket ticket) {
        String html = """
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #2563eb, #6366f1); padding: 30px; border-radius: 12px 12px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 22px;">🎫 Ticket Creado Exitosamente</h1>
              </div>
              <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
                <p style="color: #334155; font-size: 15px;">Hola <b>%s</b>,</p>
                <p style="color: #475569;">Tu ticket ha sido registrado exitosamente. Pronto un técnico lo atenderá.</p>
                <div style="background: white; border-radius: 8px; padding: 16px; margin: 16px 0; border: 1px solid #e2e8f0;">
                  <p style="margin: 4px 0; color: #64748b;"><b>Código:</b> <span style="color: #2563eb;">%s</span></p>
                  <p style="margin: 4px 0; color: #64748b;"><b>Título:</b> %s</p>
                  <p style="margin: 4px 0; color: #64748b;"><b>Prioridad:</b> %s</p>
                  <p style="margin: 4px 0; color: #64748b;"><b>Categoría:</b> %s</p>
                </div>
                <p style="color: #64748b; font-size: 13px;">Puedes dar seguimiento a tu ticket iniciando sesión en el sistema.</p>
              </div>
            </div>
            """.formatted(
                ticket.getSolicitante().getNombre(),
                ticket.getCodigo(),
                ticket.getTitulo(),
                ticket.getPrioridad(),
                ticket.getSubcategoria().getCategory().getName() + " / " + ticket.getSubcategoria().getName()
        );
        sendHtmlEmail(to, "Ticket Registrado: " + ticket.getCodigo(), html);
    }

    @Async
    public void sendTicketCreatedAdminNotification(String to, Ticket ticket) {
        String html = """
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #dc2626, #f97316); padding: 30px; border-radius: 12px 12px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 22px;">🚨 Nuevo Ticket Generado</h1>
              </div>
              <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
                <p style="color: #334155; font-size: 15px;">Hola <b>Administrador</b>,</p>
                <p style="color: #475569;">Se ha generado un nuevo ticket en el sistema y requiere asignación.</p>
                <div style="background: white; border-radius: 8px; padding: 16px; margin: 16px 0; border: 1px solid #e2e8f0;">
                  <p style="margin: 4px 0; color: #64748b;"><b>Código:</b> <span style="color: #dc2626;">%s</span></p>
                  <p style="margin: 4px 0; color: #64748b;"><b>Título:</b> %s</p>
                  <p style="margin: 4px 0; color: #64748b;"><b>Solicitante:</b> %s</p>
                  <p style="margin: 4px 0; color: #64748b;"><b>Prioridad:</b> %s</p>
                  <p style="margin: 4px 0; color: #64748b;"><b>Categoría:</b> %s</p>
                </div>
                <p style="color: #64748b; font-size: 13px;">Ingresa al sistema para asignar un técnico a este ticket.</p>
              </div>
            </div>
            """.formatted(
                ticket.getCodigo(),
                ticket.getTitulo(),
                ticket.getSolicitante().getNombre() + " " + ticket.getSolicitante().getApellidos(),
                ticket.getPrioridad(),
                ticket.getSubcategoria().getCategory().getName() + " / " + ticket.getSubcategoria().getName()
        );
        sendHtmlEmail(to, "Nuevo Ticket Generado: " + ticket.getCodigo(), html);
    }

    @Async
    public void sendTicketAssignmentEmail(String to, Ticket ticket, User tecnico) {
        String html = """
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #7c3aed, #a855f7); padding: 30px; border-radius: 12px 12px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 22px;">📋 Ticket Asignado a Ti</h1>
              </div>
              <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
                <p style="color: #334155; font-size: 15px;">Hola <b>%s</b>,</p>
                <p style="color: #475569;">Se te ha asignado un nuevo ticket para su atención.</p>
                <div style="background: white; border-radius: 8px; padding: 16px; margin: 16px 0; border: 1px solid #e2e8f0;">
                  <p style="margin: 4px 0; color: #64748b;"><b>Código:</b> <span style="color: #7c3aed;">%s</span></p>
                  <p style="margin: 4px 0; color: #64748b;"><b>Título:</b> %s</p>
                  <p style="margin: 4px 0; color: #64748b;"><b>Descripción:</b> %s</p>
                  <p style="margin: 4px 0; color: #64748b;"><b>Prioridad:</b> %s</p>
                  <p style="margin: 4px 0; color: #64748b;"><b>Solicitante:</b> %s</p>
                </div>
                <p style="color: #64748b; font-size: 13px;">Ingresa al sistema para atender este ticket.</p>
              </div>
            </div>
            """.formatted(
                tecnico.getNombre(),
                ticket.getCodigo(),
                ticket.getTitulo(),
                ticket.getDescripcion(),
                ticket.getPrioridad(),
                ticket.getSolicitante().getNombre() + " " + ticket.getSolicitante().getApellidos()
        );
        sendHtmlEmail(to, "Ticket Asignado: " + ticket.getCodigo(), html);
    }

    @Async
    public void sendTicketResolvedEmail(String to, Ticket ticket, String resolucion) {
        String html = """
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 30px; border-radius: 12px 12px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 22px;">✅ Tu Ticket Fue Resuelto</h1>
              </div>
              <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
                <p style="color: #334155; font-size: 15px;">Hola <b>%s</b>,</p>
                <p style="color: #475569;">El técnico ha marcado tu ticket como resuelto. <b>Por favor ingresa al sistema y confirma si la solución fue correcta.</b></p>
                <div style="background: white; border-radius: 8px; padding: 16px; margin: 16px 0; border: 1px solid #e2e8f0;">
                  <p style="margin: 4px 0; color: #64748b;"><b>Código:</b> <span style="color: #059669;">%s</span></p>
                  <p style="margin: 4px 0; color: #64748b;"><b>Título:</b> %s</p>
                  <p style="margin: 4px 0; color: #64748b;"><b>Solución aplicada:</b> %s</p>
                </div>
                <p style="color: #64748b; font-size: 13px;">Al confirmar la solución, el ticket se cerrará definitivamente.</p>
              </div>
            </div>
            """.formatted(
                ticket.getSolicitante().getNombre(),
                ticket.getCodigo(),
                ticket.getTitulo(),
                resolucion
        );
        sendHtmlEmail(to, "Confirma la solución de tu Ticket: " + ticket.getCodigo(), html);
    }

    @Async
    public void sendTicketConfirmedAdminNotification(String to, Ticket ticket) {
        String html = """
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #0f766e, #14b8a6); padding: 30px; border-radius: 12px 12px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 22px;">🙋 Cliente Confirmó la Solución</h1>
              </div>
              <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
                <p style="color: #334155; font-size: 15px;">Hola <b>Administrador</b>,</p>
                <p style="color: #475569;">El cliente confirmó que su ticket fue resuelto satisfactoriamente y este ha sido cerrado.</p>
                <div style="background: white; border-radius: 8px; padding: 16px; margin: 16px 0; border: 1px solid #e2e8f0;">
                  <p style="margin: 4px 0; color: #64748b;"><b>Código:</b> <span style="color: #0f766e;">%s</span></p>
                  <p style="margin: 4px 0; color: #64748b;"><b>Título:</b> %s</p>
                  <p style="margin: 4px 0; color: #64748b;"><b>Solicitante:</b> %s</p>
                  <p style="margin: 4px 0; color: #64748b;"><b>Técnico asignado:</b> %s</p>
                  <p style="margin: 4px 0; color: #64748b;"><b>Estado final:</b> <span style="color: #059669; font-weight: bold;">CERRADO</span></p>
                </div>
                <p style="color: #94a3b8; font-size: 13px;">Este ticket completó todo su ciclo de vida exitosamente.</p>
              </div>
            </div>
            """.formatted(
                ticket.getCodigo(),
                ticket.getTitulo(),
                ticket.getSolicitante().getNombre() + " " + ticket.getSolicitante().getApellidos(),
                ticket.getTecnico() != null ? ticket.getTecnico().getNombre() + " " + ticket.getTecnico().getApellidos() : "Sin asignar"
        );
        sendHtmlEmail(to, "Solución Confirmada por el Cliente: " + ticket.getCodigo(), html);
    }

    @Async
    public void sendTaskAssignedEmail(String to, Task task) {
        String creador = task.getCreador() != null
                ? task.getCreador().getNombre() + " " + task.getCreador().getApellidos()
                : "Sistema";
        String descripcion = task.getDescripcion() != null && !task.getDescripcion().isBlank()
                ? task.getDescripcion()
                : "Sin descripción";
        String html = """
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #0d9488, #10b981); padding: 30px; border-radius: 12px 12px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 22px;">📝 Nueva Tarea Asignada a Ti</h1>
              </div>
              <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
                <p style="color: #334155; font-size: 15px;">Hola <b>%s</b>,</p>
                <p style="color: #475569;">Se te ha asignado una nueva tarea en el gestor de tareas. Ingresa al sistema para revisarla y marcar su avance.</p>
                <div style="background: white; border-radius: 8px; padding: 16px; margin: 16px 0; border: 1px solid #e2e8f0;">
                  <p style="margin: 4px 0; color: #64748b;"><b>Título:</b> <span style="color: #0d9488;">%s</span></p>
                  <p style="margin: 4px 0; color: #64748b;"><b>Descripción:</b> %s</p>
                  <p style="margin: 4px 0; color: #64748b;"><b>Prioridad:</b> %s</p>
                  <p style="margin: 4px 0; color: #64748b;"><b>Periodo:</b> %s al %s</p>
                  <p style="margin: 4px 0; color: #64748b;"><b>Asignada por:</b> %s</p>
                </div>
                <p style="color: #64748b; font-size: 13px;">Recuerda actualizar el estado de la tarea (En proceso / Completada) desde el Gestor de Tareas.</p>
              </div>
            </div>
            """.formatted(
                task.getTecnico().getNombre(),
                task.getTitulo(),
                descripcion,
                task.getPrioridad(),
                task.getFechaInicio(),
                task.getFechaFin(),
                creador
        );
        sendHtmlEmail(to, "Nueva Tarea Asignada: " + task.getTitulo(), html);
    }

    public void sendPasswordResetEmail(String to, String nombre, String token) {
        String resetUrl = frontendUrl + "/reset-password?token=" + token;
        String html = """
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #d97706, #f59e0b); padding: 30px; border-radius: 12px 12px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 22px;">🔒 Restablecer Contraseña</h1>
              </div>
              <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
                <p style="color: #334155; font-size: 15px;">Hola <b>%s</b>,</p>
                <p style="color: #475569;">Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón de abajo para crear una nueva contraseña.</p>
                <div style="text-align: center; margin: 24px 0;">
                  <a href="%s" style="background: #d97706; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px;">Restablecer Mi Contraseña</a>
                </div>
                <p style="color: #94a3b8; font-size: 13px;">Si no solicitaste este cambio, puedes ignorar este correo. Tu contraseña permanecerá igual.</p>
                <p style="color: #94a3b8; font-size: 13px;">Este enlace expirará en 24 horas.</p>
              </div>
            </div>
            """.formatted(nombre, resetUrl);
        sendHtmlEmail(to, "Restablece tu contraseña - HelpDeskPRO", html);
    }

    public void sendPasswordChangedConfirmation(String to, String nombre) {
        String html = """
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 30px; border-radius: 12px 12px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 22px;">✅ Contraseña Restablecida</h1>
              </div>
              <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
                <p style="color: #334155; font-size: 15px;">Hola <b>%s</b>,</p>
                <p style="color: #475569;">Tu contraseña ha sido restablecida exitosamente.</p>
                <div style="background: #ecfdf5; border-radius: 8px; padding: 16px; margin: 16px 0; border: 1px solid #a7f3d0;">
                  <p style="margin: 0; color: #065f46;">Ya puedes iniciar sesión con tu nueva contraseña.</p>
                </div>
                <p style="color: #94a3b8; font-size: 13px;">Si no realizaste este cambio, contacta al administrador de inmediato.</p>
              </div>
            </div>
            """.formatted(nombre);
        sendHtmlEmail(to, "Contraseña Restablecida - HelpDeskPRO", html);
    }

    @Async
    public void sendPasswordChangedAdminNotification(String to, String adminNombre, String usuarioNombre, String usuarioEmail) {
        String html = """
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; border-radius: 12px 12px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 22px;">🔑 Contraseña Cambiada</h1>
              </div>
              <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
                <p style="color: #334155; font-size: 15px;">Hola <b>%s</b>,</p>
                <p style="color: #475569;">Un usuario ha restablecido su contraseña exitosamente.</p>
                <div style="background: white; border-radius: 8px; padding: 16px; margin: 16px 0; border: 1px solid #e2e8f0;">
                  <p style="margin: 4px 0; color: #64748b;"><b>Usuario:</b> %s</p>
                  <p style="margin: 4px 0; color: #64748b;"><b>Email:</b> %s</p>
                  <p style="margin: 4px 0; color: #64748b;"><b>Estado:</b> <span style="color: #059669;">Completado</span></p>
                </div>
                <p style="color: #94a3b8; font-size: 13px;">Esta acción fue realizada mediante el enlace de restablecimiento.</p>
              </div>
            </div>
            """.formatted(adminNombre, usuarioNombre, usuarioEmail);
        sendHtmlEmail(to, "Notificación: Contraseña Cambiada - HelpDeskPRO", html);
    }

    @Async
    public void sendAccountActivatedEmail(String to, String nombre) {
        String loginUrl = frontendUrl + "/login";
        String html = """
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #2563eb, #4f46e5); padding: 30px; border-radius: 12px 12px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 22px;">🎉 ¡Tu cuenta ha sido activada!</h1>
              </div>
              <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
                <p style="color: #334155; font-size: 15px;">Hola <b>%s</b>,</p>
                <p style="color: #475569;">El administrador ha aprobado y activado tu cuenta. Ya puedes acceder al sistema con tu usuario y contraseña.</p>
                <div style="text-align: center; margin: 24px 0;">
                  <a href="%s" style="background: #2563eb; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px;">Iniciar Sesión</a>
                </div>
                <p style="color: #94a3b8; font-size: 13px;">Si no creaste esta cuenta, puedes ignorar este mensaje.</p>
              </div>
            </div>
            """.formatted(nombre, loginUrl);
        sendHtmlEmail(to, "¡Cuenta Activada! - HelpDeskPRO", html);
    }

    @Async
    public void sendAccountRejectedEmail(String to, String nombre) {
        String html = """
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #dc2626, #f87171); padding: 30px; border-radius: 12px 12px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 22px;">Solicitud de registro rechazada</h1>
              </div>
              <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
                <p style="color: #334155; font-size: 15px;">Hola <b>%s</b>,</p>
                <p style="color: #475569;">Lamentamos informarte que tu solicitud de registro no fue aprobada por el administrador. Por lo tanto, tu cuenta no fue habilitada para acceder al sistema.</p>
                <div style="background: #fef2f2; border-radius: 8px; padding: 16px; margin: 16px 0; border: 1px solid #fecaca;">
                  <p style="margin: 0; color: #991b1b;">Si crees que esto es un error, puedes comunicarte con el administrador o registrarte nuevamente.</p>
                </div>
                <p style="color: #94a3b8; font-size: 13px;">Este es un mensaje automático de HelpDeskPRO.</p>
              </div>
            </div>
            """.formatted(nombre);
        sendHtmlEmail(to, "Registro Rechazado - HelpDeskPRO", html);
    }
}
