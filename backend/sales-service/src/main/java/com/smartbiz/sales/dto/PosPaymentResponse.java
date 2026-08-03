package com.smartbiz.sales.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record PosPaymentResponse(
    UUID paymentId,
    Long saleId,
    BigDecimal amount,
    String currency,
    String status,
    String qrPayload,
    String deeplink,
    String referenceCode,
    LocalDateTime expiresAt,
    String environment
) {}
