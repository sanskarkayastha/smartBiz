package com.smartbiz.inventory.controller;

import com.smartbiz.inventory.dto.CreateSupplierRequest;
import com.smartbiz.inventory.dto.SupplierDTO;
import com.smartbiz.inventory.dto.SupplierProductDTO;
import com.smartbiz.inventory.dto.UpdateSupplierRequest;
import com.smartbiz.inventory.service.SupplierService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/inventory/suppliers")
@RequiredArgsConstructor
public class SupplierController {
    private final SupplierService supplierService;

    @GetMapping
    public ResponseEntity<List<SupplierDTO>> getAll(@RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(supplierService.getSuppliers(userId));
    }

    @PostMapping
    public ResponseEntity<SupplierDTO> create(
        @RequestHeader("X-User-Id") Long userId,
        @Valid @RequestBody CreateSupplierRequest request) {
        return ResponseEntity.status(201).body(supplierService.createSupplier(userId, request));
    }

    @GetMapping("/{id}/products")
    public ResponseEntity<List<SupplierProductDTO>> getProducts(
        @RequestHeader("X-User-Id") Long userId,
        @PathVariable Long id) {
        return ResponseEntity.ok(supplierService.getProductsBySupplier(userId, id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SupplierDTO> update(
        @RequestHeader("X-User-Id") Long userId,
        @PathVariable Long id,
        @RequestBody UpdateSupplierRequest request) {
        return ResponseEntity.ok(supplierService.updateSupplier(userId, id, request));
    }
}
