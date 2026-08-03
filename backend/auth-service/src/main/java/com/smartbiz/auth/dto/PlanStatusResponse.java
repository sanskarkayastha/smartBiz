package com.smartbiz.auth.dto;

import java.time.LocalDateTime;
import java.util.Map;

public record PlanStatusResponse(
    String effectivePlan,
    String source,
    LocalDateTime validUntil,
    LocalDateTime trialEndsAt,
    LocalDateTime paidUntil,
    Map<String, Integer> limits,
    Map<String, Integer> usage,
    boolean usageAvailable,
    Map<String, Boolean> usageAvailability
) {}
