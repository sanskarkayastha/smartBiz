package com.smartbiz.auth.dto;

public record SignupResponse(
    String message,
    String email,
    boolean requiresVerification
) {}
