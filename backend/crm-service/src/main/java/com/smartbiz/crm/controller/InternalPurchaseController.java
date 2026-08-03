package com.smartbiz.crm.controller;

import com.smartbiz.crm.service.CrmService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@RestController
@RequestMapping("/customers/internal/purchases")
@RequiredArgsConstructor
public class InternalPurchaseController {
    private final CrmService crmService;
    @Value("${app.internal-service-token:smartbiz-internal-dev-token}") private String internalToken;

    public record PurchaseRequest(Long userId, Long saleId, Long customerId, BigDecimal amount) {}

    @PostMapping
    public ResponseEntity<Void> apply(@RequestHeader("X-Internal-Service-Token") String token,
                                      @RequestBody PurchaseRequest request) {
        requireInternal(token);
        crmService.updatePurchaseTotalExactlyOnce(request.userId(), request.saleId(), request.customerId(), request.amount());
        return ResponseEntity.ok().build();
    }

    private void requireInternal(String token) {
        if (!MessageDigest.isEqual(internalToken.getBytes(StandardCharsets.UTF_8), token.getBytes(StandardCharsets.UTF_8))) {
            throw new IllegalArgumentException("Invalid internal service token");
        }
    }
}
