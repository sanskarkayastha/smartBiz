package com.smartbiz.inventory.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

public record ConfirmProductImageRequest(
    @NotBlank(message = "Image public ID is required") String publicId,
    @Positive(message = "Image version must be positive") long version,
    @NotBlank(message = "Image signature is required") String signature
) {}
