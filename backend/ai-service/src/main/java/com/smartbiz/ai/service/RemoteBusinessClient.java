package com.smartbiz.ai.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class RemoteBusinessClient {

    private final RestTemplate restTemplate;

    @Value("${app.inventory-url}")
    private String inventoryBase;

    @Value("${app.sales-url}")
    private String salesBase;

    @Value("${app.crm-url}")
    private String crmBase;

    public List<InventoryProduct> getInventoryProducts(Long userId) {
        List<InventoryProduct> all = new ArrayList<>();
        int page = 0;
        boolean hasNext;
        do {
            PagedResponse<InventoryProduct> response = exchange(
                    inventoryBase + "/inventory/products?page=" + page + "&size=200",
                    userId,
                    new ParameterizedTypeReference<>() {}
            );
            if (response == null) {
                break;
            }
            all.addAll(response.content());
            hasNext = response.hasNext();
            page++;
        } while (hasNext);
        return all;
    }

    public List<CategoryRef> getCategories(Long userId) {
        List<CategoryRef> response = exchange(
                inventoryBase + "/inventory/categories",
                userId,
                new ParameterizedTypeReference<>() {}
        );
        return response != null ? response : List.of();
    }

    public CategoryRef createCategory(Long userId, String name) {
        return exchangeWithBody(
                inventoryBase + "/inventory/categories",
                userId,
                HttpMethod.POST,
                Map.of("name", name),
                CategoryRef.class
        );
    }

    public InventoryProduct createProduct(Long userId, Map<String, Object> payload) {
        return exchangeWithBody(inventoryBase + "/inventory/products", userId, HttpMethod.POST, payload, InventoryProduct.class);
    }

    public InventoryProduct updateProduct(Long userId, Long productId, Map<String, Object> payload) {
        return exchangeWithBody(
                inventoryBase + "/inventory/products/" + productId,
                userId,
                HttpMethod.PUT,
                payload,
                InventoryProduct.class
        );
    }

    public InventoryProduct adjustStock(Long userId, Long productId, int quantityChange, String reason) {
        return exchangeWithBody(
                inventoryBase + "/inventory/products/" + productId + "/stock",
                userId,
                HttpMethod.POST,
                Map.of("quantityChange", quantityChange, "type", "IMPORT", "reason", reason),
                InventoryProduct.class
        );
    }

    public List<SaleRecord> importSales(Long userId, List<Map<String, Object>> sales) {
        List<SaleRecord> response = exchangeWithBody(
                salesBase + "/sales/import",
                userId,
                HttpMethod.POST,
                Map.of("sales", sales),
                new ParameterizedTypeReference<>() {}
        );
        return response != null ? response : List.of();
    }

    public List<SaleRecord> getSales(Long userId) {
        List<SaleRecord> response = exchange(
                salesBase + "/sales",
                userId,
                new ParameterizedTypeReference<>() {}
        );
        return response != null ? response : List.of();
    }

    public List<CustomerRecord> getCustomersWithDue(Long userId) {
        List<CustomerRecord> response = exchange(
                crmBase + "/customers/with-due",
                userId,
                new ParameterizedTypeReference<>() {}
        );
        return response != null ? response : List.of();
    }

    public PagedResponse<CustomerRecord> getCustomers(Long userId, int page, int size) {
        return exchange(
                crmBase + "/customers?page=" + page + "&size=" + size,
                userId,
                new ParameterizedTypeReference<>() {}
        );
    }

    private <T> T exchange(String url, Long userId, ParameterizedTypeReference<T> type) {
        HttpEntity<Void> entity = new HttpEntity<>(headers(userId));
        ResponseEntity<T> response = restTemplate.exchange(url, HttpMethod.GET, entity, type);
        return response.getBody();
    }

    private <T> T exchangeWithBody(String url, Long userId, HttpMethod method, Object body, Class<T> responseType) {
        HttpEntity<Object> entity = new HttpEntity<>(body, headers(userId));
        ResponseEntity<T> response = restTemplate.exchange(url, method, entity, responseType);
        return response.getBody();
    }

    private <T> T exchangeWithBody(String url, Long userId, HttpMethod method, Object body, ParameterizedTypeReference<T> type) {
        HttpEntity<Object> entity = new HttpEntity<>(body, headers(userId));
        ResponseEntity<T> response = restTemplate.exchange(url, method, entity, type);
        return response.getBody();
    }

    private HttpHeaders headers(Long userId) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-User-Id", userId.toString());
        headers.setContentType(MediaType.APPLICATION_JSON);
        return headers;
    }

    public record PagedResponse<T>(
            List<T> content,
            int currentPage,
            int totalPages,
            long totalElements,
            boolean hasNext
    ) {}

    public record InventoryProduct(
            Long id,
            Long userId,
            String name,
            String sku,
            String category,
            BigDecimal price,
            BigDecimal costPrice,
            Integer quantity,
            Integer reorderLevel,
            String supplier,
            String barcode,
            String imageUrl,
            boolean lowStock
    ) {}

    public record CategoryRef(Long id, String name) {}

    public record SaleItemRecord(
            Long productId,
            String productName,
            Integer quantity,
            BigDecimal unitPrice,
            BigDecimal subtotal
    ) {}

    public record SaleRecord(
            Long id,
            Long customerId,
            String customerName,
            BigDecimal totalAmount,
            String paymentMethod,
            String status,
            LocalDateTime saleDate,
            List<SaleItemRecord> items
    ) {}

    public record CustomerRecord(
            Long id,
            String name,
            String phone,
            String email,
            BigDecimal totalPurchases,
            BigDecimal dueAmount,
            LocalDateTime lastPurchaseDate
    ) {}
}
