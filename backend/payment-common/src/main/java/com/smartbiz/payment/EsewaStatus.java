package com.smartbiz.payment;

import java.util.Locale;

public enum EsewaStatus {
    BOOKED,
    PENDING,
    SUCCESS,
    COMPLETE,
    FAILED,
    CANCELED,
    REVERTED,
    FULL_REFUND,
    PARTIAL_REFUND,
    NOT_FOUND,
    AMBIGUOUS,
    UNKNOWN;

    public static EsewaStatus from(String raw) {
        if (raw == null || raw.isBlank()) return UNKNOWN;
        try {
            return valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ignored) {
            return UNKNOWN;
        }
    }

    public boolean isSuccessful() {
        return this == SUCCESS || this == COMPLETE;
    }

    public boolean isTerminalFailure() {
        return this == FAILED || this == CANCELED || this == NOT_FOUND;
    }

    public boolean requiresReview() {
        return this == AMBIGUOUS || this == UNKNOWN;
    }
}
