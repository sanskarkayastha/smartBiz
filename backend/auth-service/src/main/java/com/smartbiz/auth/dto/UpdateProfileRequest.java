package com.smartbiz.auth.dto;

public record UpdateProfileRequest(
    String fullName,
    String phone
) {}
