package com.smartbiz.sales.controller;

import com.smartbiz.sales.dto.CreateSaleRequest;
import com.smartbiz.sales.dto.DailyRevenueDTO;
import com.smartbiz.sales.dto.ImportSalesRequest;
import com.smartbiz.sales.dto.SaleDTO;
import com.smartbiz.sales.dto.SaleSummaryDTO;
import com.smartbiz.sales.service.SalesService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
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

    @PostMapping("/import")
    public ResponseEntity<List<SaleDTO>> importSales(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody ImportSalesRequest request) {
        return ResponseEntity.status(201).body(salesService.importSales(userId, request));
    }

    @GetMapping
    public ResponseEntity<List<SaleDTO>> getSales(
            @RequestHeader("X-User-Id") Long userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false, name = "dateFrom") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false, name = "dateTo") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo) {
        return ResponseEntity.ok(salesService.getSalesByUser(userId, date, dateFrom, dateTo));
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

    @GetMapping("/analytics/weekly")
    public ResponseEntity<List<DailyRevenueDTO>> getWeeklySummary(@RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(salesService.getWeeklySummary(userId));
    }
}
