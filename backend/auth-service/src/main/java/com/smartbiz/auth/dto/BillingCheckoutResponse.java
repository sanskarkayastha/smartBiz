package com.smartbiz.auth.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record BillingCheckoutResponse(
    UUID paymentId,
    String status,
    BigDecimal amount,
    String currency,
    CheckoutAction action,
    LocalDateTime expiresAt
) {
    public record CheckoutAction(String type, String url) {}
}
