package com.empresa.helpdesk.modules.catalog.service;

import com.empresa.helpdesk.modules.catalog.dto.SedeRequest;
import com.empresa.helpdesk.modules.catalog.dto.SedeResponse;
import com.empresa.helpdesk.modules.catalog.entity.Entidad;
import com.empresa.helpdesk.modules.catalog.entity.Sede;
import com.empresa.helpdesk.modules.catalog.repository.EntidadRepository;
import com.empresa.helpdesk.modules.catalog.repository.SedeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CatalogService {

    private final EntidadRepository entidadRepository;
    private final SedeRepository sedeRepository;

    @Transactional(readOnly = true)
    public List<SedeResponse> getSedes() {
        return sedeRepository.findAllWithEntidad().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<String> getEntidades() {
        return entidadRepository.findAll().stream()
                .map(Entidad::getNombre)
                .sorted(String.CASE_INSENSITIVE_ORDER)
                .collect(Collectors.toList());
    }

    @Transactional
    public SedeResponse createSede(SedeRequest request) {
        Entidad entidad = resolveEntidad(request);
        Sede sede = Sede.builder()
                .nombre(request.getNombre().trim())
                .descripcion(trimOrNull(request.getDescripcion()))
                .entidad(entidad)
                .build();
        return mapToResponse(sedeRepository.save(sede));
    }

    @Transactional
    public SedeResponse updateSede(Long id, SedeRequest request) {
        Sede sede = sedeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Sede no encontrada"));
        Entidad entidad = resolveEntidad(request);
        sede.setNombre(request.getNombre().trim());
        sede.setDescripcion(trimOrNull(request.getDescripcion()));
        sede.setEntidad(entidad);
        return mapToResponse(sedeRepository.save(sede));
    }

    @Transactional
    public void deleteSede(Long id) {
        if (!sedeRepository.existsById(id)) {
            throw new RuntimeException("Sede no encontrada");
        }
        sedeRepository.deleteById(id);
    }

    private Entidad resolveEntidad(SedeRequest request) {
        if (request.getEntidadId() != null) {
            return entidadRepository.findById(request.getEntidadId())
                    .orElseThrow(() -> new RuntimeException("Entidad no encontrada"));
        }
        String nombre = request.getEntidadNombre() == null ? "" : request.getEntidadNombre().trim();
        if (nombre.isEmpty()) {
            throw new RuntimeException("La entidad es obligatoria");
        }
        return entidadRepository.findByNombreIgnoreCase(nombre)
                .orElseGet(() -> entidadRepository.save(Entidad.builder().nombre(nombre).build()));
    }

    private String trimOrNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private SedeResponse mapToResponse(Sede sede) {
        return SedeResponse.builder()
                .id(sede.getId())
                .nombre(sede.getNombre())
                .descripcion(sede.getDescripcion())
                .entidadId(sede.getEntidad().getId())
                .entidadNombre(sede.getEntidad().getNombre())
                .build();
    }
}
