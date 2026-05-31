package com.smartbiz.crm.controller;

import com.smartbiz.crm.dto.CreateCustomerRequest;
import com.smartbiz.crm.dto.CustomerDTO;
import com.smartbiz.crm.dto.PagedResponse;
import com.smartbiz.crm.dto.UpdateCustomerRequest;
import com.smartbiz.crm.service.CrmService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CrmService crmService;

    @GetMapping
    public ResponseEntity<PagedResponse<CustomerDTO>> getCustomers(
            @RequestHeader("X-User-Id") Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean hasDue) {
        return ResponseEntity.ok(crmService.findByUserId(userId, page, size, search, hasDue));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CustomerDTO> getCustomer(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long id) {
        return ResponseEntity.ok(crmService.findByIdAndUserId(id, userId));
    }

    @PostMapping
    public ResponseEntity<CustomerDTO> createCustomer(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody CreateCustomerRequest request) {
        return ResponseEntity.status(201).body(crmService.create(userId, request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CustomerDTO> updateCustomer(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long id,
            @RequestBody UpdateCustomerRequest request) {
        return ResponseEntity.ok(crmService.update(id, userId, request));
    }

    @PutMapping("/{id}/purchase")
    public ResponseEntity<Void> updatePurchaseTotal(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long id,
            @RequestBody BigDecimal amount) {
        crmService.updatePurchaseTotal(userId, id, amount);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}/due")
    public ResponseEntity<Void> addDueAmount(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long id,
            @RequestBody BigDecimal amount) {
        crmService.addDueAmount(userId, id, amount);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/with-due")
    public ResponseEntity<List<CustomerDTO>> getCustomersWithDue(@RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(crmService.getCustomersWithDue(userId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCustomer(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long id) {
        crmService.deleteCustomer(id, userId);
        return ResponseEntity.noContent().build();
    }
}
