package com.smartbiz.ai.dto;

public record ImportSessionArtifactRequest(
        String kind,
        String label,
        String image,
        String mimeType,
        String fileText,
        String sourceIntent
) {}
