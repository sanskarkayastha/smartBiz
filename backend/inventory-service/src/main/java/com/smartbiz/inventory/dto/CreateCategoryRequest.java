package com.smartbiz.inventory.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateCategoryRequest(
    @NotBlank(message = "Category name is required")
    @Size(max = 100, message = "Category name must be 100 characters or less")
    String name
) {}
