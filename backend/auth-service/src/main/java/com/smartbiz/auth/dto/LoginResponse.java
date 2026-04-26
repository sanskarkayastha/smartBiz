package com.smartbiz.auth.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record LoginResponse(
    @JsonProperty("access_token") String accessToken,
    @JsonProperty("refresh_token") String refreshToken,
    Long userId,
    String email,
    String fullName
) {}
