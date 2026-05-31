package com.smartbiz.inventory.controller;

import com.smartbiz.inventory.dto.CategoryDTO;
import com.smartbiz.inventory.dto.CreateCategoryRequest;
import com.smartbiz.inventory.service.CategoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/inventory/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    @GetMapping
    public ResponseEntity<List<CategoryDTO>> getAll(@RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(categoryService.getAll(userId));
    }

    @PostMapping
    public ResponseEntity<CategoryDTO> create(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody CreateCategoryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(categoryService.create(userId, request.name()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CategoryDTO> rename(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(categoryService.rename(userId, id, body.getOrDefault("name", "")));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long id) {
        categoryService.delete(userId, id);
        return ResponseEntity.noContent().build();
    }
}
