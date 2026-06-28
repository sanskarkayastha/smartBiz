package com.smartbiz.inventory.controller;

import com.smartbiz.inventory.dto.*;
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
    public ResponseEntity<PagedResponse<SupplierDTO>> getAll(
        @RequestHeader("X-User-Id") Long userId,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(required = false) String search,
        @RequestParam(required = false) Boolean hasBalance) {
        return ResponseEntity.ok(supplierService.getSuppliers(userId, page, size, search, hasBalance));
    }

    @PostMapping
    public ResponseEntity<SupplierDTO> create(
        @RequestHeader("X-User-Id") Long userId,
        @Valid @RequestBody CreateSupplierRequest request) {
        return ResponseEntity.status(201).body(supplierService.createSupplier(userId, request));
    }

    @GetMapping("/summary")
    public ResponseEntity<SupplierSummaryDTO> getSummary(@RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(supplierService.getSummary(userId));
    }

    @GetMapping("/{id}/products")
    public ResponseEntity<List<SupplierProductDTO>> getProducts(
        @RequestHeader("X-User-Id") Long userId,
        @PathVariable Long id) {
        return ResponseEntity.ok(supplierService.getProductsBySupplier(userId, id));
    }

    @GetMapping("/{id}/ledger")
    public ResponseEntity<List<SupplierLedgerEntryDTO>> getLedger(
        @RequestHeader("X-User-Id") Long userId,
        @PathVariable Long id) {
        return ResponseEntity.ok(supplierService.getLedger(userId, id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SupplierDTO> update(
        @RequestHeader("X-User-Id") Long userId,
        @PathVariable Long id,
        @Valid @RequestBody UpdateSupplierRequest request) {
        return ResponseEntity.ok(supplierService.updateSupplier(userId, id, request));
    }

    @PostMapping("/{id}/payments")
    public ResponseEntity<SupplierDTO> recordPayment(
        @RequestHeader("X-User-Id") Long userId,
        @PathVariable Long id,
        @Valid @RequestBody RecordSupplierPaymentRequest request) {
        return ResponseEntity.ok(supplierService.recordPayment(userId, id, request));
    }

    @PostMapping("/{id}/adjustments")
    public ResponseEntity<SupplierDTO> adjustBalance(
        @RequestHeader("X-User-Id") Long userId,
        @PathVariable Long id,
        @Valid @RequestBody AdjustSupplierBalanceRequest request) {
        return ResponseEntity.ok(supplierService.adjustBalance(userId, id, request));
    }
}
