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
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
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

    public AiQueryResponse answerQuery(Long userId, List<AiQueryRequest.ChatMessage> messages, String image, String mimeType, String fileText) {
        String context = buildContext(userId);
        List<AiQueryRequest.ChatMessage> window = messages.size() > 10
            ? messages.subList(messages.size() - 10, messages.size()) : messages;
        if (image != null && !image.isBlank()) return processWithImage(context, window, image, mimeType);
        if (fileText != null && !fileText.isBlank()) return processWithFileText(context, window, fileText);
        return new AiQueryResponse(callGemini(context, window), null, null);
    }

    private AiQueryResponse processWithImage(String context, List<AiQueryRequest.ChatMessage> messages, String image, String mimeType) {
        String userPrompt = messages.isEmpty() ? "What is in this image?"
            : messages.get(messages.size() - 1).text();
        String extractionPrompt =
            "BUSINESS DATA:\n" + context + "\n\n" +
            "User message: " + userPrompt + "\n\n" +
            "Respond helpfully to the user's message about this image. Use NPR for currency. Be concise and practical.\n" +
            "Do not claim that products were added, updated, or saved already. If the user wants inventory changes, say the products were extracted and are ready for review or saving.\n" +
            "IMPORTANT: If the user wants to add products to inventory (e.g. 'add these', 'update stock', 'I bought these'), " +
            "extract all products from the image and append EXACTLY the following after your response text — no markdown, no extra text:\n" +
            "PRODUCTS_JSON:[{\"name\":\"product name\",\"quantity\":1.0,\"rate\":0.0,\"category\":\"General\"}]\n" +
            "Infer a short category (1-2 words, e.g. 'Electronics', 'Food & Beverages', 'Clothing') for each product based on its name. " +
            "Only include PRODUCTS_JSON if you can clearly identify product data. Do NOT include it for general questions.";
        List<Map<String, Object>> parts = List.of(
            Map.of("inline_data", Map.of("mime_type", mimeType != null ? mimeType : "image/jpeg", "data", image)),
            Map.of("text", extractionPrompt)
        );
        String raw = callGeminiWithParts(parts);
        return splitResponseAndProducts(raw);
    }

    private AiQueryResponse processWithFileText(String context, List<AiQueryRequest.ChatMessage> messages, String fileText) {
        String userPrompt = messages.isEmpty() ? "Extract products from this data"
            : messages.get(messages.size() - 1).text();
        if (shouldExtractSales(userPrompt, fileText)) {
            List<ParsedSale> sales = parseSalesFile(new ParseSalesFileRequest(fileText)).sales();
            if (!sales.isEmpty()) {
                return new AiQueryResponse(buildSalesReviewMessage(sales), null, sales);
            }
        }

        String fullPrompt =
            "BUSINESS DATA:\n" + context + "\n\n" +
            "User message: " + userPrompt + "\n\n" +
            "Spreadsheet/file content:\n" + fileText + "\n\n" +
            "Respond helpfully to the user's message about this data. Use NPR for currency. Be concise and practical.\n" +
            "Do not claim that products were added, updated, or saved already. If the user wants inventory changes, say the products were extracted and are ready for review or saving.\n" +
            "IMPORTANT: If the user wants to add products to inventory, extract all products and append EXACTLY the following after your response — no markdown, no extra text:\n" +
            "PRODUCTS_JSON:[{\"name\":\"product name\",\"quantity\":1.0,\"rate\":0.0,\"category\":\"General\"}]\n" +
            "Infer a short category (1-2 words, e.g. 'Electronics', 'Food & Beverages', 'Clothing') for each product based on its name. " +
            "Only include PRODUCTS_JSON if you can clearly extract product data.";
        Map<String, Object> body = Map.of(
            "contents", List.of(Map.of("role", "user", "parts", List.of(Map.of("text", fullPrompt))))
        );
        String raw = callGeminiRaw(body);
        return splitResponseAndProducts(raw);
    }

    private AiQueryResponse splitResponseAndProducts(String raw) {
        if (raw != null && raw.contains("PRODUCTS_JSON:")) {
            int idx = raw.indexOf("PRODUCTS_JSON:");
            String text = raw.substring(0, idx).trim();
            String json = raw.substring(idx + "PRODUCTS_JSON:".length()).trim();
            List<ParsedProduct> products = parseProductJson(json);
            if (!products.isEmpty()) {
                return new AiQueryResponse(text.isEmpty() ? "Products extracted successfully." : text, products, null);
            }
        }
        return new AiQueryResponse(raw, null, null);
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
            "[{\"name\": \"product name\", \"quantity\": 1.0, \"rate\": 0.0, \"category\": \"General\"}]. " +
            "Infer a short category (1-2 words, e.g. 'Electronics', 'Food & Beverages', 'Clothing', 'Stationery') based on each product name. " +
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

    public ParseSalesFileResponse parseSalesFile(ParseSalesFileRequest request) {
        List<ParsedSale> heuristicSales = parseStructuredSalesFile(request.fileText());
        boolean likelyBsDates = containsLikelyBsDates(heuristicSales);

        String todayDate = LocalDate.now().toString();
        String prompt =
            "Today is " + todayDate + ". Read the following spreadsheet or CSV-style sales data and extract historical sales. " +
            "Return ONLY valid JSON, no markdown, no explanation, using this exact shape: " +
            "[" +
            "{\"saleDate\":\"YYYY-MM-DD\",\"customerName\":\"string or null\",\"paymentMethod\":\"CASH|CARD|DIGITAL|DUE\",\"items\":[" +
            "{\"productName\":\"string\",\"quantity\":1.0,\"unitPrice\":0.0}" +
            "]}" +
            "]. " +
            "Rules: " +
            "1. Group rows into one sale when they clearly belong to the same sale or invoice. " +
            "2. Convert dates to ISO format YYYY-MM-DD. If the sheet uses Nepali Bikram Sambat (B.S.) dates, including shorthand like 1/3/83 for Baishakh-era records, convert them to Gregorian A.D. dates before returning them. " +
            "3. Payment method must be one of CASH, CARD, DIGITAL, DUE. Default to CASH only if the sheet is unclear. " +
            "4. Customer name can be null if missing. " +
            "5. Every sale must contain at least one item. " +
            "6. Use the product names exactly as they appear when possible. " +
            "7. If quantity or price is missing, infer only when obvious; otherwise use 0. " +
            "8. Ignore summary, closed/open day markers, totals, profit rows, and non-sale rows. " +
            "Spreadsheet content:\n" + request.fileText();

        if (heuristicSales.isEmpty() || likelyBsDates) {
            String json = callGeminiTextOnly(prompt);
            List<ParsedSale> aiSales = parseSalesJson(json);
            if (!aiSales.isEmpty()) {
                return new ParseSalesFileResponse(aiSales);
            }
        }

        return new ParseSalesFileResponse(heuristicSales);
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
            if (content == null) {
                log.warn("Gemini returned no content, finishReason={}", candidate.get("finishReason"));
                return "I couldn't generate a response. Please rephrase your question.";
            }
            List<?> parts = (List<?>) content.get("parts");
            if (parts == null || parts.isEmpty()) return "No response from AI.";
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

    private List<ParsedSale> parseSalesJson(String json) {
        try {
            String clean = json.replaceAll("(?s)```json\\s*|```", "").trim();
            if (clean.startsWith("{")) clean = "[" + clean + "]";
            return objectMapper.readValue(clean, new TypeReference<List<ParsedSale>>() {});
        } catch (Exception e) {
            log.warn("Failed to parse sales JSON: {}", json);
            return List.of();
        }
    }

    private List<ParsedSale> parseStructuredSalesFile(String fileText) {
        if (fileText == null || fileText.isBlank()) return List.of();

        List<List<String>> rows = Arrays.stream(fileText.split("\\r?\\n"))
                .map(this::parseCsvLine)
                .toList();
        if (rows.size() < 2) return List.of();

        int headerRowIndex = findSalesHeaderRow(rows);
        if (headerRowIndex < 0) return List.of();

        List<String> headers = rows.get(headerRowIndex);
        int dateIndex = findDateHeaderIndex(headers);
        int productIndex = findProductHeaderIndex(headers);
        int quantityIndex = findQuantityHeaderIndex(headers);
        int soldPriceIndex = findSoldPriceHeaderIndex(headers);
        int genericPriceIndex = findGenericPriceHeaderIndex(headers);
        int totalAmountIndex = findTotalAmountHeaderIndex(headers);
        int customerIndex = findCustomerHeaderIndex(headers);
        int paymentIndex = findPaymentHeaderIndex(headers);

        int unitPriceIndex = soldPriceIndex >= 0 ? soldPriceIndex : genericPriceIndex;
        if (dateIndex < 0 || productIndex < 0 || (unitPriceIndex < 0 && totalAmountIndex < 0)) return List.of();

        List<ParsedSale> sales = new ArrayList<>();
        for (int i = headerRowIndex + 1; i < rows.size(); i++) {
            List<String> columns = rows.get(i);
            String rawDate = getColumn(columns, dateIndex);
            String productName = getColumn(columns, productIndex);
            if (rawDate.isBlank() && productName.isBlank()) continue;

            LocalDate saleDate = parseFlexibleDate(rawDate);
            if (saleDate == null || productName.isBlank()) continue;

            String rawQuantity = quantityIndex >= 0 ? getColumn(columns, quantityIndex) : "";
            String rawUnitPrice = unitPriceIndex >= 0 ? getColumn(columns, unitPriceIndex) : "";
            String rawTotalAmount = totalAmountIndex >= 0 ? getColumn(columns, totalAmountIndex) : "";
            if (isSkippableSalesDataRow(productName, rawQuantity, rawUnitPrice, rawTotalAmount)) continue;

            int quantity = quantityIndex >= 0 ? parseQuantity(rawQuantity) : 1;
            double unitPrice = unitPriceIndex >= 0
                    ? parseAmount(rawUnitPrice)
                    : deriveUnitPrice(rawTotalAmount, quantity);
            String customerName = trimToNull(getColumn(columns, customerIndex));
            String paymentMethod = normalizePaymentMethod(getColumn(columns, paymentIndex));

            sales.add(new ParsedSale(
                    saleDate.toString(),
                    customerName,
                    paymentMethod,
                    List.of(new ParsedSaleItem(productName.trim(), (double) quantity, unitPrice))
            ));
        }

        return sales;
    }

    private int findSalesHeaderRow(List<List<String>> rows) {
        int limit = Math.min(rows.size(), 25);
        for (int i = 0; i < limit; i++) {
            List<String> row = rows.get(i);
            int dateIndex = findDateHeaderIndex(row);
            int productIndex = findProductHeaderIndex(row);
            int soldPriceIndex = findSoldPriceHeaderIndex(row);
            int genericPriceIndex = findGenericPriceHeaderIndex(row);
            int totalAmountIndex = findTotalAmountHeaderIndex(row);
            int unitPriceIndex = soldPriceIndex >= 0 ? soldPriceIndex : genericPriceIndex;
            if (dateIndex >= 0 && productIndex >= 0 && (unitPriceIndex >= 0 || totalAmountIndex >= 0)) {
                return i;
            }
        }
        return -1;
    }

    private int findDateHeaderIndex(List<String> headers) {
        return findHeaderIndex(headers, header ->
                header.contains("date sold") ||
                header.contains("sold date") ||
                header.contains("bill date") ||
                header.contains("invoice date") ||
                header.contains("transaction date") ||
                header.contains("entry date") ||
                header.equals("date") ||
                header.equals("day") ||
                header.contains("sale date"));
    }

    private int findProductHeaderIndex(List<String> headers) {
        return findHeaderIndex(headers, header ->
                (header.contains("item") ||
                        header.contains("product") ||
                        header.contains("service") ||
                        header.contains("description") ||
                        header.contains("particular") ||
                        header.contains("goods") ||
                        header.equals("name")) &&
                !header.contains("cost") &&
                !header.contains("price"));
    }

    private int findQuantityHeaderIndex(List<String> headers) {
        return findHeaderIndex(headers, header ->
                header.equals("qty") ||
                        header.equals("qty.") ||
                        header.equals("qnty") ||
                        header.equals("pieces") ||
                        header.equals("pcs") ||
                        header.equals("units") ||
                        header.contains("quantity"));
    }

    private int findSoldPriceHeaderIndex(List<String> headers) {
        return findHeaderIndex(headers, header ->
                header.contains("sold price") ||
                header.contains("selling price") ||
                header.contains("sale price") ||
                header.contains("sell price") ||
                header.contains("unit price") ||
                header.contains("price sold") ||
                header.equals("rate") ||
                header.contains("unit rate"));
    }

    private int findGenericPriceHeaderIndex(List<String> headers) {
        return findHeaderIndex(headers, header ->
                header.contains("price") &&
                !header.contains("cost") &&
                !header.contains("purchase"));
    }

    private int findTotalAmountHeaderIndex(List<String> headers) {
        return findHeaderIndex(headers, header ->
                (header.contains("amount") ||
                        header.contains("line total") ||
                        header.contains("sales total") ||
                        header.contains("item total")) &&
                        !header.contains("discount") &&
                        !header.contains("due") &&
                        !header.contains("paid"));
    }

    private int findCustomerHeaderIndex(List<String> headers) {
        return findHeaderIndex(headers, header ->
                header.contains("customer") ||
                header.contains("client") ||
                header.contains("buyer") ||
                header.contains("party"));
    }

    private int findPaymentHeaderIndex(List<String> headers) {
        return findHeaderIndex(headers, header ->
                header.contains("payment") ||
                        header.equals("method") ||
                        header.contains("payment mode") ||
                        header.equals("mode"));
    }

    private boolean isSkippableSalesDataRow(String productName, String rawQuantity, String rawUnitPrice, String rawTotalAmount) {
        String normalizedProduct = normalizeHeader(productName).replaceAll("[^a-z0-9 ]", "");
        if (normalizedProduct.isBlank()) return true;
        if (rawQuantity.isBlank() && rawUnitPrice.isBlank() && rawTotalAmount.isBlank()) return true;
        if (normalizedProduct.equals("closed") || normalizedProduct.equals("open") || normalizedProduct.equals("holiday")) {
            return true;
        }
        return normalizedProduct.contains("total") ||
                normalizedProduct.contains("subtotal") ||
                normalizedProduct.contains("profit") ||
                normalizedProduct.contains("average") ||
                normalizedProduct.contains("opening") ||
                normalizedProduct.contains("closing");
    }

    private boolean containsLikelyBsDates(List<ParsedSale> sales) {
        if (sales.isEmpty()) return false;

        int suspicious = 0;
        for (ParsedSale sale : sales) {
            try {
                LocalDate date = LocalDate.parse(sale.saleDate());
                if (date.getYear() > LocalDate.now().getYear() + 2 || date.getYear() < 2000) {
                    suspicious++;
                }
            } catch (Exception ignored) {
                suspicious++;
            }
        }

        return suspicious > 0;
    }

    private List<String> parseCsvLine(String line) {
        List<String> values = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inQuotes = false;

        for (int i = 0; i < line.length(); i++) {
            char ch = line.charAt(i);
            if (ch == '"') {
                if (inQuotes && i + 1 < line.length() && line.charAt(i + 1) == '"') {
                    current.append('"');
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (ch == ',' && !inQuotes) {
                values.add(current.toString());
                current.setLength(0);
            } else {
                current.append(ch);
            }
        }

        values.add(current.toString());
        return values;
    }

    private int findHeaderIndex(List<String> headers, java.util.function.Predicate<String> matcher) {
        for (int i = 0; i < headers.size(); i++) {
            if (matcher.test(normalizeHeader(headers.get(i)))) {
                return i;
            }
        }
        return -1;
    }

    private String normalizeHeader(String value) {
        return value == null
                ? ""
                : value.trim().toLowerCase(Locale.ENGLISH).replaceAll("\\s+", " ");
    }

    private String getColumn(List<String> columns, int index) {
        if (index < 0 || index >= columns.size()) return "";
        return columns.get(index).trim();
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private int parseQuantity(String value) {
        if (value == null || value.isBlank()) return 1;
        try {
            return Math.max(1, (int) Math.round(Double.parseDouble(value.replace(",", "").trim())));
        } catch (Exception e) {
            return 1;
        }
    }

    private double parseAmount(String value) {
        if (value == null || value.isBlank()) return 0.0;
        String cleaned = value.replaceAll("[^0-9.\\-]", "");
        if (cleaned.isBlank() || ".".equals(cleaned) || "-".equals(cleaned)) return 0.0;
        try {
            return Double.parseDouble(cleaned);
        } catch (Exception e) {
            return 0.0;
        }
    }

    private double deriveUnitPrice(String rawTotalAmount, int quantity) {
        double totalAmount = parseAmount(rawTotalAmount);
        if (quantity <= 0) return totalAmount;
        return totalAmount / quantity;
    }

    private String normalizePaymentMethod(String value) {
        String normalized = value == null ? "" : value.trim().toUpperCase(Locale.ENGLISH);
        return switch (normalized) {
            case "CARD" -> "CARD";
            case "DIGITAL", "ONLINE", "ESEWA", "KHALTI", "BANK", "BANK TRANSFER" -> "DIGITAL";
            case "DUE", "CREDIT" -> "DUE";
            default -> "CASH";
        };
    }

    private LocalDate parseFlexibleDate(String value) {
        if (value == null || value.isBlank()) return null;
        String trimmed = value.trim();

        try {
            double serial = Double.parseDouble(trimmed);
            if (serial > 20000) {
                return LocalDate.of(1899, 12, 30).plusDays((long) serial);
            }
        } catch (Exception ignored) {
        }

        List<DateTimeFormatter> formatters = List.of(
                DateTimeFormatter.ISO_LOCAL_DATE,
                DateTimeFormatter.ofPattern("yyyy/M/d"),
                DateTimeFormatter.ofPattern("yyyy-M-d"),
                DateTimeFormatter.ofPattern("yyyy.MM.dd"),
                DateTimeFormatter.ofPattern("M/d/yyyy"),
                DateTimeFormatter.ofPattern("M/d/yy"),
                DateTimeFormatter.ofPattern("d/M/yyyy"),
                DateTimeFormatter.ofPattern("d/M/yy"),
                DateTimeFormatter.ofPattern("M-d-yyyy"),
                DateTimeFormatter.ofPattern("M-d-yy"),
                DateTimeFormatter.ofPattern("d-M-yyyy"),
                DateTimeFormatter.ofPattern("d-M-yy"),
                DateTimeFormatter.ofPattern("d.M.yyyy"),
                DateTimeFormatter.ofPattern("d.M.yy"),
                DateTimeFormatter.ofPattern("d MMM yyyy", Locale.ENGLISH),
                DateTimeFormatter.ofPattern("MMM d yyyy", Locale.ENGLISH),
                DateTimeFormatter.ofPattern("d MMM, yyyy", Locale.ENGLISH),
                DateTimeFormatter.ofPattern("MMM d, yyyy", Locale.ENGLISH)
        );

        for (DateTimeFormatter formatter : formatters) {
            try {
                return LocalDate.parse(trimmed, formatter);
            } catch (DateTimeParseException ignored) {
            }
        }

        return null;
    }

    private boolean shouldExtractSales(String userPrompt, String fileText) {
        String normalizedPrompt = normalizeHeader(userPrompt);
        boolean mentionsSales = containsAny(normalizedPrompt,
                "sale", "sales", "sold", "transaction", "transactions", "invoice", "billing", "history");
        boolean mentionsInventory = containsAny(normalizedPrompt,
                "inventory", "stock", "product", "products", "supplier", "purchase", "restock");
        return mentionsSales || (looksLikeSalesFile(fileText) && !mentionsInventory);
    }

    private boolean looksLikeSalesFile(String fileText) {
        if (fileText == null || fileText.isBlank()) return false;

        List<List<String>> rows = Arrays.stream(fileText.split("\\r?\\n"))
                .map(this::parseCsvLine)
                .toList();
        if (findSalesHeaderRow(rows) >= 0) return true;

        String normalizedText = normalizeHeader(fileText);
        int keywordHits = 0;
        if (normalizedText.contains("invoice")) keywordHits++;
        if (normalizedText.contains("bill")) keywordHits++;
        if (normalizedText.contains("qty")) keywordHits++;
        if (normalizedText.contains("amount")) keywordHits++;
        if (normalizedText.contains("payment")) keywordHits++;
        return keywordHits >= 3;
    }

    private boolean containsAny(String text, String... tokens) {
        for (String token : tokens) {
            if (text.contains(token)) {
                return true;
            }
        }
        return false;
    }

    private String buildSalesReviewMessage(List<ParsedSale> sales) {
        int itemCount = sales.stream()
                .mapToInt(sale -> sale.items() != null ? sale.items().size() : 0)
                .sum();
        return "I found " + sales.size() + " historical sale" + (sales.size() == 1 ? "" : "s") +
                " with " + itemCount + " line item" + (itemCount == 1 ? "" : "s") +
                ". Review the dates, customers, payment methods, and product matches below before saving them.";
    }
}
