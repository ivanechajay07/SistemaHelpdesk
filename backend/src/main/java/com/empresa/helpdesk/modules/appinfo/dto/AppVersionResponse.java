package com.empresa.helpdesk.modules.appinfo.dto;

/**
 * Información de la última versión publicada de la APK.
 *
 * @param versionCode código incremental de Android (se compara con App.getInfo().build)
 * @param versionName nombre visible de la versión
 * @param apkUrl      URL directa de descarga del APK
 * @param notes       novedades breves para mostrar al usuario
 * @param mandatory   true si la actualización es obligatoria
 * @param pushEnabled true si el backend tiene FCM configurado
 */
public record AppVersionResponse(
        int versionCode,
        String versionName,
        String apkUrl,
        String notes,
        boolean mandatory,
        boolean pushEnabled
) {
}
