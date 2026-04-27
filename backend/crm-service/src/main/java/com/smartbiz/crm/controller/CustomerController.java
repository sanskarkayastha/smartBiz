package com.smartbiz.crm.controller;

import com.smartbiz.crm.dto.CreateCustomerRequest;
import com.smartbiz.crm.dto.CustomerDTO;
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
    public ResponseEntity<List<CustomerDTO>> getCustomers(@RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(crmService.findByUserId(userId));
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
}
