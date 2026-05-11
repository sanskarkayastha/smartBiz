package com.smartbiz.ai.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
public class AiService {

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${app.gemini-api-key}")
    private String geminiApiKey;

    @Value("${app.gemini-url}")
    private String geminiUrl;

    private static final String INVENTORY_BASE = "http://localhost:8082";
    private static final String SALES_BASE = "http://localhost:8084";
    private static final long INSIGHT_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

    private final Map<Long, String> insightCache = new ConcurrentHashMap<>();
    private final Map<Long, Long> insightCacheTimestamp = new ConcurrentHashMap<>();

    public String answerQuery(Long userId, String question) {
        String context = buildContext(userId);
        return callGemini(context, question);
    }

    public String getDailyInsight(Long userId) {
        long now = System.currentTimeMillis();
        Long cachedAt = insightCacheTimestamp.get(userId);
        if (cachedAt != null && (now - cachedAt) < INSIGHT_CACHE_TTL_MS) {
            return insightCache.get(userId);
        }
        String context = buildContext(userId);
        String insight = callGemini(context, "Give me one sentence of business insight based on this data. Be specific and actionable.");
        insightCache.put(userId, insight);
        insightCacheTimestamp.put(userId, now);
        return insight;
    }

    private String buildContext(Long userId) {
        StringBuilder ctx = new StringBuilder();

        try {
            Object todayData = fetchFromService(SALES_BASE + "/sales/analytics/today", userId);
            ctx.append("TODAY'S SALES: ").append(todayData).append("\n");
        } catch (Exception e) {
            log.warn("Could not fetch today analytics: {}", e.getMessage());
        }

        try {
            Object weeklyData = fetchFromService(SALES_BASE + "/sales/analytics/weekly", userId);
            ctx.append("WEEKLY SALES: ").append(weeklyData).append("\n");
        } catch (Exception e) {
            log.warn("Could not fetch weekly analytics: {}", e.getMessage());
        }

        try {
            Object lowStock = fetchFromService(INVENTORY_BASE + "/inventory/products/low-stock", userId);
            ctx.append("LOW STOCK PRODUCTS: ").append(lowStock).append("\n");
        } catch (Exception e) {
            log.warn("Could not fetch low-stock: {}", e.getMessage());
        }

        return ctx.toString();
    }

    private Object fetchFromService(String url, Long userId) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-User-Id", userId.toString());
        HttpEntity<Void> entity = new HttpEntity<>(headers);
        ResponseEntity<Object> response = restTemplate.exchange(url, HttpMethod.GET, entity,
                new ParameterizedTypeReference<>() {});
        return response.getBody();
    }

    @SuppressWarnings("unchecked")
    private String callGemini(String context, String question) {
        if (geminiApiKey == null || geminiApiKey.isBlank()) {
            return "AI service is not configured. Please set the GEMINI_API_KEY environment variable.";
        }

        String systemInstruction = "You are a business assistant for a small business in Nepal. Answer concisely based only on the data provided. Keep response under 3 sentences.";
        String userContent = "BUSINESS DATA:\n" + context + "\nQUESTION: " + question;

        Map<String, Object> body = Map.of(
            "system_instruction", Map.of("parts", List.of(Map.of("text", systemInstruction))),
            "contents", List.of(Map.of("role", "user", "parts", List.of(Map.of("text", userContent))))
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        String url = geminiUrl + "?key=" + geminiApiKey;

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            Map<?, ?> responseBody = response.getBody();
            if (responseBody == null) return "No response from AI.";

            List<?> candidates = (List<?>) responseBody.get("candidates");
            if (candidates == null || candidates.isEmpty()) return "No response from AI.";

            Map<?, ?> candidate = (Map<?, ?>) candidates.get(0);
            Map<?, ?> content = (Map<?, ?>) candidate.get("content");
            List<?> parts = (List<?>) content.get("parts");
            return (String) ((Map<?, ?>) parts.get(0)).get("text");
        } catch (Exception e) {
            log.error("Gemini API call failed", e);
            return "AI is temporarily unavailable. Please try again later.";
        }
    }
}
