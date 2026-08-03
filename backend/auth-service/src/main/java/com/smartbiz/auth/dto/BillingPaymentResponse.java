package com.smartbiz.auth.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record BillingPaymentResponse(
    UUID id,
    String provider,
    String term,
    BigDecimal amount,
    String currency,
    String status,
    LocalDateTime completedAt,
    LocalDateTime expiresAt
) {}
