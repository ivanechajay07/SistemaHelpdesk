package com.empresa.helpdesk.modules.correo.service;

import com.empresa.helpdesk.modules.correo.dto.CorreoRequest;
import com.empresa.helpdesk.modules.correo.dto.CorreoResponse;
import com.empresa.helpdesk.modules.correo.dto.CuentaCorreoRequest;
import com.empresa.helpdesk.modules.correo.dto.CuentaResponse;
import com.empresa.helpdesk.modules.correo.entity.CorreoCorporativo;
import com.empresa.helpdesk.modules.correo.entity.CuentaCorreo;
import com.empresa.helpdesk.modules.correo.repository.CorreoCorporativoRepository;
import com.empresa.helpdesk.security.CryptoService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CorreoService {

    private final CorreoCorporativoRepository correoRepository;
    private final CryptoService cryptoService;

    @Transactional(readOnly = true)
    public List<CorreoResponse> list() {
        return correoRepository.findAllWithCuentas().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public CorreoResponse get(Long id) {
        CorreoCorporativo correo = load(id);
        return mapToResponse(correo);
    }

    @Transactional
    public CorreoResponse create(CorreoRequest request) {
        CorreoCorporativo correo = CorreoCorporativo.builder()
                .nombre(request.getNombre().trim())
                .apellidos(request.getApellidos().trim())
                .cargo(request.getCargo().trim())
                .empresa(request.getEmpresa().trim())
                .build();
        correo.setCuentas(request.getCuentas().stream()
                .map(c -> buildCuenta(correo, c))
                .collect(Collectors.toList()));
        return mapToResponse(correoRepository.save(correo));
    }

    @Transactional
    public CorreoResponse update(Long id, CorreoRequest request) {
        CorreoCorporativo correo = load(id);
        correo.setNombre(request.getNombre().trim());
        correo.setApellidos(request.getApellidos().trim());
        correo.setCargo(request.getCargo().trim());
        correo.setEmpresa(request.getEmpresa().trim());
        correo.getCuentas().clear();
        request.getCuentas().forEach(c -> correo.getCuentas().add(buildCuenta(correo, c)));
        return mapToResponse(correoRepository.save(correo));
    }

    @Transactional
    public void delete(Long id) {
        CorreoCorporativo correo = load(id);
        correoRepository.delete(correo);
    }

    @Transactional(readOnly = true)
    public String getPassword(Long correoId, Long cuentaId) {
        CorreoCorporativo correo = load(correoId);
        CuentaCorreo cuenta = correo.getCuentas().stream()
                .filter(c -> c.getId().equals(cuentaId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Cuenta de correo no encontrada"));
        return cryptoService.decrypt(cuenta.getPasswordEncrypted());
    }

    private CuentaCorreo buildCuenta(CorreoCorporativo correo, CuentaCorreoRequest request) {
        return CuentaCorreo.builder()
                .correoCorporativo(correo)
                .email(request.getEmail().trim())
                .passwordEncrypted(cryptoService.encrypt(request.getPassword()))
                .build();
    }

    private CorreoCorporativo load(Long id) {
        return correoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Registro de correo corporativo no encontrado"));
    }

    private CorreoResponse mapToResponse(CorreoCorporativo correo) {
        List<CuentaResponse> cuentas = correo.getCuentas().stream()
                .map(c -> CuentaResponse.builder()
                        .id(c.getId())
                        .email(c.getEmail())
                        .tienePassword(true)
                        .build())
                .collect(Collectors.toList());
        return CorreoResponse.builder()
                .id(correo.getId())
                .nombre(correo.getNombre())
                .apellidos(correo.getApellidos())
                .cargo(correo.getCargo())
                .empresa(correo.getEmpresa())
                .cuentas(cuentas)
                .build();
    }
}