package com.empresa.helpdesk.modules.ticket.service;

import com.empresa.helpdesk.modules.ticket.dto.CategoryRequest;
import com.empresa.helpdesk.modules.ticket.dto.CategoryResponse;
import com.empresa.helpdesk.modules.ticket.dto.SubcategoryDto;
import com.empresa.helpdesk.modules.ticket.entity.Category;
import com.empresa.helpdesk.modules.ticket.entity.Subcategory;
import com.empresa.helpdesk.modules.ticket.repository.CategoryRepository;
import com.empresa.helpdesk.modules.ticket.repository.SubcategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final SubcategoryRepository subcategoryRepository;

    @Transactional(readOnly = true)
    public List<CategoryResponse> getAllCategories() {
        return categoryRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public CategoryResponse createCategory(CategoryRequest request) {
        Category category = Category.builder()
                .name(request.getName())
                .description(request.getDescription())
                .active(request.isActive())
                .subcategories(new ArrayList<>())
                .build();

        if (request.getSubcategories() != null) {
            for (SubcategoryDto subDto : request.getSubcategories()) {
                Subcategory sub = Subcategory.builder()
                        .name(subDto.getName())
                        .active(subDto.isActive())
                        .category(category)
                        .build();
                category.getSubcategories().add(sub);
            }
        }

        return mapToResponse(categoryRepository.save(category));
    }

    @Transactional
    public CategoryResponse updateCategory(Long id, CategoryRequest request) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Categoría no encontrada"));

        category.setName(request.getName());
        category.setDescription(request.getDescription());
        category.setActive(request.isActive());

        // Para simplificar, eliminamos las subcategorías actuales y creamos las nuevas si es necesario
        // En un entorno real se haría un merge inteligente.
        subcategoryRepository.deleteAll(category.getSubcategories());
        category.getSubcategories().clear();

        if (request.getSubcategories() != null) {
            for (SubcategoryDto subDto : request.getSubcategories()) {
                Subcategory sub = Subcategory.builder()
                        .name(subDto.getName())
                        .active(subDto.isActive())
                        .category(category)
                        .build();
                category.getSubcategories().add(sub);
            }
        }

        return mapToResponse(categoryRepository.save(category));
    }

    @Transactional
    public void deleteCategory(Long id) {
        categoryRepository.deleteById(id);
    }

    private CategoryResponse mapToResponse(Category category) {
        List<SubcategoryDto> subs = category.getSubcategories() != null ?
                category.getSubcategories().stream().map(s -> SubcategoryDto.builder()
                        .id(s.getId())
                        .name(s.getName())
                        .active(s.isActive())
                        .build()).collect(Collectors.toList())
                : new ArrayList<>();

        return CategoryResponse.builder()
                .id(category.getId())
                .name(category.getName())
                .description(category.getDescription())
                .active(category.isActive())
                .subcategories(subs)
                .build();
    }
}
