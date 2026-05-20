package com.smartbiz.ai.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartbiz.ai.dto.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.HttpClientErrorException;

import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
public class AiService {

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${app.gemini-api-key}")
    private String geminiApiKey;

    @Value("${app.gemini-url}")
    private String geminiUrl;

    @Value("${app.inventory-url}")
    private String inventoryBase;

    @Value("${app.sales-url}")
    private String salesBase;

    @Value("${app.crm-url}")
    private String crmBase;

    private static final long INSIGHT_CACHE_TTL_MS = 10 * 60 * 1000;

    private final Map<Long, String> insightCache = new ConcurrentHashMap<>();
    private final Map<Long, Long> insightCacheTimestamp = new ConcurrentHashMap<>();

    public String answerQuery(Long userId, List<AiQueryRequest.ChatMessage> messages) {
        String context = buildContext(userId);
        List<AiQueryRequest.ChatMessage> window = messages.size() > 10
            ? messages.subList(messages.size() - 10, messages.size()) : messages;
        return callGemini(context, window);
    }

    public String getDailyInsight(Long userId) {
        long now = System.currentTimeMillis();
        Long cachedAt = insightCacheTimestamp.get(userId);
        if (cachedAt != null && (now - cachedAt) < INSIGHT_CACHE_TTL_MS) {
            return insightCache.get(userId);
        }
        String context = buildContext(userId);
        List<AiQueryRequest.ChatMessage> probe = List.of(
            new AiQueryRequest.ChatMessage("user",
                "Give me 2-3 bullet points of actionable business insight based on this data. Be specific.")
        );
        String insight = callGemini(context, probe);
        insightCache.put(userId, insight);
        insightCacheTimestamp.put(userId, now);
        return insight;
    }

    public ScanInvoiceResponse scanInvoice(ScanInvoiceRequest request) {
        String prompt = "Extract all line items from this invoice/bill/receipt. " +
            "Return ONLY a valid JSON array, no markdown, no explanation: " +
            "[{\"name\": \"product name\", \"quantity\": 1.0, \"rate\": 0.0}]. " +
            "If you cannot read a field, use 0 for numbers. Include every distinct item you can see.";

        List<Map<String, Object>> parts = List.of(
            Map.of("inline_data", Map.of("mime_type", request.mimeType(), "data", request.image())),
            Map.of("text", prompt)
        );
        String json = callGeminiWithParts(parts);
        List<ParsedProduct> products = parseProductJson(json);
        return new ScanInvoiceResponse(products);
    }

    public ParseVoiceResponse parseVoice(ParseVoiceRequest request) {
        String todayDate = LocalDate.now().toString();
        String json;
        if ("lead".equals(request.intent())) {
            String prompt = "Today is " + todayDate + ". Extract lead information from this spoken text: \"" + request.text() + "\". " +
                "Return ONLY valid JSON, no markdown, no explanation: " +
                "{\"name\":\"full name\",\"phone\":null,\"email\":null," +
                "\"notes\":\"anything mentioned about what they want\",\"followUpDate\":\"YYYY-MM-DD or null\"," +
                "\"estimatedValue\":null,\"source\":\"WALK_IN|REFERRAL|SOCIAL_MEDIA|PHONE_CALL|ONLINE|OTHER or null\"," +
                "\"stage\":\"NEW\"}. If a field is not mentioned, use null. " +
                "For relative dates like 'by Friday' or 'next week', convert to an absolute ISO date based on today being " + todayDate + ".";
            json = callGeminiTextOnly(prompt);
            ParsedLead lead = parseLeadJson(json);
            return new ParseVoiceResponse("lead", lead, null);
        } else {
            String prompt = "Extract product information from this spoken text: \"" + request.text() + "\". " +
                "Return ONLY a valid JSON array, no markdown, no explanation: " +
                "[{\"name\":\"product name\",\"quantity\":1.0,\"rate\":0.0}]. " +
                "If rate/price is not mentioned, use 0. Include every distinct product mentioned.";
            json = callGeminiTextOnly(prompt);
            List<ParsedProduct> products = parseProductJson(json);
            return new ParseVoiceResponse("product", null, products);
        }
    }

    // ─── Context building ─────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private String buildContext(Long userId) {
        StringBuilder ctx = new StringBuilder();
        ctx.append("Date: ").append(LocalDate.now()).append("\n\n");

