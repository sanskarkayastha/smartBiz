package com.smartbiz.inventory.service;

import com.smartbiz.inventory.dto.CategoryDTO;
import com.smartbiz.inventory.exception.CategoryAlreadyExistsException;
import com.smartbiz.inventory.model.Category;
import com.smartbiz.inventory.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class CategoryService {

    private static final String CACHE_NAME = "categories";

    private final CategoryRepository categoryRepository;

    @Cacheable(value = CACHE_NAME, key = "#userId")
    public List<CategoryDTO> getAll(Long userId) {
        return categoryRepository.findByUserIdOrderByNameAsc(userId)
                .stream()
                .map(CategoryDTO::from)
                .toList();
    }

    @CacheEvict(value = CACHE_NAME, key = "#userId")
    public CategoryDTO create(Long userId, String name) {
        String trimmed = name.trim();
        if (categoryRepository.existsByUserIdAndNameIgnoreCase(userId, trimmed)) {
            throw new CategoryAlreadyExistsException(trimmed);
        }
        Category saved = categoryRepository.save(
                Category.builder().userId(userId).name(trimmed).build()
        );
        return CategoryDTO.from(saved);
    }

    @CacheEvict(value = CACHE_NAME, key = "#userId")
    public CategoryDTO rename(Long userId, Long id, String name) {
        Category cat = categoryRepository.findById(id)
                .filter(c -> c.getUserId().equals(userId))
                .orElseThrow(() -> new RuntimeException("Category not found"));
        String trimmed = name.trim();
        if (categoryRepository.existsByUserIdAndNameIgnoreCase(userId, trimmed)) {
            throw new CategoryAlreadyExistsException(trimmed);
        }
        cat.setName(trimmed);
        return CategoryDTO.from(categoryRepository.save(cat));
    }

    @CacheEvict(value = CACHE_NAME, key = "#userId")
    public void delete(Long userId, Long id) {
        Category cat = categoryRepository.findById(id)
                .filter(c -> c.getUserId().equals(userId))
                .orElseThrow(() -> new RuntimeException("Category not found"));
        categoryRepository.delete(cat);
    }
}
