package com.smartbiz.ai.service;

import com.smartbiz.ai.dto.AiQueryRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import org.springframework.web.client.HttpClientErrorException;

import java.util.ArrayList;
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

    @Value("${app.inventory-url}")
    private String inventoryBase;

    @Value("${app.sales-url}")
    private String salesBase;

    private static final long INSIGHT_CACHE_TTL_MS = 10 * 60 * 1000;

    private final Map<Long, String> insightCache = new ConcurrentHashMap<>();
    private final Map<Long, Long> insightCacheTimestamp = new ConcurrentHashMap<>();

    public String answerQuery(Long userId, List<AiQueryRequest.ChatMessage> messages) {
        String context = buildContext(userId);
        return callGemini(context, messages);
    }

    public String getDailyInsight(Long userId) {
        long now = System.currentTimeMillis();
        Long cachedAt = insightCacheTimestamp.get(userId);
        if (cachedAt != null && (now - cachedAt) < INSIGHT_CACHE_TTL_MS) {
            return insightCache.get(userId);
        }
        String context = buildContext(userId);
        List<AiQueryRequest.ChatMessage> probe = List.of(
            new AiQueryRequest.ChatMessage("user", "Give me one sentence of business insight based on this data. Be specific and actionable.")
        );
        String insight = callGemini(context, probe);
        insightCache.put(userId, insight);
        insightCacheTimestamp.put(userId, now);
        return insight;
    }

    private String buildContext(Long userId) {
        StringBuilder ctx = new StringBuilder();

        try {
            Object todayData = fetchFromService(salesBase + "/sales/analytics/today", userId);
            ctx.append("TODAY'S SALES: ").append(todayData).append("\n");
        } catch (Exception e) {
            log.warn("Could not fetch today analytics: {}", e.getMessage());
        }

        try {
            Object weeklyData = fetchFromService(salesBase + "/sales/analytics/weekly", userId);
            ctx.append("WEEKLY SALES: ").append(weeklyData).append("\n");
        } catch (Exception e) {
            log.warn("Could not fetch weekly analytics: {}", e.getMessage());
        }

        try {
            Object lowStock = fetchFromService(inventoryBase + "/inventory/products/low-stock", userId);
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
    private String callGemini(String context, List<AiQueryRequest.ChatMessage> messages) {
        if (geminiApiKey == null || geminiApiKey.isBlank()) {
            return "AI service is not configured. Please set the GEMINI_API_KEY environment variable.";
        }

        String systemInstruction = "You are a business assistant for a small business in Nepal. " +
            "Answer concisely based on the business data and conversation provided. " +
            "Keep responses under 3 sentences. Use NPR for currency when relevant.";

        // Build multi-turn contents — inject context into the first user message
        List<Map<String, Object>> contents = new ArrayList<>();
        boolean contextInjected = false;
        for (AiQueryRequest.ChatMessage msg : messages) {
            String geminiRole = "ai".equals(msg.role()) ? "model" : "user";
            String text = msg.text();
            if (!contextInjected && "user".equals(geminiRole)) {
                text = "BUSINESS DATA:\n" + context + "\n\n" + text;
                contextInjected = true;
            }
            contents.add(Map.of("role", geminiRole, "parts", List.of(Map.of("text", text))));
        }

        Map<String, Object> body = Map.of(
            "system_instruction", Map.of("parts", List.of(Map.of("text", systemInstruction))),
            "contents", contents
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
        } catch (HttpClientErrorException e) {
            if (e.getStatusCode().value() == 429) {
                log.warn("Gemini rate limit reached (429)");
                return "Rate limit reached. Please wait a moment and try again.";
            }
            log.error("Gemini API client error: {}", e.getStatusCode());
            return "AI is temporarily unavailable. Please try again later.";
        } catch (Exception e) {
            log.error("Gemini API call failed", e);
            return "AI is temporarily unavailable. Please try again later.";
        }
    }
}
