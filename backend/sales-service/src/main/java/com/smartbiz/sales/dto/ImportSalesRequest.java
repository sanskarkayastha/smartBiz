package com.smartbiz.sales.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record ImportSalesRequest(
        @NotEmpty(message = "At least one sale is required")
        @Valid
        List<CreateSaleRequest> sales
) {}
