package com.smartbiz.sales.dto;

import jakarta.validation.constraints.NotBlank;

public record EsewaMerchantSettingsRequest(
    @NotBlank String productCode,
    @NotBlank String accessKey
) {}
