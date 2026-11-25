# Configura Firebase Cloud Messaging en el proyecto.
#
# Uso:
#   .\scripts\configure-firebase.ps1 `
#     -GoogleServicesJson "C:\ruta\google-services.json" `
#     -ServiceAccountJson "C:\ruta\cuenta-servicio.json" `
#     -SetGitHubSecret
#
# Hace:
#   1. Copia google-services.json a frontend/android/app/
#   2. Guarda la cuenta de servicio en .env (base64) y activa PUSH_ENABLED
#   3. Opcional: sube el secreto GOOGLE_SERVICES_JSON_BASE64 a GitHub (requiere gh)
#   4. Reinicia el backend local
param(
    [Parameter(Mandatory = $true)][string]$GoogleServicesJson,
    [Parameter(Mandatory = $true)][string]$ServiceAccountJson,
    [switch]$SetGitHubSecret,
    [switch]$SkipRestart
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

if (-not (Test-Path $GoogleServicesJson)) { throw "No existe: $GoogleServicesJson" }
if (-not (Test-Path $ServiceAccountJson)) { throw "No existe: $ServiceAccountJson" }

$destino = Join-Path $root 'frontend\android\app\google-services.json'
Copy-Item $GoogleServicesJson $destino -Force
Write-Host "google-services.json copiado a frontend/android/app/"

$b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes((Resolve-Path $ServiceAccountJson)))
$envPath = Join-Path $root '.env'
if (-not (Test-Path $envPath)) {
    Copy-Item (Join-Path $root '.env.example') $envPath
    Write-Host "Se creó .env desde .env.example (revisa las demás variables)"
}

$contenido = [IO.File]::ReadAllText($envPath)
if ($contenido -match '(?m)^PUSH_ENABLED=') {
    $contenido = $contenido -replace '(?m)^PUSH_ENABLED=.*$', 'PUSH_ENABLED=true'
} else {
    $contenido += "`nPUSH_ENABLED=true`n"
}
if ($contenido -match '(?m)^FIREBASE_CREDENTIALS_BASE64=') {
    $contenido = $contenido -replace '(?m)^FIREBASE_CREDENTIALS_BASE64=.*$', "FIREBASE_CREDENTIALS_BASE64=$b64"
} else {
    $contenido += "FIREBASE_CREDENTIALS_BASE64=$b64`n"
}
# Sin BOM: un BOM rompería la primera variable del .env.
[IO.File]::WriteAllText($envPath, $contenido, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "Credenciales guardadas en .env (PUSH_ENABLED=true)"

if ($SetGitHubSecret) {
    if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
        throw "GitHub CLI (gh) no está instalado. Sube el secreto manualmente."
    }
    $b64Google = [Convert]::ToBase64String([IO.File]::ReadAllBytes($destino))
    $b64Google | gh secret set GOOGLE_SERVICES_JSON_BASE64
    Write-Host "Secreto GOOGLE_SERVICES_JSON_BASE64 configurado en GitHub"
}

if (-not $SkipRestart) {
    Push-Location $root
    try {
        docker compose -f docker-compose.yml -f docker-compose.local.yml up -d backend
    } finally {
        Pop-Location
    }
}

Write-Host ""
Write-Host "Siguiente paso: recompila la APK con push habilitado:"
Write-Host '  cd frontend'
Write-Host '  $env:VITE_API_URL = "http://TU_IP:5174/api/v1"'
Write-Host '  $env:VITE_FCM_ENABLED = "true"'
Write-Host '  npm run build; npx cap sync android'
Write-Host ""
Write-Host "O ejecuta el workflow 'APK Android': si el secreto existe, ya compila con push."
