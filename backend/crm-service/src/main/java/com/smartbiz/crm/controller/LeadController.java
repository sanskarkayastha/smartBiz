package com.smartbiz.crm.controller;

import com.smartbiz.crm.dto.CreateLeadRequest;
import com.smartbiz.crm.dto.CustomerDTO;
import com.smartbiz.crm.dto.LeadDTO;
import com.smartbiz.crm.dto.PagedResponse;
import com.smartbiz.crm.dto.UpdateLeadRequest;
import com.smartbiz.crm.service.LeadService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/leads")
@RequiredArgsConstructor
public class LeadController {

    private final LeadService leadService;

    @GetMapping
    public ResponseEntity<PagedResponse<LeadDTO>> getLeads(
            @RequestHeader("X-User-Id") Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String stage,
            @RequestParam(required = false) String source,
            @RequestParam(required = false) Boolean overdueOnly) {
        return ResponseEntity.ok(leadService.getLeads(userId, page, size, search, stage, source, overdueOnly));
    }

    @GetMapping("/{id}")
    public ResponseEntity<LeadDTO> getLead(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long id) {
        return ResponseEntity.ok(leadService.getLead(id, userId));
    }

    @PostMapping
    public ResponseEntity<LeadDTO> createLead(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody CreateLeadRequest request) {
        return ResponseEntity.status(201).body(leadService.createLead(userId, request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<LeadDTO> updateLead(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long id,
            @RequestBody UpdateLeadRequest request) {
        return ResponseEntity.ok(leadService.updateLead(id, userId, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteLead(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long id) {
        leadService.deleteLead(id, userId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/convert")
    public ResponseEntity<CustomerDTO> convertToCustomer(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long id) {
        return ResponseEntity.status(201).body(leadService.convertToCustomer(id, userId));
    }
}
