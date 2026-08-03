package com.smartbiz.inventory.controller;

import com.smartbiz.inventory.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;

@RestController
@RequestMapping("/inventory/internal/usage")
@RequiredArgsConstructor
public class InternalUsageController {
    private final ProductRepository productRepository;
    @Value("${app.internal-service-token:smartbiz-internal-dev-token}") private String internalToken;

    @GetMapping("/{userId}")
    public Map<String, Long> usage(@PathVariable Long userId, @RequestHeader("X-Internal-Service-Token") String token) {
        requireInternal(token);
        return Map.of("products", productRepository.countByUserId(userId));
    }

    private void requireInternal(String token) {
        if (!MessageDigest.isEqual(internalToken.getBytes(StandardCharsets.UTF_8), token.getBytes(StandardCharsets.UTF_8))) {
            throw new IllegalArgumentException("Invalid internal service token");
        }
    }
}
