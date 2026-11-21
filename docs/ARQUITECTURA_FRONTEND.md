# Arquitectura del frontend

El frontend sigue una separación por capas para que cada módulo pueda crecer sin
mezclar vista, estado y acceso a red.

```text
pages/ + components/     ← Vista (React)
        ↓
services/               ← Casos de uso / contratos por dominio
        ↓
store/                  ← Estado de la aplicación y caché
        ↓
lib/axios.ts            ← Infraestructura HTTP (único punto que conoce axios)
```

## Reglas

1. **Páginas y componentes no importan `lib/axios`.**
   Deben usar `src/services/*` o un store.
2. **Los servicios no dependen de páginas, componentes ni stores.**
   Solo pueden usar `lib/axios` y tipos.
3. **Los stores concentran estado y operaciones de un dominio.**
   Pueden usar `lib/axios` o servicios; las páginas no llaman a la API directamente.
4. **Los componentes presentacionales reciben datos y callbacks por props.**
   La lógica de red vive en servicios/stores.
5. **Cada dominio nuevo crea su archivo en `src/services/`.**
   Ejemplo: `ticketService`, `actaService`, `profileService`.

## Estructura

```text
src/
├─ pages/            vistas por ruta
├─ components/       UI reutilizable y componentes de dominio
├─ services/         authService, ticketService, actaService, ...
├─ store/            Zustand: estado global y operaciones
├─ lib/              axios, sesión, hooks, utilidades, políticas
└─ layouts/          shell de navegación
```

## Verificación automática

`npm run check:layers` recorre `pages`, `components` y `services` y falla si:

- una página o componente importa `lib/axios`;
- un servicio importa páginas, componentes o stores.

Se ejecuta automáticamente en `prebuild` y `pretest`:

```bash
npm run check:layers   # solo la comprobación
npm run build          # la ejecuta antes de compilar
npm test               # la ejecuta antes de las pruebas
```

## Ejemplo correcto

```ts
// src/services/ticketService.ts
export const ticketService = {
  getById: (id: number | string) => api.get(`/tickets/${id}`),
};

// src/pages/TicketDetail.tsx
const { data } = await ticketService.getById(id);
```

## Ejemplo incorrecto

```ts
// src/pages/TicketDetail.tsx
import api from '../lib/axios'; // ❌ rompe la capa de servicios
const { data } = await api.get(`/tickets/${id}`);
```
