package com.empresa.helpdesk.modules.inventario.service;

import com.empresa.helpdesk.modules.inventario.dto.CategoriaActivoRequest;
import com.empresa.helpdesk.modules.inventario.entity.CategoriaActivo;
import com.empresa.helpdesk.modules.inventario.repository.CategoriaActivoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class CategoriaActivoService {

    private final CategoriaActivoRepository categoriaRepository;

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listar() {
        return categoriaRepository.findAll(sortByNombre()).stream().map(this::toMap).toList();
    }

    @Transactional
    public Map<String, Object> crear(CategoriaActivoRequest request) {
        CategoriaActivo c = CategoriaActivo.builder()
                .nombre(request.getNombre().trim())
                .descripcion(request.getDescripcion())
                .campos(request.getCampos() != null ? request.getCampos() : new ArrayList<>())
                .build();
        c = categoriaRepository.save(c);
        return toMap(c);
    }

    @Transactional
    public Map<String, Object> actualizar(Long id, CategoriaActivoRequest request) {
        CategoriaActivo c = categoriaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Categoría no encontrada"));
        c.setNombre(request.getNombre().trim());
        c.setDescripcion(request.getDescripcion());
        if (request.getCampos() != null) c.setCampos(request.getCampos());
        c = categoriaRepository.save(c);
        return toMap(c);
    }

    @Transactional
    public void eliminar(Long id) {
        categoriaRepository.deleteById(id);
    }

    private org.springframework.data.domain.Sort sortByNombre() {
        return org.springframework.data.domain.Sort.by("nombre");
    }

    private Map<String, Object> toMap(CategoriaActivo c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", c.getId());
        m.put("nombre", c.getNombre());
        m.put("descripcion", c.getDescripcion());
        m.put("campos", c.getCampos());
        return m;
    }
}
