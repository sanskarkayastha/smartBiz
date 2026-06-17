package com.smartbiz.ai.dto;

public record ImportSessionCommitResult(
        Long sessionId,
        String message,
        int createdProducts,
        int updatedProducts,
        int importedSales
) {}
