package com.smartbiz.auth.dto;

public record GoogleUserProfile(
    String subject,
    String email,
    boolean emailVerified,
    String fullName
) {}
