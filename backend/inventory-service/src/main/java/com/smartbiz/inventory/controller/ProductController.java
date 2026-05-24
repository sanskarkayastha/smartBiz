package com.smartbiz.inventory.controller;

import com.smartbiz.inventory.dto.*;
import com.smartbiz.inventory.service.ProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/inventory/products")
@RequiredArgsConstructor
public class ProductController {
    private final ProductService productService;

    @GetMapping
    public ResponseEntity<PagedResponse<ProductDTO>> getAll(
        @RequestHeader("X-User-Id") Long userId,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(productService.findAll(userId, page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductDTO> getById(
        @RequestHeader("X-User-Id") Long userId,
        @PathVariable Long id) {
        return ResponseEntity.ok(productService.findById(userId, id));
    }

    @GetMapping("/barcode/{barcode}")
    public ResponseEntity<ProductDTO> getByBarcode(
        @RequestHeader("X-User-Id") Long userId,
        @PathVariable String barcode) {
        return ResponseEntity.ok(productService.findByBarcode(userId, barcode));
    }

    @GetMapping("/low-stock")
    public ResponseEntity<List<ProductDTO>> getLowStock(@RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(productService.findLowStock(userId));
    }

    @PostMapping
    public ResponseEntity<ProductDTO> create(
        @RequestHeader("X-User-Id") Long userId,
        @Valid @RequestBody CreateProductRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(productService.create(userId, request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProductDTO> update(
        @RequestHeader("X-User-Id") Long userId,
        @PathVariable Long id,
        @Valid @RequestBody UpdateProductRequest request) {
        return ResponseEntity.ok(productService.update(userId, id, request));
    }

    @PostMapping("/{id}/stock")
    public ResponseEntity<ProductDTO> adjustStock(
        @RequestHeader("X-User-Id") Long userId,
        @PathVariable Long id,
        @Valid @RequestBody StockUpdateRequest request) {
        return ResponseEntity.ok(productService.adjustStock(userId, id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
        @RequestHeader("X-User-Id") Long userId,
        @PathVariable Long id) {
        productService.delete(userId, id);
        return ResponseEntity.noContent().build();
    }
}
