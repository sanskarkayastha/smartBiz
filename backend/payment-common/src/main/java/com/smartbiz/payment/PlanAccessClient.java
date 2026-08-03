package com.smartbiz.payment;

import org.springframework.http.HttpHeaders;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class PlanAccessClient {
    private record Cached(boolean pro, Instant fetchedAt) {}
    private final String authBaseUrl;
    private final String internalToken;
    private final ConcurrentHashMap<Long, Cached> cache = new ConcurrentHashMap<>();

    public PlanAccessClient(String authBaseUrl, String internalToken) {
        this.authBaseUrl = authBaseUrl.replaceAll("/$", "");
        this.internalToken = internalToken;
    }

    public boolean isPro(Long userId) {
        Cached cached = cache.get(userId);
        if (cached != null && Duration.between(cached.fetchedAt(), Instant.now()).compareTo(Duration.ofSeconds(60)) < 0) {
            return cached.pro();
        }
        try {
            Map<?, ?> response = RestClient.create().get()
                .uri(authBaseUrl + "/billing/internal/entitlements/" + userId)
                .header("X-Internal-Service-Token", internalToken)
                .retrieve().body(Map.class);
            boolean pro = response != null && "PRO".equals(String.valueOf(response.get("effectivePlan")));
            cache.put(userId, new Cached(pro, Instant.now()));
            return pro;
        } catch (Exception exception) {
            if (cached != null && Duration.between(cached.fetchedAt(), Instant.now()).compareTo(Duration.ofMinutes(15)) < 0) return cached.pro();
            throw new PlanAccessUnavailableException();
        }
    }

    public void requirePro(Long userId, String feature) {
        if (!isPro(userId)) throw new PlanLimitException("PRO_REQUIRED", feature, 0, 0);
    }

    public void requireWithinLimit(Long userId, String feature, long used, long limit) {
        if (!isPro(userId) && used >= limit) throw new PlanLimitException("PLAN_LIMIT_REACHED", feature, used, limit);
    }
}
