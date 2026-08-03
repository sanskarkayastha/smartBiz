package com.smartbiz.inventory.controller;

import com.smartbiz.inventory.dto.*;
import com.smartbiz.inventory.service.StockReservationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/inventory/internal/stock-reservations")
@RequiredArgsConstructor
public class StockReservationController {
    private final StockReservationService service;

    @PostMapping
    public StockReservationResponse reserve(
        @RequestHeader("X-Internal-Service-Token") String token,
        @Valid @RequestBody StockReservationRequest request
    ) { return service.reserve(token, request); }

    @PostMapping("/{id}/commit")
    public StockReservationResponse commit(@RequestHeader("X-Internal-Service-Token") String token, @PathVariable UUID id) {
        return service.commit(token, id);
    }

    @PostMapping("/{id}/release")
    public StockReservationResponse release(@RequestHeader("X-Internal-Service-Token") String token, @PathVariable UUID id) {
        return service.release(token, id);
    }
}
