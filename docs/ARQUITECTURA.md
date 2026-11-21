# Arquitectura del proyecto

El backend sigue una arquitectura **por funcionalidad y por capas** (MVC + servicio + DAO),
pensada para crecer sin romper módulos existentes.

```
HTTP / STOMP
    │
    ▼
controller/     ← adaptadores web: validación de entrada, permisos, DTOs
    │
    ▼
service/        ← reglas de negocio, transacciones, orquestación
    │
    ▼
repository/     ← DAO con Spring Data JPA (consultas y persistencia)
    │
    ▼
entity/         ← modelo JPA (solo dentro de service/repository)
```

## Reglas de dependencia

1. `controller` **no** importa `repository` ni `entity`: solo DTOs y servicios.
2. `service` **no** importa `controller`.
3. `repository` **no** importa `service` ni `controller`.
4. Las entidades JPA nunca se devuelven desde un controlador.
5. La seguridad se declara en el controlador (`@PreAuthorize`) y se refuerza en el servicio
   cuando depende del recurso (participación en un ticket, propiedad de un acta, etc.).

Estas reglas se verifican automáticamente con **ArchUnit** en
`backend/src/test/java/com/empresa/helpdesk/architecture/ArchitectureTest.java`.
Si una capa se salta, `mvn test` falla.

Reglas adicionales verificadas:

6. Todos los controladores son `@RestController`.
7. Los controladores no importan `jakarta.persistence` ni Hibernate.
8. Los repositorios son interfaces DAO de Spring Data (`Repository`).
9. Los servicios terminados en `Service` están anotados con `@Service`.

El frontend tiene su propio contrato de capas en `docs/ARQUITECTURA_FRONTEND.md`
y se valida con `npm run check:layers`.

## Estructura de un módulo

```
modules/<modulo>/
├── controller/   → endpoints REST/STOMP
├── service/      → lógica de negocio (@Transactional)
├── repository/   → interfaces JPA (DAO)
├── entity/       → tablas JPA
├── dto/          → contratos de entrada/salida
└── enums/        → tipos del dominio
```

## Cómo añadir un módulo nuevo

1. Crear la entidad y su repositorio en `entity/` y `repository/`.
2. Implementar la lógica en `service/` (nunca en el controlador).
3. Exponer endpoints en `controller/` con DTOs y `@PreAuthorize`.
4. Añadir migración Flyway en `resources/db/migration` si cambia el esquema.
5. Añadir tests de servicio y, si hay reglas de acceso, de autorización.

## Frontend

- `pages/` → vistas por ruta (lazy).
- `components/` → UI reutilizable.
- `store/` → estado (Zustand).
- `lib/` → API, utilidades y hooks.
- `layouts/` → shell autenticado (navegación, sesión, notificaciones).

La UI consume únicamente la API (`/api/v1`), nunca la base de datos.
