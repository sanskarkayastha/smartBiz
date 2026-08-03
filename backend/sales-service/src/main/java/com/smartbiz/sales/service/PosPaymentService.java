package com.smartbiz.sales.service;

import com.smartbiz.payment.EsewaSigner;
import com.smartbiz.payment.EsewaStatus;
import com.smartbiz.sales.dto.*;
import com.smartbiz.sales.exception.PaymentException;
import com.smartbiz.sales.model.*;
import com.smartbiz.sales.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class PosPaymentService {
    private static final String INVENTORY_RESERVATIONS = "http://INVENTORY-SERVICE/inventory/internal/stock-reservations";

    private final MerchantEsewaProfileRepository profileRepository;
    private final PosPaymentAttemptRepository attemptRepository;
    private final SaleRepository saleRepository;
    private final SalesService salesService;
    private final CredentialCipher credentialCipher;
    private final RestTemplate restTemplate;

    @Value("${app.internal-service-token:smartbiz-internal-dev-token}") private String internalServiceToken;
    @Value("${app.esewa.environment:UAT}") private String environment;
    @Value("${app.esewa.public-base-url:http://localhost:8080}") private String publicBaseUrl;
    @Value("${app.esewa.intent-book-url:https://rc-checkout.esewa.com.np/api/client/intent/payment/book}") private String bookUrl;
    @Value("${app.esewa.intent-status-url:https://rc-checkout.esewa.com.np/api/client/intent/payment/status}") private String statusUrl;
    @Value("${app.esewa.intent-cancel-url:https://rc-checkout.esewa.com.np/api/client/intent/payment/cancel}") private String cancelUrl;
    @Value("${app.esewa.uat-product-code:INTENT}") private String uatProductCode;
    @Value("${app.esewa.uat-access-key:LB0REg8HUSw3MTYrI1s6JTE8Kyc6JyAqJiA3MQ==}") private String uatAccessKey;

    public EsewaMerchantSettingsResponse settings(Long userId) {
        return profileFor(userId).map(this::settingsResponse)
            .orElse(new EsewaMerchantSettingsResponse(false, null, environment, null));
    }

    @Transactional
    public EsewaMerchantSettingsResponse saveSettings(Long userId, EsewaMerchantSettingsRequest request) {
        if (attemptRepository.existsByUserIdAndStatusIn(userId, List.of("BOOKED", "PENDING", "REVIEW"))) {
            throw new PaymentException("Resolve pending eSewa payments before replacing merchant credentials");
        }
        MerchantEsewaProfile profile = profileRepository.findById(userId).orElseGet(MerchantEsewaProfile::new);
        profile.setUserId(userId);
        profile.setProductCode(request.productCode().trim());
        profile.setEncryptedAccessKey(credentialCipher.encrypt(request.accessKey().trim()));
        profile.setEnvironment(environment);
        return settingsResponse(profileRepository.saveAndFlush(profile));
    }

    @Transactional
    public void deleteSettings(Long userId) {
        boolean pending = attemptRepository.existsByUserIdAndStatusIn(userId, List.of("BOOKED", "PENDING", "REVIEW"));
        if (pending) throw new PaymentException("Resolve pending eSewa payments before disconnecting the merchant account");
        profileRepository.deleteById(userId);
    }

    @Transactional
    public PosPaymentResponse create(Long userId, CreateSaleRequest request) {
        MerchantEsewaProfile profile = profileFor(userId)
            .orElseThrow(() -> new PaymentException("Connect your eSewa merchant account in Settings first"));
        UUID paymentId = UUID.randomUUID();
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(5);
        SaleDTO sale = salesService.createPendingEsewaSale(userId, request, paymentId, expiresAt);
        reserveStock(paymentId, userId, request, expiresAt);

        PosPaymentAttempt attempt = PosPaymentAttempt.builder()
            .id(paymentId).saleId(sale.getId()).userId(userId).amount(sale.getTotalAmount()).status("PENDING")
            .transactionUuid("POS-" + paymentId.toString().replace("-", ""))
            .expiresAt(expiresAt).build();
        attemptRepository.save(attempt);
        try {
            book(attempt, profile);
            return response(attemptRepository.save(attempt));
        } catch (RuntimeException exception) {
            safeRelease(attempt, false);
            throw exception;
        }
    }

    public PosPaymentResponse get(Long userId, UUID paymentId) {
        PosPaymentAttempt attempt = attemptRepository.findByIdAndUserId(paymentId, userId)
            .orElseThrow(() -> new PaymentException("eSewa payment was not found"));
        if (List.of("BOOKED", "PENDING", "REVIEW").contains(attempt.getStatus())) refresh(attempt);
        return response(attemptRepository.findById(paymentId).orElse(attempt));
    }

    @Transactional
    public PosPaymentResponse cancel(Long userId, UUID paymentId) {
        PosPaymentAttempt attempt = attemptRepository.findByIdAndUserId(paymentId, userId)
            .orElseThrow(() -> new PaymentException("eSewa payment was not found"));
        if ("SUCCEEDED".equals(attempt.getStatus())) throw new PaymentException("A completed payment cannot be canceled");
        resolveForCancellation(attempt);
        return response(attempt);
    }

    @Transactional
    public void callback(UUID paymentId, Map<String, Object> payload) {
        PosPaymentAttempt attempt = attemptRepository.findById(paymentId)
            .orElseThrow(() -> new PaymentException("eSewa payment was not found"));
        MerchantEsewaProfile profile = profileFor(attempt.getUserId())
            .orElseThrow(() -> new PaymentException("eSewa merchant account is no longer connected"));
        verifyCallback(profile, payload);
        EsewaStatus status = EsewaStatus.from(String.valueOf(payload.get("status")));
        if (status.isSuccessful()) {
            EsewaStatus verified = queryStatus(attempt, profile);
            if (!verified.isSuccessful()) throw new PaymentException("eSewa has not confirmed the payment");
            attempt.setReferenceCode(value(payload.get("reference_code")));
            finalizePayment(attempt);
        } else if (status.isTerminalFailure()) {
            release(attempt, "FAILED");
        } else {
            attempt.setStatus(status.requiresReview() ? "REVIEW" : "PENDING");
            attemptRepository.save(attempt);
        }
    }

    @Scheduled(fixedDelay = 60_000)
    public void reconcileExpired() {
        for (PosPaymentAttempt attempt : attemptRepository.findByStatusInAndExpiresAtBefore(
            List.of("BOOKED", "PENDING", "REVIEW"), LocalDateTime.now())) {
            try { resolveForCancellation(attempt); }
            catch (Exception exception) { log.warn("Could not reconcile eSewa payment {}: {}", attempt.getId(), exception.getMessage()); }
        }
    }

    private void refresh(PosPaymentAttempt attempt) {
        MerchantEsewaProfile profile = profileFor(attempt.getUserId()).orElse(null);
        if (profile == null || attempt.getBookingId() == null) return;
        try {
            EsewaStatus status = queryStatus(attempt, profile);
            if (status.isSuccessful()) finalizePayment(attempt);
            else if (status.isTerminalFailure()) release(attempt, "FAILED");
            else if (status.requiresReview()) markReview(attempt);
        } catch (Exception exception) {
            markReview(attempt);
        }
    }

    private void resolveForCancellation(PosPaymentAttempt attempt) {
        MerchantEsewaProfile profile = profileFor(attempt.getUserId())
            .orElseThrow(() -> new PaymentException("eSewa merchant account is no longer connected"));
        try {
            EsewaStatus status = queryStatus(attempt, profile);
            if (status.isSuccessful()) { finalizePayment(attempt); return; }
            if (status.isTerminalFailure()) { release(attempt, status == EsewaStatus.CANCELED ? "CANCELED" : "FAILED"); return; }
            EsewaStatus canceled = cancelAtProvider(attempt, profile);
            if (canceled == EsewaStatus.CANCELED) release(attempt, "EXPIRED");
            else markReview(attempt);
        } catch (Exception exception) {
            markReview(attempt);
        }
    }

    @SuppressWarnings("unchecked")
    private void book(PosPaymentAttempt attempt, MerchantEsewaProfile profile) {
        String amount = money(attempt.getAmount());
        String secret = credentialCipher.decrypt(profile.getEncryptedAccessKey());
        String signature = EsewaSigner.sign(secret, EsewaSigner.ordered(
            "product_code", profile.getProductCode(), "amount", amount, "transaction_uuid", attempt.getTransactionUuid()
        ));
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("product_code", profile.getProductCode());
        payload.put("amount", amount);
        payload.put("transaction_uuid", attempt.getTransactionUuid());
        payload.put("signed_field_names", "product_code,amount,transaction_uuid");
        payload.put("signature", signature);
        payload.put("callback_url", publicBaseUrl + "/sales/payments/esewa/callback?paymentId=" + attempt.getId());
        payload.put("redirect_url", publicBaseUrl + "/sales/payments/esewa/return?paymentId=" + attempt.getId());
        payload.put("properties", Map.of("sale_id", String.valueOf(attempt.getSaleId()), "remarks", "SmartBiz counter sale"));
        try {
            Map<String, Object> result = RestClient.create().post().uri(bookUrl).contentType(MediaType.APPLICATION_JSON)
                .body(payload).retrieve().body(Map.class);
            Map<String, Object> data = result == null ? null : (Map<String, Object>) result.get("data");
            if (data == null || data.get("deeplink") == null) throw new PaymentException("eSewa did not return a payment link");
            attempt.setBookingId(value(data.get("booking_id")));
            attempt.setCorrelationId(value(data.get("correlation_id")));
            attempt.setDeeplink(value(data.get("deeplink")));
            attempt.setStatus("BOOKED");
        } catch (PaymentException exception) { throw exception; }
        catch (Exception exception) { throw new PaymentException("Could not create eSewa payment: " + exception.getMessage()); }
    }

    @SuppressWarnings("unchecked")
    private EsewaStatus queryStatus(PosPaymentAttempt attempt, MerchantEsewaProfile profile) {
        if (attempt.getBookingId() == null) return EsewaStatus.UNKNOWN;
        String secret = credentialCipher.decrypt(profile.getEncryptedAccessKey());
        String signature = EsewaSigner.sign(secret, EsewaSigner.ordered(
            "booking_id", attempt.getBookingId(), "product_code", profile.getProductCode(), "correlation_id", attempt.getCorrelationId()
        ));
        Map<String, Object> body = Map.of(
            "booking_id", attempt.getBookingId(), "product_code", profile.getProductCode(),
            "correlation_id", attempt.getCorrelationId(),
            "signed_field_names", "booking_id,product_code,correlation_id", "signature", signature
        );
        Map<String, Object> result = RestClient.create().post().uri(statusUrl).contentType(MediaType.APPLICATION_JSON)
            .body(body).retrieve().body(Map.class);
        Map<String, Object> data = result == null ? null : (Map<String, Object>) result.get("data");
        if (data != null && data.get("reference_code") != null) attempt.setReferenceCode(value(data.get("reference_code")));
        return EsewaStatus.from(data == null ? null : value(data.get("status")));
    }

    @SuppressWarnings("unchecked")
    private EsewaStatus cancelAtProvider(PosPaymentAttempt attempt, MerchantEsewaProfile profile) {
        String secret = credentialCipher.decrypt(profile.getEncryptedAccessKey());
        String signature = EsewaSigner.sign(secret, EsewaSigner.ordered(
            "booking_id", attempt.getBookingId(), "product_code", profile.getProductCode()
        ));
        Map<String, Object> body = Map.of("booking_id", attempt.getBookingId(), "product_code", profile.getProductCode(),
            "signed_field_names", "booking_id,product_code", "signature", signature);
        Map<String, Object> result = RestClient.create().post().uri(cancelUrl).contentType(MediaType.APPLICATION_JSON)
            .body(body).retrieve().body(Map.class);
        Map<String, Object> data = result == null ? null : (Map<String, Object>) result.get("data");
        return EsewaStatus.from(data == null ? null : value(data.get("status")));
    }

    private void verifyCallback(MerchantEsewaProfile profile, Map<String, Object> payload) {
        String signedNames = value(payload.get("signed_field_names"));
        LinkedHashMap<String, Object> fields = new LinkedHashMap<>();
        for (String name : signedNames.split(",")) fields.put(name.trim(), payload.get(name.trim()));
        if (!EsewaSigner.verify(credentialCipher.decrypt(profile.getEncryptedAccessKey()), fields, value(payload.get("signature")))) {
            throw new PaymentException("Invalid eSewa callback signature");
        }
    }

    private void finalizePayment(PosPaymentAttempt attempt) {
        if ("SUCCEEDED".equals(attempt.getStatus())) return;
        inventoryTransition(attempt.getId(), "commit");
        salesService.finalizeEsewaSale(attempt.getUserId(), attempt.getSaleId(), attempt.getReferenceCode());
        attempt.setStatus("SUCCEEDED");
        attempt.setCompletedAt(LocalDateTime.now());
        attemptRepository.save(attempt);
    }

    private void release(PosPaymentAttempt attempt, String status) {
        if (List.of("FAILED", "CANCELED", "EXPIRED").contains(attempt.getStatus())) return;
        inventoryTransition(attempt.getId(), "release");
        salesService.cancelEsewaSale(attempt.getUserId(), attempt.getSaleId(), false);
        attempt.setStatus(status);
        attemptRepository.save(attempt);
    }

    private void safeRelease(PosPaymentAttempt attempt, boolean review) {
        try { inventoryTransition(attempt.getId(), "release"); } catch (Exception ignored) {}
        try { salesService.cancelEsewaSale(attempt.getUserId(), attempt.getSaleId(), review); } catch (Exception ignored) {}
        attempt.setStatus(review ? "REVIEW" : "FAILED");
        attemptRepository.save(attempt);
    }

    private void markReview(PosPaymentAttempt attempt) {
        if (!"SUCCEEDED".equals(attempt.getStatus())) {
            attempt.setStatus("REVIEW");
            attemptRepository.save(attempt);
            salesService.cancelEsewaSale(attempt.getUserId(), attempt.getSaleId(), true);
        }
    }

    private void reserveStock(UUID id, Long userId, CreateSaleRequest request, LocalDateTime expiresAt) {
        HttpHeaders headers = internalHeaders();
        Map<String, Object> body = Map.of(
            "reservationId", id, "userId", userId, "expiresAt", expiresAt,
            "items", request.getItems().stream().map(item -> Map.of("productId", item.getProductId(), "quantity", item.getQuantity())).toList()
        );
        restTemplate.exchange(INVENTORY_RESERVATIONS, HttpMethod.POST, new HttpEntity<>(body, headers), Map.class);
    }

    private void inventoryTransition(UUID id, String transition) {
        restTemplate.exchange(INVENTORY_RESERVATIONS + "/" + id + "/" + transition,
            HttpMethod.POST, new HttpEntity<>(null, internalHeaders()), Map.class);
    }

    private HttpHeaders internalHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Internal-Service-Token", internalServiceToken);
        return headers;
    }

    private EsewaMerchantSettingsResponse settingsResponse(MerchantEsewaProfile profile) {
        String code = profile.getProductCode();
        String masked = code.length() <= 4 ? "••••" : code.substring(0, 2) + "••••" + code.substring(code.length() - 2);
        return new EsewaMerchantSettingsResponse(true, masked, profile.getEnvironment(), profile.getUpdatedAt());
    }

    private Optional<MerchantEsewaProfile> profileFor(Long userId) {
        Optional<MerchantEsewaProfile> saved = profileRepository.findById(userId);
        if (saved.isPresent()) return saved;
        if (!"UAT".equalsIgnoreCase(environment) || uatProductCode.isBlank() || uatAccessKey.isBlank()) return Optional.empty();
        return Optional.of(MerchantEsewaProfile.builder()
            .userId(userId).productCode(uatProductCode)
            .encryptedAccessKey(credentialCipher.encrypt(uatAccessKey))
            .environment("UAT").build());
    }

    private PosPaymentResponse response(PosPaymentAttempt attempt) {
        return new PosPaymentResponse(attempt.getId(), attempt.getSaleId(), attempt.getAmount(), "NPR", attempt.getStatus(),
            attempt.getDeeplink(), attempt.getDeeplink(), attempt.getReferenceCode(), attempt.getExpiresAt(), environment);
    }

    private String money(BigDecimal value) { return value.stripTrailingZeros().toPlainString(); }
    private String value(Object value) { return value == null ? "" : String.valueOf(value); }
}
