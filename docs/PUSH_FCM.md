# Notificaciones push con Firebase (FCM)

Permite que la APK reciba notificaciones **con la app cerrada o en segundo plano**.
Sin esta configuración la app sigue funcionando con notificaciones locales
(mientras está abierta) y con los correos.

> **Atajo:** con los dos archivos descargados puedes ejecutar
> `.\scripts\configure-firebase.ps1 -GoogleServicesJson <ruta> -ServiceAccountJson <ruta> -SetGitHubSecret`
> y deja todo configurado (copia el archivo, actualiza `.env` y sube el secreto).

---

## 1. Crear el proyecto en Firebase

1. Entra a https://console.firebase.google.com y crea un proyecto (ej. `helpdesk-pro`).
2. Dentro del proyecto, **Agregar app → Android**.
3. Datos de la app:
   - **Nombre**: `HelpDesk PRO`
   - **Paquete**: `com.empresa.helpdesk` (debe ser exacto)
4. Descarga **`google-services.json`**.
5. Colócalo en:

```
frontend/android/app/google-services.json
```

> Ese archivo NO va al repositorio (ya está cubierto por `.gitignore`). Para CI se
> sube como secreto.

## 2. Credenciales del backend (cuenta de servicio)

1. Firebase Console → ⚙️ **Configuración del proyecto** → **Cuentas de servicio**.
2. **Generar nueva clave privada** → descarga el JSON.
3. Ese JSON es **secreto** (da acceso a enviar push). No lo subas al repositorio.

Conviértelo a base64 (PowerShell):

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("cuenta-servicio.json")) | Set-Content cuenta-servicio.b64
```

Abre `cuenta-servicio.b64`, copia todo (una línea) y pégalo en `.env`:

```env
PUSH_ENABLED=true
FIREBASE_CREDENTIALS_BASE64=eyJ0eXBlIjoic2VydmljZV9hY2NvdW50Ii...
```

Reinicia el backend:

```powershell
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d backend
```

En los logs debe aparecer:

```
Push FCM habilitado para el proyecto helpdesk-pro
```

## 3. Compilar la APK con push

Local:

```powershell
cd frontend
$env:VITE_API_URL = "http://192.168.18.137:5174/api/v1"
$env:VITE_FCM_ENABLED = "true"
npm run build
npx cap sync android
npx cap open android
```

GitHub Actions:

1. Convierte `google-services.json` a base64:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("google-services.json")) | Set-Content google-services.b64
```

2. **Settings → Secrets and variables → Actions → New repository secret**:

| Secreto | Valor |
|---|---|
| `GOOGLE_SERVICES_JSON_BASE64` | contenido de `google-services.b64` |

3. Ejecuta el workflow **APK Android**. El paso "Preparar Firebase" detecta el
   secreto y compila con `VITE_FCM_ENABLED=true` automáticamente.

## 4. Verificar

1. Instala la APK nueva (desinstala la anterior) e inicia sesión.
2. Acepta el permiso de notificaciones.
3. Comprueba que el token quedó guardado:

```sql
SELECT usuario_id, plataforma, LEFT(token, 20) FROM push_device_tokens;
```

4. Cierra la app (o mándala a segundo plano) y envía un mensaje desde otro usuario.
   Debe llegar la notificación con sonido.
5. Toca la notificación: debe abrir el ticket.

## 5. Qué envía el sistema

| Evento | Destino | Cuándo |
|---|---|---|
| Mensaje de chat | El otro participante del ticket | App cerrada, en segundo plano o en otra pantalla |
| Ticket asignado | Técnico y cliente | Al asignar |
| Cambios de ticket | Interesados | Según el evento |

En primer plano la app muestra su propio aviso y sonido; el push del sistema se
reserva para cuando la app no está visible (así no se duplica).

## 6. Problemas comunes

| Síntoma | Causa | Solución |
|---|---|---|
| No aparece el permiso | APK sin `google-services.json` | Recompilar con el archivo presente |
| `push_device_tokens` vacía | Permiso denegado o registro falló | Revisar permisos de la app y logcat |
| "Push habilitado pero sin credenciales" | Falta `FIREBASE_CREDENTIALS_BASE64` | Configurarla y reiniciar |
| Llega pero sin sonido | Canal silenciado | Ajustes → Apps → HelpDesk → Notificaciones |
| No llega con la app cerrada | Batería restringe la app | Quitar optimización de batería |
| Token inválido | App desinstalada/reinstalada | El backend lo elimina solo |

## 7. Seguridad

- `google-services.json` identifica el proyecto; no es tan sensible, pero se maneja como secreto en CI.
- El JSON de la **cuenta de servicio** sí es crítico: permite enviar notificaciones a
  cualquier dispositivo del proyecto. Nunca lo subas al repositorio.
- Los tokens se guardan por usuario y se eliminan al cerrar sesión o cuando FCM los
  marca como inválidos.
