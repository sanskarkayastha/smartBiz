package com.smartbiz.auth.controller;

import com.smartbiz.auth.dto.*;
import com.smartbiz.auth.model.BillingPayment;
import com.smartbiz.auth.service.BillingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/billing")
@RequiredArgsConstructor
public class BillingController {
    private final BillingService billingService;

    @GetMapping("/plans")
    public PlanCatalogResponse plans() { return billingService.plans(); }

    @GetMapping("/me")
    public PlanStatusResponse status(@RequestHeader("X-User-Id") Long userId) {
        return billingService.status(userId);
    }

    @GetMapping("/internal/entitlements/{userId}")
    public PlanStatusResponse internalStatus(
        @PathVariable Long userId,
        @RequestHeader("X-Internal-Service-Token") String token
    ) { return billingService.internalStatus(userId, token); }

    @PostMapping("/checkouts")
    @ResponseStatus(HttpStatus.CREATED)
    public BillingCheckoutResponse checkout(
        @RequestHeader("X-User-Id") Long userId,
        @Valid @RequestBody BillingCheckoutRequest request
    ) { return billingService.createCheckout(userId, request); }

    @GetMapping("/payments/{id}")
    public BillingPaymentResponse payment(@RequestHeader("X-User-Id") Long userId, @PathVariable UUID id) {
        return billingService.payment(userId, id);
    }

    @GetMapping(value = "/payments/{id}/start", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> start(@PathVariable UUID id, @RequestParam String token) {
        return ResponseEntity.ok().contentType(MediaType.TEXT_HTML).body(billingService.esewaStartPage(id, token));
    }

    @GetMapping("/callbacks/esewa/success")
    public ResponseEntity<Void> esewaSuccess(@RequestParam String data) {
        BillingPayment payment = billingService.handleEsewaSuccess(data);
        return ResponseEntity.status(HttpStatus.FOUND).location(URI.create(billingService.returnUrl(payment))).build();
    }

    @GetMapping("/callbacks/esewa/failure")
    public ResponseEntity<Void> esewaFailure(@RequestParam UUID paymentId) {
        BillingPayment payment = billingService.handleEsewaFailure(paymentId);
        return ResponseEntity.status(HttpStatus.FOUND).location(URI.create(billingService.returnUrl(payment))).build();
    }

    @PostMapping("/webhooks/stripe")
    public Map<String, Boolean> stripeWebhook(
        @RequestBody String payload,
        @RequestHeader("Stripe-Signature") String signature
    ) {
        billingService.handleStripeWebhook(payload, signature);
        return Map.of("received", true);
    }
}
