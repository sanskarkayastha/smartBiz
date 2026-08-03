package com.smartbiz.auth.dto;

import jakarta.validation.constraints.NotNull;

public record BillingCheckoutRequest(
    @NotNull PaymentProvider provider,
    @NotNull BillingTerm term,
    @NotNull CheckoutSurface surface
) {}
