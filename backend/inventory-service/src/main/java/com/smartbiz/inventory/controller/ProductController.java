package com.smartbiz.inventory.controller;

import com.smartbiz.inventory.dto.*;
import com.smartbiz.inventory.service.ProductService;
import com.smartbiz.inventory.service.ProductImageService;
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
    private final ProductImageService productImageService;

    @GetMapping
    public ResponseEntity<PagedResponse<ProductDTO>> getAll(
        @RequestHeader("X-User-Id") Long userId,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(required = false) String search,
        @RequestParam(required = false) String category,
        @RequestParam(required = false) String stockStatus) {
        return ResponseEntity.ok(productService.findAll(userId, page, size, search, category, stockStatus));
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

    @PostMapping("/{id}/restock")
    public ResponseEntity<ProductDTO> restock(
        @RequestHeader("X-User-Id") Long userId,
        @PathVariable Long id,
        @Valid @RequestBody RestockProductRequest request) {
        return ResponseEntity.ok(productService.restock(userId, id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
        @RequestHeader("X-User-Id") Long userId,
        @PathVariable Long id) {
        productService.delete(userId, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/image/signature")
    public ResponseEntity<ProductImageUploadSignature> createImageUploadSignature(
        @RequestHeader("X-User-Id") Long userId,
        @PathVariable Long id) {
        return ResponseEntity.ok(productImageService.createUploadSignature(userId, id));
    }

    @PutMapping("/{id}/image")
    public ResponseEntity<ProductDTO> attachImage(
        @RequestHeader("X-User-Id") Long userId,
        @PathVariable Long id,
        @Valid @RequestBody ConfirmProductImageRequest request) {
        return ResponseEntity.ok(productImageService.attach(userId, id, request));
    }

    @DeleteMapping("/{id}/image")
    public ResponseEntity<ProductDTO> removeImage(
        @RequestHeader("X-User-Id") Long userId,
        @PathVariable Long id) {
        return ResponseEntity.ok(productImageService.remove(userId, id));
    }

    @PostMapping("/{id}/image/discard")
    public ResponseEntity<Void> discardImage(
        @RequestHeader("X-User-Id") Long userId,
        @PathVariable Long id,
        @Valid @RequestBody ConfirmProductImageRequest request) {
        productImageService.discard(userId, id, request);
        return ResponseEntity.noContent().build();
    }
}
