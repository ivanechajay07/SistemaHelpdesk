# APK Android (distribución libre)

Guía para compilar, firmar y distribuir la app Android del HelpDesk **sin Play Store**.
La app es el mismo frontend React empaquetado con Capacitor; el backend sigue siendo
Spring Boot y se consume por HTTP/WebSocket.

---

## 1. Cómo funciona

```
Celular (APK)
  └── WebView Capacitor (React)
        └── http://192.168.18.140:5174/api/v1   → nginx → backend
        └── http://192.168.18.140:5174/ws/chat  → nginx → WebSocket
```

- El APK **no** incluye el backend ni la base de datos.
- El celular y el servidor deben estar en la **misma red** (o el servidor accesible por IP).
- La URL del backend se fija al compilar (`VITE_API_URL`).

> Si el servidor tiene HTTPS y dominio, usa esa URL y cambia `androidScheme` a `https`
> en `frontend/capacitor.config.ts`.

---

## 2. Requisitos

### Opción A — GitHub Actions (recomendado, no instalas nada)

Solo necesitas el repositorio. El workflow `.github/workflows/android-apk.yml` compila
el APK y lo deja como artefacto descargable.

### Opción B — Compilar en tu PC

- JDK 21
- Android Studio (incluye SDK y Gradle) **o** Android SDK + Gradle
- Node 22+

```powershell
cd frontend
npm ci
$env:VITE_API_URL = "http://192.168.18.140:5174/api/v1"
npm run apk:sync
npx cap open android
```

En Android Studio: **Build → Generate Signed Bundle / APK → APK**.

---

## 3. Firma (obligatoria)

Android exige firmar el APK. Sin una clave estable no se pueden instalar
actualizaciones encima de la app existente.

Generar el keystore **una sola vez**:

```powershell
keytool -genkeypair -v -keystore helpdesk-release.keystore `
  -alias helpdesk -keyalg RSA -keysize 2048 -validity 10000
```

Crear `frontend/android/keystore.properties` (está en `.gitignore`):

```properties
storeFile=release.keystore
storePassword=TU_PASSWORD
keyAlias=helpdesk
keyPassword=TU_PASSWORD
```

Copiar `helpdesk-release.keystore` a `frontend/android/` y compilar:

```powershell
cd frontend/android
$env:APP_VERSION_CODE = "2"
$env:APP_VERSION_NAME = "1.1.0"
./gradlew assembleRelease
```

Resultado:

```
frontend/android/app/build/outputs/apk/release/app-release.apk
```

> **Guarda el keystore y sus contraseñas.** Si lo pierdes, los usuarios deberán
> desinstalar la app para instalar la siguiente versión.

### Firma en GitHub Actions

Secretos del repositorio:

| Secreto | Contenido |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | keystore codificado: `certutil -encode helpdesk-release.keystore k.txt` |
| `ANDROID_KEYSTORE_PASSWORD` | contraseña del keystore |
| `ANDROID_KEY_ALIAS` | alias (`helpdesk`) |
| `ANDROID_KEY_PASSWORD` | contraseña de la clave |

Variable del repositorio (opcional): `VITE_API_URL` con la URL del backend.

Si no hay keystore configurado, el workflow genera un **APK de depuración** para
probar; no sirve para distribuir actualizaciones.

---

## 4. Versión y aviso de actualización

La app consulta `GET /api/v1/app/version` (público) y compara el `versionCode`
con el suyo. Si el del servidor es mayor, muestra un aviso con botón **Actualizar**.

Variables del backend:

```env
APP_VERSION_CODE=2
APP_VERSION_NAME=1.1.0
APP_APK_URL=http://192.168.18.140:5174/descargas/helpdesk.apk
APP_RELEASE_NOTES=Chat más rápido y corrección de actas
APP_UPDATE_MANDATORY=false
```

Flujo de publicación:

1. Subir `APP_VERSION_CODE`.
2. Compilar el APK con el mismo número (`APP_VERSION_CODE`).
3. Copiar el APK al servidor web como `descargas/helpdesk.apk`.
4. Actualizar `APP_VERSION_NAME`, `APP_APK_URL` y `APP_RELEASE_NOTES` en el backend.
5. Reiniciar el backend (o recargar configuración).

---

## 5. Publicar el APK

El APK va fuera de la SPA para no incluirlo dentro de la propia app:

```
<servidor web>/descargas/helpdesk.apk
```

La página `frontend/public/instalar-apk.html` ya tiene el botón que apunta a
`descargas/helpdesk.apk`. Queda disponible en:

```
http://192.168.18.140:5174/instalar-apk.html
```

Puedes generar un QR con esa URL desde cualquier generador y compartirlo con el
equipo. Evita enviar el `.apk` por WhatsApp: bloquea ese tipo de archivo.

### Añadir el APK al contenedor nginx

Copia el archivo al volumen servido por nginx o monta una carpeta:

```yaml
volumes:
  - ./descargas:/usr/share/nginx/html/descargas:ro
```

---

## 6. Qué funciona en la APK

| Función | Estado |
|---|---|
| Login, 2FA con Google Authenticator | ✅ |
| Tickets, tareas, actas, inventario | ✅ |
| Chat en tiempo real (app abierta) | ✅ |
| Cámara/galería en evidencias | ✅ (selector nativo de Android) |
| Exportar PDF y Excel | ✅ (se guarda/comparte con el sistema) |
| Botón atrás, barra de estado, splash | ✅ |
| Aviso de nueva versión | ✅ |
| Notificaciones con la app cerrada | ✅ con Firebase configurado (`docs/PUSH_FCM.md`) |

### Barras del sistema (edge-to-edge)

La app dibuja hasta el borde de la pantalla y pinta el fondo del tema detrás de la
barra de estado y la de gestos. Los iconos cambian de claros a oscuros según el tema
con el plugin `SystemBars` de Capacitor 8. El encabezado, el menú lateral y la barra
de pestañas usan `env(safe-area-inset-*)` para no quedar tapados.

---

## 7. Problemas comunes

| Síntoma | Causa | Solución |
|---|---|---|
| “No se pudo instalar” | APK firmado con otra clave | Desinstalar la versión anterior |
| La app abre pero no conecta | URL del backend incorrecta | Recompilar con `VITE_API_URL` correcto |
| Error de red / CORS | Falta `http://localhost` en CORS | Añadirlo a `CORS_ALLOWED_ORIGINS` |
| Play Protect bloquea | APK fuera de Play Store | “Instalar de todas formas” |
| La sesión se pierde al cerrar | Token no guardado | Verificar que la app sea la APK (no el navegador) |
| PDF no descarga | WebView sin plugin | Debe usar `src/lib/nativeFiles.ts` |
| Franja de color distinto arriba/abajo | WebView antiguo sin edge-to-edge | Actualizar **Android System WebView** desde Play Store |

---

## 8. Seguridad

- El APK se puede descomprimir: el JavaScript es legible. **No pongas secretos en el
  frontend**: la seguridad real está en el backend (JWT, roles, CORS, 2FA).
- El refresh token se guarda en `Preferences` (almacenamiento privado de la app).
  No es cifrado por hardware; en un dispositivo rooteado podría leerse. Para subir el
  nivel se puede añadir AndroidX Security más adelante.
- `android:allowBackup="false"` evita que el token viaje en copias de seguridad.
- `usesCleartextTraffic="true"` es necesario para LAN por HTTP. Si publicas con
  dominio y HTTPS, cámbialo a `false` y usa `androidScheme: 'https'`.
