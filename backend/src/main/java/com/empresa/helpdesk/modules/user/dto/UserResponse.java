package com.empresa.helpdesk.modules.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {
    private Long id;
    private String username;
    private String email;
    private String nombre;
    private String apellidos;
    private String telefono;
    private String direccion;
    private boolean activo;
    private List<String> roles;
    private LocalDateTime ultimaConexion;
    private String estadoConexion;

    // ===== Dispositivo y conexión =====
    private String dispositivoTipo;   // PC | MOVIL | TABLET
    private String dispositivoModelo;
    private String dispositivoSo;
    private String navegador;
    private String ipUltima;
}
