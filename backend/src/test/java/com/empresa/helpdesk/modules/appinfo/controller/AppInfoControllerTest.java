package com.empresa.helpdesk.modules.appinfo.controller;

import com.empresa.helpdesk.modules.appinfo.dto.AppVersionResponse;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AppInfoControllerTest {

    @Test
    void exponeLaVersionPublicada() {
        AppInfoController controller = new AppInfoController(
                7, "1.4.0", "https://midominio.com/helpdesk.apk", "Chat y cámara", true);

        AppVersionResponse response = controller.version();

        assertEquals(7, response.versionCode());
        assertEquals("1.4.0", response.versionName());
        assertEquals("https://midominio.com/helpdesk.apk", response.apkUrl());
        assertEquals("Chat y cámara", response.notes());
        assertTrue(response.mandatory());
    }

    @Test
    void funcionaSinApkPublicada() {
        AppInfoController controller = new AppInfoController(1, "1.0.0", "", "", false);

        AppVersionResponse response = controller.version();

        assertEquals(1, response.versionCode());
        assertEquals("", response.apkUrl());
        assertFalse(response.mandatory());
    }
}
