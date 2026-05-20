package com.smartbiz.ai.dto;

public record ParsedLead(
    String name,
    String phone,
    String email,
    String notes,
    String followUpDate,
    Double estimatedValue,
    String source,
    String stage
) {}