        // Today's sales
        try {
            Map<String, Object> today = (Map<String, Object>) fetchFromService(
                salesBase + "/sales/analytics/today", userId);
            if (today != null) {
                double revenue = toDouble(today.get("totalRevenue"));
                int count = toInt(today.get("salesCount"));
                double avg = count > 0 ? revenue / count : 0;
                ctx.append("TODAY'S SALES: ").append(fmt(revenue))
                   .append(" from ").append(count).append(" sale").append(count == 1 ? "" : "s");
                if (count > 0) ctx.append(" (avg ").append(fmt(avg)).append("/sale)");
                ctx.append("\n");
            }
        } catch (Exception e) {
            ctx.append("TODAY'S SALES: [unavailable]\n");
            log.warn("Could not fetch today analytics: {}", e.getMessage());
        }

        // Weekly sales
        try {
            List<Map<String, Object>> weekly = (List<Map<String, Object>>) fetchFromService(
                salesBase + "/sales/analytics/weekly", userId);
            if (weekly != null && !weekly.isEmpty()) {
                StringBuilder wb = new StringBuilder("WEEKLY SALES: ");
                double weekTotal = 0;
                for (Map<String, Object> day : weekly) {
                    double rev = toDouble(day.get("revenue"));
                    weekTotal += rev;
                    String label = String.valueOf(day.getOrDefault("day", day.getOrDefault("date", "?")));
                    // shorten date like 2026-05-19 → Mon format if it's a full date
                    if (label.length() == 10 && label.contains("-")) {
                        label = java.time.LocalDate.parse(label)
                            .getDayOfWeek().getDisplayName(java.time.format.TextStyle.SHORT, java.util.Locale.ENGLISH);
                    }
                    wb.append(label).append(" ").append(fmtShort(rev)).append(" | ");
                }
                if (wb.length() > 2) wb.setLength(wb.length() - 3);
                wb.append("  (week total: ").append(fmt(weekTotal)).append(")");
                ctx.append(wb).append("\n");
            }
        } catch (Exception e) {
            ctx.append("WEEKLY SALES: [unavailable]\n");
            log.warn("Could not fetch weekly analytics: {}", e.getMessage());
        }

        // Low stock
        try {
            List<Map<String, Object>> lowStock = (List<Map<String, Object>>) fetchFromService(
                inventoryBase + "/inventory/products/low-stock", userId);
            if (lowStock != null && !lowStock.isEmpty()) {
                StringBuilder ls = new StringBuilder("LOW STOCK ALERTS: ");
                for (Map<String, Object> p : lowStock) {
                    ls.append(p.get("name")).append(" (").append(toInt(p.get("quantity"))).append(" units), ");
                }
                ls.setLength(ls.length() - 2);
                ctx.append(ls).append("\n");
            } else {
                ctx.append("LOW STOCK ALERTS: None\n");
            }
        } catch (Exception e) {
            ctx.append("LOW STOCK ALERTS: [unavailable]\n");
            log.warn("Could not fetch low-stock: {}", e.getMessage());
        }

        // Inventory summary
        try {
            List<Map<String, Object>> products = (List<Map<String, Object>>) fetchFromService(
                inventoryBase + "/inventory/products", userId);
            if (products != null) {
                int total = products.size();
                int inStock = 0;
                double totalValue = 0;
                for (Map<String, Object> p : products) {
                    int qty = toInt(p.get("quantity"));
                    double price = toDouble(p.get("price"));
                    if (qty > 0) inStock++;
                    totalValue += price * qty;
                }
                ctx.append("INVENTORY: ").append(total).append(" products, ")
                   .append(inStock).append(" in stock, total value ").append(fmt(totalValue)).append("\n");
            }
        } catch (Exception e) {
            ctx.append("INVENTORY: [unavailable]\n");
            log.warn("Could not fetch inventory: {}", e.getMessage());
        }

