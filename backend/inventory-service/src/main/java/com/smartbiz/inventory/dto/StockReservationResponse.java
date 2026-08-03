package com.smartbiz.inventory.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record StockReservationResponse(UUID reservationId, String status, LocalDateTime expiresAt) {}
