package com.smartbiz.sales.service;

import com.smartbiz.sales.dto.*;
import com.smartbiz.sales.exception.InsufficientStockException;
import com.smartbiz.sales.exception.SaleNotFoundException;
import com.smartbiz.sales.model.Sale;
import com.smartbiz.sales.model.SaleItem;
import com.smartbiz.sales.repository.SaleItemRepository;
import com.smartbiz.sales.repository.SaleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SalesService {

    private static final String INVENTORY_BASE = "http://INVENTORY-SERVICE/inventory/products";
    private static final String CRM_BASE = "http://CRM-SERVICE/customers";

    private final SaleRepository saleRepository;
    private final SaleItemRepository saleItemRepository;
    private final RestTemplate restTemplate;

    @Transactional
    public SaleDTO createSale(Long userId, CreateSaleRequest request) {
        // 1. Validate stock availability for all items
        List<InventoryProductDTO> products = new ArrayList<>();
        for (SaleItemRequest itemReq : request.getItems()) {
            InventoryProductDTO product = fetchProduct(userId, itemReq.getProductId());
            if (product.getQuantity() < itemReq.getQuantity()) {
                throw new InsufficientStockException(
                        "Insufficient stock for '" + product.getName() + "'. Available: " + product.getQuantity());
            }
            products.add(product);
        }

        // 2. Build and save sale record
        Sale sale = new Sale();
        sale.setUserId(userId);
        sale.setCustomerId(request.getCustomerId());
        sale.setPaymentMethod(request.getPaymentMethod() != null ? request.getPaymentMethod() : "CASH");
        sale.setStatus("COMPLETED");
        sale.setSaleDate(LocalDateTime.now());
        sale.setCreatedBy(userId);

        BigDecimal total = BigDecimal.ZERO;
        List<SaleItem> saleItems = new ArrayList<>();
        for (int i = 0; i < request.getItems().size(); i++) {
            SaleItemRequest itemReq = request.getItems().get(i);
            InventoryProductDTO product = products.get(i);
            BigDecimal subtotal = product.getPrice().multiply(BigDecimal.valueOf(itemReq.getQuantity()));

            SaleItem item = new SaleItem();
            item.setProductId(itemReq.getProductId());
            item.setProductName(product.getName());
            item.setQuantity(itemReq.getQuantity());
            item.setUnitPrice(product.getPrice());
            item.setSubtotal(subtotal);
            saleItems.add(item);
            total = total.add(subtotal);
        }

        sale.setTotalAmount(total);
        Sale savedSale = saleRepository.save(sale);

        for (SaleItem item : saleItems) {
            item.setSaleId(savedSale.getId());
        }
        saleItemRepository.saveAll(saleItems);

        // 3. Deduct stock (exception here rolls back DB transaction)
        for (int i = 0; i < request.getItems().size(); i++) {
            SaleItemRequest itemReq = request.getItems().get(i);
            deductStock(userId, itemReq.getProductId(), itemReq.getQuantity(), savedSale.getId());
        }

        // 4. Update CRM customer total if customerId provided
        if (request.getCustomerId() != null) {
            updateCustomerTotal(userId, request.getCustomerId(), total);
        }

        log.info("Sale created: id={}, userId={}, total={}", savedSale.getId(), userId, total);
        return toDTO(savedSale, saleItems);
    }

    public List<SaleDTO> getSalesByUser(Long userId) {
        return saleRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(sale -> {
                    List<SaleItem> items = saleItemRepository.findBySaleId(sale.getId());
                    return toDTO(sale, items);
                })
                .collect(Collectors.toList());
    }

    public SaleDTO getSaleById(Long userId, Long saleId) {
        Sale sale = saleRepository.findByIdAndUserId(saleId, userId)
                .orElseThrow(() -> new SaleNotFoundException("Sale not found: " + saleId));
        List<SaleItem> items = saleItemRepository.findBySaleId(saleId);
        return toDTO(sale, items);
    }

    public List<DailyRevenueDTO> getWeeklySummary(Long userId) {
        List<DailyRevenueDTO> result = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            LocalDate day = LocalDate.now().minusDays(i);
            LocalDateTime start = day.atStartOfDay();
            LocalDateTime end = start.plusDays(1);
            BigDecimal revenue = saleRepository.sumRevenueByUserIdAndDateRange(userId, start, end);
            result.add(new DailyRevenueDTO(day, revenue != null ? revenue : BigDecimal.ZERO));
        }
        return result;
    }

    public SaleSummaryDTO getDailySummary(Long userId) {
        LocalDateTime start = LocalDate.now().atStartOfDay();
        LocalDateTime end = start.plusDays(1);

        BigDecimal revenue = saleRepository.sumRevenueByUserIdAndDateRange(userId, start, end);
        revenue = revenue != null ? revenue : BigDecimal.ZERO;
        Long count = saleRepository.countByUserIdAndDateRange(userId, start, end);

        BigDecimal avg = count > 0
                ? revenue.divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        return new SaleSummaryDTO(revenue, count, avg);
    }

    private InventoryProductDTO fetchProduct(Long userId, Long productId) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("X-User-Id", userId.toString());
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            ResponseEntity<InventoryProductDTO> response = restTemplate.exchange(
                    INVENTORY_BASE + "/" + productId, HttpMethod.GET, entity, InventoryProductDTO.class);
            return response.getBody();
        } catch (HttpClientErrorException.NotFound e) {
            throw new InsufficientStockException("Product not found: " + productId);
        }
    }

    private void deductStock(Long userId, Long productId, Integer quantity, Long saleId) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-User-Id", userId.toString());
            StockUpdateRequest stockReq = new StockUpdateRequest(-quantity, "SALE", "Sale #" + saleId);
            HttpEntity<StockUpdateRequest> entity = new HttpEntity<>(stockReq, headers);
            restTemplate.exchange(INVENTORY_BASE + "/" + productId + "/stock", HttpMethod.POST, entity, Object.class);
        } catch (HttpClientErrorException e) {
            throw new InsufficientStockException("Failed to deduct stock for product " + productId + ": " + e.getMessage());
        }
    }

    private void updateCustomerTotal(Long userId, Long customerId, BigDecimal amount) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-User-Id", userId.toString());
            HttpEntity<BigDecimal> entity = new HttpEntity<>(amount, headers);
            restTemplate.exchange(CRM_BASE + "/" + customerId + "/purchase", HttpMethod.PUT, entity, Object.class);
        } catch (Exception e) {
            log.warn("Failed to update CRM customer total for customerId={}: {}", customerId, e.getMessage());
        }
    }

    private SaleDTO toDTO(Sale sale, List<SaleItem> items) {
        SaleDTO dto = new SaleDTO();
        dto.setId(sale.getId());
        dto.setUserId(sale.getUserId());
        dto.setCustomerId(sale.getCustomerId());
        dto.setTotalAmount(sale.getTotalAmount());
        dto.setPaymentMethod(sale.getPaymentMethod());
        dto.setStatus(sale.getStatus());
        dto.setSaleDate(sale.getSaleDate());
        dto.setCreatedAt(sale.getCreatedAt());
        dto.setItems(items.stream().map(this::toItemDTO).collect(Collectors.toList()));
        return dto;
    }

    private SaleItemDTO toItemDTO(SaleItem item) {
        SaleItemDTO dto = new SaleItemDTO();
        dto.setId(item.getId());
        dto.setProductId(item.getProductId());
        dto.setProductName(item.getProductName());
        dto.setQuantity(item.getQuantity());
        dto.setUnitPrice(item.getUnitPrice());
        dto.setSubtotal(item.getSubtotal());
        return dto;
    }
}
