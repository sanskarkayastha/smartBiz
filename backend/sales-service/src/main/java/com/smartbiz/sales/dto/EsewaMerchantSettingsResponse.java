package com.smartbiz.sales.dto;

import java.time.LocalDateTime;

public record EsewaMerchantSettingsResponse(
    boolean configured,
    String maskedProductCode,
    String environment,
    LocalDateTime updatedAt
) {}
