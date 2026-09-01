package com.empresa.helpdesk.modules.inventario.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "inventario_categorias")
public class CategoriaActivo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 100)
    private String nombre;

    @Column(columnDefinition = "TEXT")
    private String descripcion;

    @Builder.Default
    private boolean activo = true;

    // Lista de claves de especificación técnica que aplican a esta categoría
    // (p.ej. Laptop -> ["Procesador","RAM","Disco","Pantalla","Sistema operativo"])
    @ElementCollection
    @CollectionTable(name = "inventario_categoria_campos", joinColumns = @JoinColumn(name = "categoria_id"))
    @Column(name = "campo", length = 100)
    @Builder.Default
    private List<String> campos = new ArrayList<>();
}
