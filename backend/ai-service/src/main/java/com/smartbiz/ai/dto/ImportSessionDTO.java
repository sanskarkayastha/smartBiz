package com.smartbiz.ai.dto;

import java.time.LocalDateTime;
import java.util.List;

public record ImportSessionDTO(
        Long id,
        String status,
        String mode,
        String title,
        String summary,
        LocalDateTime lastActivityAt,
        LocalDateTime closedAt,
        List<ImportArtifactDTO> artifacts,
        ImportSessionReview review
) {}