        // Customer summary
        try {
            List<Map<String, Object>> customers = (List<Map<String, Object>>) fetchFromService(
                crmBase + "/customers", userId);
            if (customers != null) {
                int total = customers.size();
                int withDue = 0;
                double totalDue = 0;
                for (Map<String, Object> c : customers) {
                    double due = toDouble(c.get("dueAmount"));
                    if (due > 0) { withDue++; totalDue += due; }
                }
                ctx.append("CUSTOMERS: ").append(total).append(" total");
                if (withDue > 0) {
                    ctx.append(", ").append(withDue).append(" with overdue payments (")
                       .append(fmt(totalDue)).append(" total outstanding)");
                }
                ctx.append("\n");
            }
        } catch (Exception e) {
            ctx.append("CUSTOMERS: [unavailable]\n");
            log.warn("Could not fetch customers: {}", e.getMessage());
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

    private static double toDouble(Object val) {
        if (val == null) return 0.0;
        if (val instanceof Number) return ((Number) val).doubleValue();
        try { return Double.parseDouble(val.toString()); } catch (Exception e) { return 0.0; }
    }

    private static int toInt(Object val) {
        if (val == null) return 0;
        if (val instanceof Number) return ((Number) val).intValue();
        try { return Integer.parseInt(val.toString()); } catch (Exception e) { return 0; }
    }

    private static String fmt(double amount) {
        return "NPR " + String.format("%,.0f", amount);
    }

    private static String fmtShort(double amount) {
        if (amount >= 100_000) return String.format("%.1fL", amount / 100_000);
        if (amount >= 1_000) return String.format("%.1fk", amount / 1_000);
        return String.format("%.0f", amount);
    }

    // ─── Gemini call helpers ──────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private String callGemini(String context, List<AiQueryRequest.ChatMessage> messages) {
        if (geminiApiKey == null || geminiApiKey.isBlank()) {
            return "AI service is not configured. Please set the GEMINI_API_KEY environment variable.";
        }

        String systemInstruction =
            "You are a smart business assistant inside SmartBiz, a mobile app for small businesses in Nepal.\n" +
            "You have access to real-time data about the user's sales, inventory, customers, and leads (shown in BUSINESS DATA).\n" +
            "Guidelines:\n" +
            "- Answer thoroughly. Use bullet points for lists or comparisons, plain sentences for insights.\n" +
            "- Always use NPR for currency.\n" +
            "- If a data section says [unavailable], tell the user that data couldn't be loaded and offer general advice instead.\n" +
            "- Keep answers focused and practical — no unnecessary filler.\n" +
            "- For analysis questions give a clear conclusion first, then supporting detail.";

        List<Map<String, Object>> contents = new ArrayList<>();
        boolean contextInjected = false;
        for (AiQueryRequest.ChatMessage msg : messages) {
            String geminiRole = "ai".equals(msg.role()) ? "model" : "user";
            String text = msg.text();
            if (!contextInjected && "user".equals(geminiRole)) {
                text = "BUSINESS DATA:\n" + context + "\n\nUser question: " + text;
                contextInjected = true;
            }
            contents.add(Map.of("role", geminiRole, "parts", List.of(Map.of("text", text))));
        }

        Map<String, Object> body = Map.of(
            "system_instruction", Map.of("parts", List.of(Map.of("text", systemInstruction))),
            "contents", contents
        );

        return callGeminiRaw(body);
    }

    private String callGeminiTextOnly(String prompt) {
        if (geminiApiKey == null || geminiApiKey.isBlank()) return "[]";
        Map<String, Object> body = Map.of(
            "contents", List.of(Map.of("role", "user", "parts", List.of(Map.of("text", prompt))))
        );
        return callGeminiRaw(body);
    }

    private String callGeminiWithParts(List<Map<String, Object>> parts) {
        if (geminiApiKey == null || geminiApiKey.isBlank()) return "[]";
        Map<String, Object> body = Map.of(
            "contents", List.of(Map.of("role", "user", "parts", parts))
        );
        return callGeminiRaw(body);
    }

    @SuppressWarnings("unchecked")
    private String callGeminiRaw(Map<String, Object> body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        String url = geminiUrl + "?key=" + geminiApiKey;
        log.info("Calling Gemini: {}", geminiUrl);

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
                log.warn("Gemini 429 — full error body: {}", e.getResponseBodyAsString());
                return "Rate limit reached. Please wait a moment and try again.";
            }
            log.error("Gemini API error {}: {}", e.getStatusCode(), e.getResponseBodyAsString());
            return "AI is temporarily unavailable. Please try again later.";
        } catch (Exception e) {
            log.error("Gemini API call failed", e);
            return "AI is temporarily unavailable. Please try again later.";
        }
    }

    // ─── JSON parsers ─────────────────────────────────────────────────────────

    private List<ParsedProduct> parseProductJson(String json) {
        try {
            String clean = json.replaceAll("(?s)```json\\s*|```", "").trim();
            if (clean.startsWith("{")) clean = "[" + clean + "]";
            return objectMapper.readValue(clean, new TypeReference<List<ParsedProduct>>() {});
        } catch (Exception e) {
            log.warn("Failed to parse product JSON: {}", json);
            return List.of();
        }
    }

    private ParsedLead parseLeadJson(String json) {
        try {
            String clean = json.replaceAll("(?s)```json\\s*|```", "").trim();
            return objectMapper.readValue(clean, ParsedLead.class);
        } catch (Exception e) {
            log.warn("Failed to parse lead JSON: {}", json);
            return new ParsedLead(null, null, null, json, null, null, null, "NEW");
        }
    }
}
