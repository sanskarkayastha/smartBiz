package com.smartbiz.auth.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartbiz.auth.dto.*;
import com.smartbiz.auth.exception.BillingException;
import com.smartbiz.auth.model.BillingPayment;
import com.smartbiz.auth.model.ProcessedPaymentEvent;
import com.smartbiz.auth.model.User;
import com.smartbiz.auth.repository.BillingPaymentRepository;
import com.smartbiz.auth.repository.ProcessedPaymentEventRepository;
import com.smartbiz.auth.repository.UserRepository;
import com.smartbiz.payment.EsewaSigner;
import com.smartbiz.payment.EsewaStatus;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.model.checkout.Session;
import com.stripe.net.RequestOptions;
import com.stripe.net.Webhook;
import com.stripe.param.checkout.SessionCreateParams;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class BillingService {
    private static final BigDecimal MONTHLY_PRICE = new BigDecimal("499.00");
    private static final BigDecimal YEARLY_PRICE = new BigDecimal("4999.00");
    private static final Map<String, Integer> FREE_LIMITS = Map.of(
        "products", 100, "sales", 300, "customers", 100, "leads", 100, "aiRequests", 10
    );

    private final UserRepository userRepository;
    private final BillingPaymentRepository paymentRepository;
    private final ProcessedPaymentEventRepository eventRepository;
    private final ObjectMapper objectMapper;

    @Value("${app.billing.public-base-url:http://localhost:8080}") private String publicBaseUrl;
    @Value("${app.billing.web-return-url:http://localhost:3000/dashboard/settings}") private String webReturnUrl;
    @Value("${app.billing.mobile-return-url:smartbiz://billing/result}") private String mobileReturnUrl;
    @Value("${app.billing.stripe.enabled:false}") private boolean stripeEnabled;
    @Value("${app.billing.stripe.secret-key:}") private String stripeSecretKey;
    @Value("${app.billing.stripe.webhook-secret:}") private String stripeWebhookSecret;
    @Value("${app.billing.esewa.enabled:true}") private boolean esewaEnabled;
    @Value("${app.billing.esewa.product-code:EPAYTEST}") private String esewaProductCode;
    @Value("${app.billing.esewa.secret-key:8gBm/:&EnhH.1/q}") private String esewaSecretKey;
    @Value("${app.billing.esewa.form-url:https://rc-epay.esewa.com.np/api/epay/main/v2/form}") private String esewaFormUrl;
    @Value("${app.billing.esewa.status-url:https://uat.esewa.com.np/api/epay/transaction/status/}") private String esewaStatusUrl;
    @Value("${app.internal-service-token:smartbiz-internal-dev-token}") private String internalServiceToken;
    @Value("${app.services.inventory-url:http://INVENTORY-SERVICE:8082}") private String inventoryServiceUrl;
    @Value("${app.services.sales-url:http://SALES-SERVICE:8084}") private String salesServiceUrl;
    @Value("${app.services.crm-url:http://CRM-SERVICE:8083}") private String crmServiceUrl;
    @Value("${app.services.ai-url:http://AI-SERVICE:8085}") private String aiServiceUrl;

    public PlanCatalogResponse plans() {
        List<String> freeFeatures = List.of("Core inventory, sales, customers and leads", "Daily and weekly summaries", "eSewa counter payments");
        List<String> proFeatures = List.of("Everything in Free", "Unlimited records", "AI and voice assistance", "Imports and scanning", "Advanced sales trends");
        return new PlanCatalogResponse(List.of(
            new PlanCatalogResponse.Plan("FREE", "Free", List.of(), freeFeatures, FREE_LIMITS),
            new PlanCatalogResponse.Plan("PRO", "Pro", List.of(
                new PlanCatalogResponse.Price("MONTHLY", 30, MONTHLY_PRICE, "NPR"),
                new PlanCatalogResponse.Price("YEARLY", 365, YEARLY_PRICE, "NPR")
            ), proFeatures, Map.of())
        ));
    }

    public PlanStatusResponse status(Long userId) {
        return status(userId, true);
    }

    private PlanStatusResponse status(Long userId, boolean includeUsage) {
        User user = findUser(userId);
        LocalDateTime now = LocalDateTime.now();
        boolean paid = user.getPaidUntil() != null && user.getPaidUntil().isAfter(now) && "PRO".equals(user.getPaidPlan());
        boolean trial = user.getTrialEndsAt() != null && user.getTrialEndsAt().isAfter(now);
        String source = paid ? "PURCHASED" : trial ? "TRIAL" : "FREE";
        LocalDateTime validUntil = paid ? user.getPaidUntil() : trial ? user.getTrialEndsAt() : null;
        UsageSnapshot usage = includeUsage ? loadUsage(userId) : new UsageSnapshot(Map.of(), false, Map.of());
        return new PlanStatusResponse(
            paid || trial ? "PRO" : "FREE", source, validUntil,
            user.getTrialEndsAt(), user.getPaidUntil(), FREE_LIMITS, usage.values(), usage.complete(), usage.availability()
        );
    }

    public PlanStatusResponse internalStatus(Long userId, String token) {
        if (!constantTimeEquals(internalServiceToken, token)) throw new BillingException("Invalid internal service token");
        return status(userId, false);
    }

    @Transactional
    public BillingCheckoutResponse createCheckout(Long userId, BillingCheckoutRequest request) {
        findUser(userId);
        BigDecimal amount = priceFor(request.term());
        UUID id = UUID.randomUUID();
        String transactionUuid = "SB-" + id.toString().replace("-", "");
        String returnUrl = request.surface() == CheckoutSurface.MOBILE ? mobileReturnUrl : webReturnUrl;
        BillingPayment payment = BillingPayment.builder()
            .id(id).userId(userId).provider(request.provider().name()).billingTerm(request.term().name())
            .amount(amount).currency("NPR").status("PENDING").transactionUuid(transactionUuid)
            .returnUrl(returnUrl).expiresAt(LocalDateTime.now().plusMinutes(30))
            .build();

        if (request.provider() == PaymentProvider.STRIPE) {
            if (!stripeEnabled || stripeSecretKey.isBlank()) throw new BillingException("Stripe test checkout is not enabled");
            createStripeCheckout(payment);
        } else {
            if (!esewaEnabled) throw new BillingException("eSewa checkout is not enabled");
            payment.setStartToken(UUID.randomUUID().toString());
            payment.setCheckoutUrl(publicBaseUrl + "/billing/payments/" + id + "/start?token=" + payment.getStartToken());
        }

        paymentRepository.save(payment);
        return checkoutResponse(payment);
    }

    public BillingPaymentResponse payment(Long userId, UUID id) {
        BillingPayment payment = paymentRepository.findByIdAndUserId(id, userId)
            .orElseThrow(() -> new BillingException("Billing payment was not found"));
        expireIfNeeded(payment);
        return response(payment);
    }

    public String esewaStartPage(UUID id, String token) {
        BillingPayment payment = paymentRepository.findById(id)
            .orElseThrow(() -> new BillingException("Billing payment was not found"));
        if (!"ESEWA".equals(payment.getProvider()) || !constantTimeEquals(payment.getStartToken(), token)) {
            throw new BillingException("Invalid or expired checkout link");
        }
        if (!"PENDING".equals(payment.getStatus()) || payment.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BillingException("Checkout has expired");
        }
        String amount = money(payment.getAmount());
        String signature = EsewaSigner.sign(esewaSecretKey, EsewaSigner.ordered(
            "total_amount", amount, "transaction_uuid", payment.getTransactionUuid(), "product_code", esewaProductCode
        ));
        String success = publicBaseUrl + "/billing/callbacks/esewa/success";
        String failure = publicBaseUrl + "/billing/callbacks/esewa/failure?paymentId=" + payment.getId();
        return autoPostForm(esewaFormUrl, Map.ofEntries(
            Map.entry("amount", amount), Map.entry("tax_amount", "0"), Map.entry("total_amount", amount),
            Map.entry("transaction_uuid", payment.getTransactionUuid()), Map.entry("product_code", esewaProductCode),
            Map.entry("product_service_charge", "0"), Map.entry("product_delivery_charge", "0"),
            Map.entry("success_url", success), Map.entry("failure_url", failure),
            Map.entry("signed_field_names", "total_amount,transaction_uuid,product_code"), Map.entry("signature", signature)
        ));
    }

    @Transactional
    public BillingPayment handleEsewaSuccess(String encodedData) {
        Map<String, Object> payload = decodeEsewaPayload(encodedData);
        String transactionUuid = String.valueOf(payload.get("transaction_uuid"));
        BillingPayment payment = paymentRepository.findByTransactionUuid(transactionUuid)
            .orElseThrow(() -> new BillingException("Unknown eSewa transaction"));
        verifyEsewaResponse(payload);
        EsewaStatus status = queryEsewaStatus(payment);
        if (!status.isSuccessful()) throw new BillingException("eSewa has not confirmed this payment");
        return complete(payment, String.valueOf(payload.get("transaction_code")));
    }

    @Transactional
    public BillingPayment handleEsewaFailure(UUID paymentId) {
        BillingPayment payment = paymentRepository.findById(paymentId)
            .orElseThrow(() -> new BillingException("Billing payment was not found"));
        EsewaStatus status = queryEsewaStatus(payment);
        if (status.isSuccessful()) return complete(payment, null);
        if (status.isTerminalFailure() || status == EsewaStatus.UNKNOWN) payment.setStatus("FAILED");
        return paymentRepository.save(payment);
    }

    @Transactional
    public void handleStripeWebhook(String payload, String signature) {
        if (stripeWebhookSecret.isBlank()) throw new BillingException("Stripe webhook is not configured");
        Event event;
        try {
            event = Webhook.constructEvent(payload, signature, stripeWebhookSecret);
        } catch (SignatureVerificationException exception) {
            throw new BillingException("Invalid Stripe webhook signature");
        }
        if (eventRepository.existsByProviderAndEventId("STRIPE", event.getId())) return;
        if ("checkout.session.completed".equals(event.getType())) {
            Object object = event.getDataObjectDeserializer().getObject().orElse(null);
            if (object instanceof Session session && "paid".equals(session.getPaymentStatus())) {
                String paymentId = session.getMetadata().get("paymentId");
                if (paymentId != null) {
                    BillingPayment payment = paymentRepository.findById(UUID.fromString(paymentId))
                        .orElseThrow(() -> new BillingException("Unknown Stripe payment"));
                    complete(payment, session.getId());
                }
            }
        }
        eventRepository.save(ProcessedPaymentEvent.builder().provider("STRIPE").eventId(event.getId()).build());
    }

    public String returnUrl(BillingPayment payment) {
        return UriComponentsBuilder.fromUriString(payment.getReturnUrl())
            .queryParam("paymentId", payment.getId()).queryParam("status", payment.getStatus())
            .build().encode().toUriString();
    }

    private void createStripeCheckout(BillingPayment payment) {
        SessionCreateParams params = SessionCreateParams.builder()
            .setMode(SessionCreateParams.Mode.PAYMENT)
            .setClientReferenceId(String.valueOf(payment.getUserId()))
            .setSuccessUrl(payment.getReturnUrl() + "?paymentId=" + payment.getId() + "&provider=stripe")
            .setCancelUrl(payment.getReturnUrl() + "?paymentId=" + payment.getId() + "&status=canceled")
            .putMetadata("paymentId", payment.getId().toString())
            .putMetadata("userId", payment.getUserId().toString())
            .addLineItem(SessionCreateParams.LineItem.builder().setQuantity(1L)
                .setPriceData(SessionCreateParams.LineItem.PriceData.builder()
                    .setCurrency("npr").setUnitAmount(payment.getAmount().movePointRight(2).longValueExact())
                    .setProductData(SessionCreateParams.LineItem.PriceData.ProductData.builder()
                        .setName("SmartBiz Pro " + payment.getBillingTerm().toLowerCase(Locale.ROOT)).build())
                    .build()).build())
            .build();
        try {
            Session session = Session.create(params, RequestOptions.builder().setApiKey(stripeSecretKey).build());
            payment.setProviderReference(session.getId());
            payment.setCheckoutUrl(session.getUrl());
        } catch (Exception exception) {
            throw new BillingException("Could not start Stripe checkout: " + exception.getMessage());
        }
    }

    private BillingPayment complete(BillingPayment payment, String providerReference) {
        if ("SUCCEEDED".equals(payment.getStatus())) return payment;
        if (!"PENDING".equals(payment.getStatus())) throw new BillingException("Payment cannot be completed from its current state");
        User user = userRepository.findLockedById(payment.getUserId())
            .orElseThrow(() -> new BillingException("User was not found"));
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime base = now;
        if (user.getTrialEndsAt() != null && user.getTrialEndsAt().isAfter(base)) base = user.getTrialEndsAt();
        if (user.getPaidUntil() != null && user.getPaidUntil().isAfter(base)) base = user.getPaidUntil();
        user.setPaidPlan("PRO");
        user.setPaidUntil(base.plusDays("YEARLY".equals(payment.getBillingTerm()) ? 365 : 30));
        userRepository.save(user);
        payment.setStatus("SUCCEEDED");
        payment.setProviderReference(providerReference != null ? providerReference : payment.getProviderReference());
        payment.setCompletedAt(now);
        return paymentRepository.save(payment);
    }

    private EsewaStatus queryEsewaStatus(BillingPayment payment) {
        try {
            String url = UriComponentsBuilder.fromUriString(esewaStatusUrl)
                .queryParam("product_code", esewaProductCode)
                .queryParam("total_amount", money(payment.getAmount()))
                .queryParam("transaction_uuid", payment.getTransactionUuid())
                .build().encode().toUriString();
            Map<?, ?> result = RestClient.create().get().uri(url).retrieve().body(Map.class);
            return EsewaStatus.from(result == null ? null : String.valueOf(result.get("status")));
        } catch (Exception exception) {
            throw new BillingException("Could not verify eSewa payment status");
        }
    }

    private Map<String, Object> decodeEsewaPayload(String encodedData) {
        try {
            byte[] decoded = Base64.getDecoder().decode(encodedData);
            return objectMapper.readValue(decoded, new TypeReference<>() {});
        } catch (Exception exception) {
            throw new BillingException("Invalid eSewa response");
        }
    }

    private void verifyEsewaResponse(Map<String, Object> payload) {
        String signedNames = String.valueOf(payload.get("signed_field_names"));
        LinkedHashMap<String, Object> fields = new LinkedHashMap<>();
        for (String name : signedNames.split(",")) fields.put(name.trim(), payload.get(name.trim()));
        if (!EsewaSigner.verify(esewaSecretKey, fields, String.valueOf(payload.get("signature")))) {
            throw new BillingException("Invalid eSewa response signature");
        }
    }

    private void expireIfNeeded(BillingPayment payment) {
        if ("PENDING".equals(payment.getStatus()) && payment.getExpiresAt().isBefore(LocalDateTime.now())) {
            payment.setStatus("EXPIRED");
            paymentRepository.save(payment);
        }
    }

    private User findUser(Long userId) {
        return userRepository.findById(userId).orElseThrow(() -> new BillingException("User was not found"));
    }

    private BigDecimal priceFor(BillingTerm term) { return term == BillingTerm.YEARLY ? YEARLY_PRICE : MONTHLY_PRICE; }
    private String money(BigDecimal amount) { return amount.stripTrailingZeros().toPlainString(); }

    private BillingCheckoutResponse checkoutResponse(BillingPayment payment) {
        return new BillingCheckoutResponse(payment.getId(), payment.getStatus(), payment.getAmount(), payment.getCurrency(),
            new BillingCheckoutResponse.CheckoutAction("REDIRECT", payment.getCheckoutUrl()), payment.getExpiresAt());
    }

    private BillingPaymentResponse response(BillingPayment payment) {
        return new BillingPaymentResponse(payment.getId(), payment.getProvider(), payment.getBillingTerm(), payment.getAmount(),
            payment.getCurrency(), payment.getStatus(), payment.getCompletedAt(), payment.getExpiresAt());
    }

    private UsageSnapshot loadUsage(Long userId) {
        Map<String, Integer> values = new LinkedHashMap<>();
        Map<String, Boolean> availability = new LinkedHashMap<>();
        loadUsageService("inventory", inventoryServiceUrl + "/inventory/internal/usage/" + userId, values, availability);
        loadUsageService("sales", salesServiceUrl + "/sales/internal/usage/" + userId, values, availability);
        loadUsageService("crm", crmServiceUrl + "/customers/internal/usage/" + userId, values, availability);
        loadUsageService("ai", aiServiceUrl + "/ai/internal/usage/" + userId, values, availability);
        return new UsageSnapshot(Map.copyOf(values), availability.values().stream().allMatch(Boolean::booleanValue), Map.copyOf(availability));
    }

    private void loadUsageService(String service, String url, Map<String, Integer> values, Map<String, Boolean> availability) {
        try {
            Map<?, ?> response = RestClient.create().get().uri(url)
                .header("X-Internal-Service-Token", internalServiceToken).retrieve().body(Map.class);
            if (response != null) {
                response.forEach((key, value) -> {
                    if (value instanceof Number number) values.put(String.valueOf(key), number.intValue());
                });
            }
            availability.put(service, true);
        } catch (Exception exception) {
            availability.put(service, false);
        }
    }

    private record UsageSnapshot(Map<String, Integer> values, boolean complete, Map<String, Boolean> availability) {}

    private boolean constantTimeEquals(String expected, String actual) {
        if (expected == null || actual == null) return false;
        return java.security.MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8), actual.getBytes(StandardCharsets.UTF_8));
    }

    private String autoPostForm(String action, Map<String, String> fields) {
        StringBuilder html = new StringBuilder("<!doctype html><html><body><p>Opening eSewa…</p><form id=pay method=post action=\"")
            .append(escape(action)).append("\">");
        fields.forEach((key, value) -> html.append("<input type=hidden name=\"").append(escape(key)).append("\" value=\"").append(escape(value)).append("\">") );
        return html.append("</form><script>document.getElementById('pay').submit()</script></body></html>").toString();
    }

    private String escape(String value) {
        return value.replace("&", "&amp;").replace("\"", "&quot;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
