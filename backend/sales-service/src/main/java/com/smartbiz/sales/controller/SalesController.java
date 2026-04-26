package com.smartbiz.sales.controller;

import com.smartbiz.sales.dto.CreateSaleRequest;
import com.smartbiz.sales.dto.SaleDTO;
import com.smartbiz.sales.dto.SaleSummaryDTO;
import com.smartbiz.sales.service.SalesService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/sales")
@RequiredArgsConstructor
public class SalesController {

    private final SalesService salesService;

    @PostMapping
    public ResponseEntity<SaleDTO> createSale(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody CreateSaleRequest request) {
        return ResponseEntity.status(201).body(salesService.createSale(userId, request));
    }

    @GetMapping
    public ResponseEntity<List<SaleDTO>> getSales(@RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(salesService.getSalesByUser(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<SaleDTO> getSale(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long id) {
        return ResponseEntity.ok(salesService.getSaleById(userId, id));
    }

    @GetMapping("/analytics/today")
    public ResponseEntity<SaleSummaryDTO> getDailySummary(@RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(salesService.getDailySummary(userId));
    }
}
