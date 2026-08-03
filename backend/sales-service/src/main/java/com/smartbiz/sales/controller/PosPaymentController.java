package com.smartbiz.sales.controller;

import com.smartbiz.sales.dto.*;
import com.smartbiz.sales.service.PosPaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/sales")
@RequiredArgsConstructor
public class PosPaymentController {
    private final PosPaymentService paymentService;

    @GetMapping("/payment-settings/esewa")
    public EsewaMerchantSettingsResponse settings(@RequestHeader("X-User-Id") Long userId) {
        return paymentService.settings(userId);
    }

    @PutMapping("/payment-settings/esewa")
    public EsewaMerchantSettingsResponse saveSettings(
        @RequestHeader("X-User-Id") Long userId, @Valid @RequestBody EsewaMerchantSettingsRequest request
    ) { return paymentService.saveSettings(userId, request); }

    @DeleteMapping("/payment-settings/esewa")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteSettings(@RequestHeader("X-User-Id") Long userId) { paymentService.deleteSettings(userId); }

    @PostMapping("/payments/esewa")
    @ResponseStatus(HttpStatus.CREATED)
    public PosPaymentResponse create(
        @RequestHeader("X-User-Id") Long userId, @Valid @RequestBody CreateSaleRequest request
    ) { return paymentService.create(userId, request); }

    @GetMapping("/payments/esewa/{id}")
    public PosPaymentResponse get(@RequestHeader("X-User-Id") Long userId, @PathVariable UUID id) {
        return paymentService.get(userId, id);
    }

    @PostMapping("/payments/esewa/{id}/cancel")
    public PosPaymentResponse cancel(@RequestHeader("X-User-Id") Long userId, @PathVariable UUID id) {
        return paymentService.cancel(userId, id);
    }

    @PostMapping("/payments/esewa/callback")
    public Map<String, Boolean> callback(@RequestParam UUID paymentId, @RequestBody Map<String, Object> payload) {
        paymentService.callback(paymentId, payload);
        return Map.of("received", true);
    }

    @GetMapping(value = "/payments/esewa/return", produces = "text/html")
    public String buyerReturn() {
        return "<!doctype html><html><body><h1>Payment sent</h1><p>Please return to the shopkeeper. SmartBiz will verify the payment.</p></body></html>";
    }
}
