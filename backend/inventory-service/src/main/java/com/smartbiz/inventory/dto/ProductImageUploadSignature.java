package com.smartbiz.inventory.dto;

public record ProductImageUploadSignature(
    String uploadUrl,
    String apiKey,
    long timestamp,
    String signature,
    String publicId,
    String uploadPreset
) {}
