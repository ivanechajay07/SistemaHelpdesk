package com.empresa.helpdesk.config;

import com.empresa.helpdesk.modules.user.entity.Role;
import com.empresa.helpdesk.modules.user.entity.User;
import com.empresa.helpdesk.modules.user.repository.RoleRepository;
import com.empresa.helpdesk.modules.user.repository.UserRepository;
import com.empresa.helpdesk.modules.user.entity.Permission;
import com.empresa.helpdesk.modules.user.repository.PermissionRepository;
import com.empresa.helpdesk.modules.ticket.entity.Category;
import com.empresa.helpdesk.modules.ticket.entity.Subcategory;
import com.empresa.helpdesk.modules.ticket.entity.TicketTemplate;
import com.empresa.helpdesk.modules.ticket.repository.CategoryRepository;
import com.empresa.helpdesk.modules.ticket.repository.SubcategoryRepository;
import com.empresa.helpdesk.modules.ticket.repository.TicketTemplateRepository;
import com.empresa.helpdesk.modules.inventario.entity.CategoriaActivo;
import com.empresa.helpdesk.modules.inventario.repository.CategoriaActivoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Set;
import java.util.List;
import java.util.HashSet;

@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    /** Correo del administrador (configurable por entorno con ADMIN_EMAIL). */
    @Value("${app.admin.email:${ADMIN_EMAIL:ivanechajay07@gmail.com}}")
    private String adminEmailConfig;

    /** Contraseña inicial del administrador. En producción DEBE definirse vía ADMIN_PASSWORD. */
    @Value("${app.admin.password:${ADMIN_PASSWORD:admin123}}")
    private String adminPasswordConfig;

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final CategoryRepository categoryRepository;
    private final SubcategoryRepository subcategoryRepository;
    private final TicketTemplateRepository templateRepository;
    private final CategoriaActivoRepository categoriaActivoRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        // Asegurar que los permisos existan
        Permission viewAll = createPermissionIfNotFound("TICKET_VIEW_ALL", "Ver todos los tickets");
        Permission assignTicket = createPermissionIfNotFound("TICKET_ASSIGN", "Asignar tickets");
        // El técnico NO puede editar tickets; solo quien tenga TICKET_EDIT (asignable desde Roles y Permisos)
        Permission editTicket = createPermissionIfNotFound("TICKET_EDIT", "Editar tickets");
        // Eliminar tickets: controlado por el administrador mediante este permiso
        Permission deleteTicket = createPermissionIfNotFound("TICKET_DELETE", "Eliminar tickets");
        Permission userManage = createPermissionIfNotFound("USER_MANAGE", "Gestionar usuarios");
        Permission categoryManage = createPermissionIfNotFound("CATEGORY_MANAGE", "Gestionar categorías");
        Permission roleManage = createPermissionIfNotFound("ROLE_MANAGE", "Gestionar roles");
        Permission reportView = createPermissionIfNotFound("REPORT_VIEW", "Ver reportes");
        Permission taskManage = createPermissionIfNotFound("TASK_MANAGE", "Gestor de Tareas (menú Tareas, Calendario y Gantt)");
        Permission entityManage = createPermissionIfNotFound("ENTITY_MANAGE", "Entidad (menú Entidades y Sedes)");
        Permission monitoringView = createPermissionIfNotFound("MONITORING_VIEW", "Monitoreo de Red (menú Monitoreo)");

        // --- Permisos del módulo INVENTARIO ---
        Permission invView = createPermissionIfNotFound("INV_VIEW", "Inventario: ver activos e inventario");
        Permission invCreate = createPermissionIfNotFound("INV_CREATE", "Inventario: registrar activos");
        Permission invEdit = createPermissionIfNotFound("INV_EDIT", "Inventario: editar activos");
        Permission invDelete = createPermissionIfNotFound("INV_DELETE", "Inventario: eliminar activos");
        Permission invBaja = createPermissionIfNotFound("INV_BAJA", "Inventario: dar de baja activos");
        Permission invMover = createPermissionIfNotFound("INV_MOVER", "Inventario: registrar movimientos");
        Permission invTransfer = createPermissionIfNotFound("INV_TRANSFER", "Inventario: transferencias entre sedes");
        Permission invMant = createPermissionIfNotFound("INV_MANT", "Inventario: mantenimientos");
        Permission invPrestamo = createPermissionIfNotFound("INV_PRESTAMO", "Inventario: préstamos de activos");
        Permission invHistorial = createPermissionIfNotFound("INV_HISTORIAL", "Inventario: ver historial");
        Permission invQr = createPermissionIfNotFound("INV_QR", "Inventario: escanear/generar QR");
        Permission invExport = createPermissionIfNotFound("INV_EXPORT", "Inventario: exportar reportes");

        // Asegurar que exista el rol ADMIN y tenga los permisos
        Role adminRole = roleRepository.findByName("ADMIN").orElseGet(() -> 
            roleRepository.save(Role.builder()
                .name("ADMIN")
                .description("Administrador del sistema")
                .build())
        );

        // Crear rol TECNICO por defecto para usuarios normales
        Role tecnicoRole = roleRepository.findByName("TECNICO").orElseGet(() -> 
            roleRepository.save(Role.builder()
                .name("TECNICO")
                .description("Técnico de soporte")
                .build())
        );

        // Crear rol SUPERVISOR
        Role supervisorRole = roleRepository.findByName("SUPERVISOR").orElseGet(() -> 
            roleRepository.save(Role.builder()
                .name("SUPERVISOR")
                .description("Supervisor de Mesa de Ayuda")
                .build())
        );

        // Crear rol CLIENTE
        Role clienteRole = roleRepository.findByName("CLIENTE").orElseGet(() -> 
            roleRepository.save(Role.builder()
                .name("CLIENTE")
                .description("Usuario final / Cliente")
                .build())
        );

        // Permisos por defecto del ADMIN: SOLO si el rol aún no tiene permisos,
        // para no sobrescribir la configuración personalizada hecha desde "Roles y Permisos"
        if (adminRole.getPermissions().isEmpty()) {
            Set<Permission> adminPermissions = new HashSet<>(List.of(viewAll, assignTicket, editTicket, deleteTicket, userManage, categoryManage, roleManage, reportView, taskManage, entityManage, monitoringView,
                    invView, invCreate, invEdit, invDelete, invBaja, invMover, invTransfer, invMant, invPrestamo, invHistorial, invQr, invExport));
            adminRole.setPermissions(adminPermissions);
            roleRepository.save(adminRole);
        }

        // Permisos por defecto del Supervisor: SOLO si el rol aún no tiene permisos,
        // para no sobrescribir la configuración personalizada hecha desde "Roles y Permisos"
        if (supervisorRole.getPermissions().isEmpty()) {
            Set<Permission> supervisorPermissions = new HashSet<>(List.of(viewAll, assignTicket, reportView, taskManage));
            supervisorRole.setPermissions(supervisorPermissions);
            roleRepository.save(supervisorRole);
        }
        
        System.out.println("Roles y permisos aplicados.");

        String adminEmail = adminEmailConfig;

        User admin = userRepository.findByUsernameOrEmail("admin", "admin").orElse(null);
        if (admin == null) {
            // Si otra cuenta ya registró ese correo, se le libera renombrándola
            liberarCorreoSiEstaEnUso(adminEmail, null);
            admin = User.builder()
                    .username("admin")
                    .email(adminEmail)
                    .password(passwordEncoder.encode(adminPasswordConfig))
                    .nombre("Super")
                    .apellidos("Administrador")
                    .activo(true)
                    .build();
        } else {
            admin.setActivo(true);
            // El administrador recibe las notificaciones del sistema en este Gmail;
            // si otro usuario lo tenía asignado, primero se libera para no violar la
            // restricción UNIQUE de usuarios.email
            if (!adminEmail.equalsIgnoreCase(admin.getEmail())) {
                liberarCorreoSiEstaEnUso(adminEmail, admin.getId());
                admin.setEmail(adminEmail);
                System.out.println("Correo del administrador actualizado a " + adminEmail);
            }
        }
        
        // Asegurar SIEMPRE que el usuario admin tenga el rol de administrador
        admin.setRoles(Set.of(adminRole));
        userRepository.save(admin);
        System.out.println("Usuario administrador verificado y actualizado: admin");
        if ("admin123".equals(adminPasswordConfig)) {
            System.out.println("ADVERTENCIA: el administrador usa la contraseña por defecto. "
                    + "Define la variable de entorno ADMIN_PASSWORD antes de usar el sistema en producción.");
        }

        if (categoryRepository.count() == 0) {
            Category hw = categoryRepository.save(Category.builder().name("Hardware").description("Equipos físicos").build());
            Category sw = categoryRepository.save(Category.builder().name("Software").description("Sistemas y programas").build());
            Category net = categoryRepository.save(Category.builder().name("Redes y Accesos").description("Internet y VPN").build());

            subcategoryRepository.saveAll(List.of(
                Subcategory.builder().category(hw).name("Impresoras").build(),
                Subcategory.builder().category(hw).name("Laptops").build(),
                Subcategory.builder().category(sw).name("Office 365").build(),
                Subcategory.builder().category(sw).name("ERP/CRM").build(),
                Subcategory.builder().category(net).name("VPN").build(),
                Subcategory.builder().category(net).name("Correo Electrónico").build()
            ));
            System.out.println("Categorías y Subcategorías creadas.");
        }

        // Sincronizar las categorías del sistema con las de inventario: por cada
        // categoría registrada se asegura una CategoriaActivo equivalente, de modo
        // que el selector "Categoría" al registrar activos siempre muestre las
        // categorías existentes del sistema.
        for (Category cat : categoryRepository.findAll()) {
            categoriaActivoRepository.findByNombreIgnoreCase(cat.getName()).orElseGet(() -> {
                CategoriaActivo nueva = CategoriaActivo.builder()
                        .nombre(cat.getName())
                        .descripcion(cat.getDescription())
                        .campos(camposPorCategoria(cat.getName()))
                        .build();
                System.out.println("Categoría de inventario sincronizada: " + cat.getName());
                return categoriaActivoRepository.save(nueva);
            });
        }

        // Plantillas de tickets para casos recurrentes
        if (templateRepository.count() == 0) {
            Subcategory impresoras = subcategoryRepository.findByNameIgnoreCase("Impresoras").orElse(null);
            Subcategory office = subcategoryRepository.findByNameIgnoreCase("Office 365").orElse(null);
            Subcategory vpn = subcategoryRepository.findByNameIgnoreCase("VPN").orElse(null);

            templateRepository.saveAll(List.of(
                TicketTemplate.builder()
                    .nombre("Impresora no responde")
                    .titulo("Impresora no responde / no imprime")
                    .descripcion("La impresora no responde a los trabajos de impresión. Ya se verificó que esté conectada y con papel.")
                    .prioridad("MEDIA")
                    .subcategoria(impresoras)
                    .build(),
                TicketTemplate.builder()
                    .nombre("Acceso Office 365")
                    .titulo("Solicitud de acceso a Office 365")
                    .descripcion("Se solicita la habilitación de la cuenta de Office 365 para un nuevo colaborador.")
                    .prioridad("BAJA")
                    .subcategoria(office)
                    .build(),
                TicketTemplate.builder()
                    .nombre("Falla VPN")
                    .titulo("No puedo conectarme por VPN")
                    .descripcion("La conexión VPN falla al intentar autenticar. Adjunto captura del error mostrado.")
                    .prioridad("ALTA")
                    .subcategoria(vpn)
                    .build()
            ));
            System.out.println("Plantillas de tickets creadas.");
        }
    }

    private Permission createPermissionIfNotFound(String name, String description) {
        return permissionRepository.findByName(name).orElseGet(() -> 
            permissionRepository.save(Permission.builder().name(name).description(description).build())
        );
    }

    /**
     * Devuelve los campos de especificación técnica por defecto según la categoría.
     */
    private List<String> camposPorCategoria(String nombre) {
        String n = nombre.toLowerCase();
        if (n.contains("hardware") || n.contains("computadora") || n.contains("laptop")
                || n.contains("equipo") || n.contains("impresora")) {
            return List.of("Marca", "Modelo", "Número de serie", "Procesador", "RAM", "Disco");
        }
        if (n.contains("software") || n.contains("licencia")) {
            return List.of("Licencia", "Versión", "Fecha de vencimiento");
        }
        if (n.contains("red") || n.contains("acceso") || n.contains("vpn")) {
            return List.of("IP", "Puerto", "Equipo asociado");
        }
        if (n.contains("cctv") || n.contains("cámara") || n.contains("camara") || n.contains("infraestructura")) {
            return List.of("Marca", "Modelo", "Ubicación");
        }
        return List.of("Marca", "Modelo");
    }

    /**
     * Si el correo ya está asignado a otro usuario distinto del admin, le asigna un
     * correo alternativo para liberarlo (la columna email es UNIQUE en la BD).
     */
    private void liberarCorreoSiEstaEnUso(String email, Long idAdmin) {
        userRepository.findByEmail(email)
                .filter(u -> !u.getId().equals(idAdmin))
                .ifPresent(conflict -> {
                    String nuevoEmail = conflict.getUsername() + ".migrado" + conflict.getId() + "@helpdeskpro.local";
                    conflict.setEmail(nuevoEmail);
                    userRepository.saveAndFlush(conflict);
                    System.out.println("AVISO: el correo " + email + " estaba en uso por el usuario '"
                            + conflict.getUsername() + "'. Se le reasignó: " + nuevoEmail);
                });
    }
}
