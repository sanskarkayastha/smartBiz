package com.smartbiz.sales.controller;

import com.smartbiz.sales.repository.SaleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.*;
import java.util.Map;

@RestController
@RequestMapping("/sales/internal/usage")
@RequiredArgsConstructor
public class InternalUsageController {
    private final SaleRepository saleRepository;
    @Value("${app.internal-service-token:smartbiz-internal-dev-token}") private String internalToken;

    @GetMapping("/{userId}")
    public Map<String, Long> usage(@PathVariable Long userId, @RequestHeader("X-Internal-Service-Token") String token) {
        requireInternal(token);
        LocalDate period = LocalDate.now(ZoneId.of("Asia/Kathmandu")).withDayOfMonth(1);
        return Map.of("sales", saleRepository.countQuotaSales(userId, period.atStartOfDay(), period.plusMonths(1).atStartOfDay()));
    }

    private void requireInternal(String token) {
        if (!MessageDigest.isEqual(internalToken.getBytes(StandardCharsets.UTF_8), token.getBytes(StandardCharsets.UTF_8))) {
            throw new IllegalArgumentException("Invalid internal service token");
        }
    }
}
