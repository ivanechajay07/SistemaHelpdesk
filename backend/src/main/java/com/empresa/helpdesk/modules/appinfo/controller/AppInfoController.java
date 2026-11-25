package com.empresa.helpdesk.modules.appinfo.controller;

import com.empresa.helpdesk.modules.appinfo.dto.AppVersionResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Expone la versión publicada de la APK para que la app avise de actualizaciones.
 *
 * <p>La distribución es libre (sin Play Store), por lo que la app compara su
 * versionCode con este valor y ofrece descargar el APK cuando hay uno nuevo.</p>
 */
@RestController
@RequestMapping("/api/v1/app")
@Tag(name = "App", description = "Versión y actualización de la aplicación Android")
public class AppInfoController {

    private final int versionCode;
    private final String versionName;
    private final String apkUrl;
    private final String notes;
    private final boolean mandatory;
    private final boolean pushEnabled;

    public AppInfoController(
            @Value("${app.mobile.version-code:1}") int versionCode,
            @Value("${app.mobile.version-name:1.0.0}") String versionName,
            @Value("${app.mobile.apk-url:}") String apkUrl,
            @Value("${app.mobile.notes:}") String notes,
            @Value("${app.mobile.mandatory:false}") boolean mandatory,
            @Value("${app.push.enabled:false}") boolean pushEnabled
    ) {
        this.versionCode = versionCode;
        this.versionName = versionName;
        this.apkUrl = apkUrl;
        this.notes = notes;
        this.mandatory = mandatory;
        this.pushEnabled = pushEnabled;
    }

    @GetMapping("/version")
    @Operation(summary = "Última versión de la APK",
            description = "Público: permite que la app detecte actualizaciones sin iniciar sesión")
    public AppVersionResponse version() {
        return new AppVersionResponse(versionCode, versionName, apkUrl, notes, mandatory, pushEnabled);
    }
}
