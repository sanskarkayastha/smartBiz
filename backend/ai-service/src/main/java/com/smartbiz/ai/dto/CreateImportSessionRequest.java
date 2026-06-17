package com.smartbiz.ai.dto;

public record CreateImportSessionRequest(
        String mode,
        String title,
        Boolean startOver
) {}
