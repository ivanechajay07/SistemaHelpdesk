package com.empresa.helpdesk.security;

/**
 * Política única de contraseñas para registro, creación de usuarios,
 * cambio y restablecimiento.
 *
 * 8–12 caracteres, al menos una mayúscula, una minúscula, un número y un
 * carácter especial (sin contar espacios).
 */
public final class PasswordPolicy {

    public static final String REGEX =
            "^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[^A-Za-z0-9\\s]).{8,12}$";

    public static final String MESSAGE =
            "La contraseña debe tener entre 8 y 12 caracteres, al menos una mayúscula, "
            + "una minúscula, un número y un carácter especial";

    private PasswordPolicy() {
    }
}
