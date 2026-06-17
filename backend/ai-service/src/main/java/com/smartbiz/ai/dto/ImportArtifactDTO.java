package com.smartbiz.ai.dto;

import java.time.LocalDateTime;

public record ImportArtifactDTO(
        Long id,
        String kind,
        String label,
        String sourceIntent,
        LocalDateTime createdAt
) {}
