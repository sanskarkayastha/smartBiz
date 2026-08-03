package com.smartbiz.inventory.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record StockReservationRequest(
    @NotNull UUID reservationId,
    @NotNull Long userId,
    @NotNull LocalDateTime expiresAt,
    @NotEmpty List<@Valid Item> items
) {
    public record Item(@NotNull Long productId, @Min(1) int quantity) {}
}
