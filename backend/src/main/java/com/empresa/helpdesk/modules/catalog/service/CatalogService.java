package com.empresa.helpdesk.modules.catalog.service;

import com.empresa.helpdesk.modules.catalog.dto.EntidadRequest;
import com.empresa.helpdesk.modules.catalog.dto.EntidadResponse;
import com.empresa.helpdesk.modules.catalog.dto.SedeItemRequest;
import com.empresa.helpdesk.modules.catalog.dto.SedeRequest;
import com.empresa.helpdesk.modules.catalog.dto.SedeResponse;
import com.empresa.helpdesk.modules.catalog.entity.Entidad;
import com.empresa.helpdesk.modules.catalog.entity.Sede;
import com.empresa.helpdesk.modules.catalog.repository.EntidadRepository;
import com.empresa.helpdesk.modules.catalog.repository.SedeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
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
    public List<EntidadResponse> getEntidades() {
        return entidadRepository.findAll().stream()
                .sorted((a, b) -> a.getNombre().compareToIgnoreCase(b.getNombre()))
                .map(this::mapToEntidadResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public EntidadResponse createEntidad(EntidadRequest request) {
        String nombre = request.getNombre().trim();
        if (entidadRepository.findByNombreIgnoreCase(nombre).isPresent()) {
            throw new RuntimeException("Ya existe una entidad con el nombre \"" + nombre + "\"");
        }
        Entidad entidad = entidadRepository.save(Entidad.builder().nombre(nombre).build());
        saveSedes(entidad, request.getSedes());
        return mapToEntidadResponse(entidad);
    }

    @Transactional
    public EntidadResponse updateEntidad(Long id, EntidadRequest request) {
        Entidad entidad = entidadRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Entidad no encontrada"));
        String nombre = request.getNombre().trim();
        entidadRepository.findByNombreIgnoreCase(nombre)
                .filter(e -> !e.getId().equals(id))
                .ifPresent(e -> {
                    throw new RuntimeException("Ya existe una entidad con el nombre \"" + nombre + "\"");
                });
        entidad.setNombre(nombre);
        try {
            sedeRepository.deleteByEntidad_Id(id);
            saveSedes(entidad, request.getSedes());
        } catch (DataIntegrityViolationException e) {
            throw new RuntimeException(
                    "No se pueden eliminar las sedes que están asociadas a activos o movimientos del inventario.");
        }
        return mapToEntidadResponse(entidad);
    }

    @Transactional
    public void deleteEntidad(Long id) {
        if (!entidadRepository.existsById(id)) {
            throw new RuntimeException("Entidad no encontrada");
        }
        try {
            sedeRepository.deleteByEntidad_Id(id);
            entidadRepository.deleteById(id);
        } catch (DataIntegrityViolationException e) {
            throw new RuntimeException(
                    "No se puede eliminar la entidad porque tiene activos o movimientos asociados en el inventario.");
        }
    }

    private void saveSedes(Entidad entidad, List<SedeItemRequest> items) {
        for (SedeItemRequest item : items) {
            Sede sede = Sede.builder()
                    .nombre(item.getNombre().trim())
                    .descripcion(trimOrNull(item.getDescripcion()))
                    .entidad(entidad)
                    .build();
            sedeRepository.save(sede);
        }
    }

    private EntidadResponse mapToEntidadResponse(Entidad entidad) {
        List<SedeResponse> sedes = sedeRepository.findByEntidad_Id(entidad.getId()).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
        return EntidadResponse.builder()
                .id(entidad.getId())
                .nombre(entidad.getNombre())
                .sedes(sedes)
                .build();
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
