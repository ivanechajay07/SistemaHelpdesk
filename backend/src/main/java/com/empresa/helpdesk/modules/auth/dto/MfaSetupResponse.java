package com.empresa.helpdesk.modules.auth.dto;

public record MfaSetupResponse(
        String secret,
        String otpauthUrl,
        boolean enabled
) {
}
