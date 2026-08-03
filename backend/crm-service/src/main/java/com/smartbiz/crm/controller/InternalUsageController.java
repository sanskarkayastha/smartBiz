package com.smartbiz.crm.controller;

import com.smartbiz.crm.repository.CustomerRepository;
import com.smartbiz.crm.repository.LeadRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;

@RestController
@RequestMapping("/customers/internal/usage")
@RequiredArgsConstructor
public class InternalUsageController {
    private final CustomerRepository customerRepository;
    private final LeadRepository leadRepository;
    @Value("${app.internal-service-token:smartbiz-internal-dev-token}") private String internalToken;

    @GetMapping("/{userId}")
    public Map<String, Long> usage(@PathVariable Long userId, @RequestHeader("X-Internal-Service-Token") String token) {
        requireInternal(token);
        return Map.of("customers", customerRepository.countByUserId(userId), "leads", leadRepository.countByUserId(userId));
    }

    private void requireInternal(String token) {
        if (!MessageDigest.isEqual(internalToken.getBytes(StandardCharsets.UTF_8), token.getBytes(StandardCharsets.UTF_8))) {
            throw new IllegalArgumentException("Invalid internal service token");
        }
    }
}
