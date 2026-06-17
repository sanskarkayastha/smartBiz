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
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SalesService {
    private record SaleProcessingOptions(
            boolean validateStock,
            boolean deductStock,
            boolean updateCustomerTotals,
            boolean requireCustomerForDue,
            String status
    ) {}

    private static final SaleProcessingOptions LIVE_SALE_OPTIONS =
            new SaleProcessingOptions(true, true, true, true, "COMPLETED");
    private static final SaleProcessingOptions IMPORTED_SALE_OPTIONS =
            new SaleProcessingOptions(false, false, false, false, "IMPORTED");

    private static final String INVENTORY_BASE = "http://INVENTORY-SERVICE/inventory/products";
    private static final String CRM_BASE = "http://CRM-SERVICE/customers";

    private final SaleRepository saleRepository;
    private final SaleItemRepository saleItemRepository;
    private final RestTemplate restTemplate;
    private final TransactionTemplate transactionTemplate;

    @Transactional
    public SaleDTO createSale(Long userId, CreateSaleRequest request) {
        return createSaleInternal(userId, request, LIVE_SALE_OPTIONS);
    }

    private SaleDTO createSaleInternal(Long userId, CreateSaleRequest request, SaleProcessingOptions options) {
        // 1. Load referenced products, and validate stock for live sales only.
        List<InventoryProductDTO> products = new ArrayList<>();
        for (SaleItemRequest itemReq : request.getItems()) {
            InventoryProductDTO product = fetchProduct(userId, itemReq.getProductId());
            if (options.validateStock() && product.getQuantity() < itemReq.getQuantity()) {
                throw new InsufficientStockException(
                        "Insufficient stock for '" + product.getName() + "'. Available: " + product.getQuantity());
            }
            products.add(product);
        }

        String paymentMethod = request.getPaymentMethod() != null ? request.getPaymentMethod() : "CASH";
        if (options.requireCustomerForDue() && "DUE".equals(paymentMethod) && request.getCustomerId() == null) {
            throw new IllegalArgumentException("DUE payment requires a customer to be selected");
        }

        // 2. Build and save sale record
        Sale sale = new Sale();
        sale.setUserId(userId);
        sale.setCustomerId(request.getCustomerId());
        sale.setCustomerName(request.getCustomerName());
        sale.setPaymentMethod(paymentMethod);
        sale.setStatus(options.status());
        sale.setSaleDate(resolveSaleDate(request));
        sale.setCreatedBy(userId);

        BigDecimal total = BigDecimal.ZERO;
        List<SaleItem> saleItems = new ArrayList<>();
        for (int i = 0; i < request.getItems().size(); i++) {
            SaleItemRequest itemReq = request.getItems().get(i);
            InventoryProductDTO product = products.get(i);
            BigDecimal effectivePrice = resolveUnitPrice(itemReq, product);
            BigDecimal subtotal = effectivePrice.multiply(BigDecimal.valueOf(itemReq.getQuantity()));

            SaleItem item = new SaleItem();
            item.setProductId(itemReq.getProductId());
            item.setProductName(product.getName());
            item.setQuantity(itemReq.getQuantity());
            item.setUnitPrice(effectivePrice);
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

        // 3. Deduct stock only for live POS sales.
        if (options.deductStock()) {
            for (int i = 0; i < request.getItems().size(); i++) {
                SaleItemRequest itemReq = request.getItems().get(i);
                deductStock(userId, itemReq.getProductId(), itemReq.getQuantity(), savedSale.getId());
            }
        }

        // 4. Update CRM only for live POS sales.
        if (options.updateCustomerTotals() && request.getCustomerId() != null) {
            updateCustomerTotal(userId, request.getCustomerId(), total);
            if ("DUE".equals(paymentMethod)) {
                addCustomerDue(userId, request.getCustomerId(), total);
            }
        }

        log.info("Sale created: id={}, userId={}, total={}", savedSale.getId(), userId, total);
        return toDTO(savedSale, saleItems);
    }

    public List<SaleDTO> importSales(Long userId, ImportSalesRequest request) {
        List<CreateSaleRequest> sales = request.sales().stream()
                .sorted(Comparator.comparing(sale -> {
                    LocalDateTime parsedSaleDate = sale.parseSaleDate();
                    return parsedSaleDate != null ? parsedSaleDate : LocalDateTime.now();
                }))
                .toList();

        List<SaleDTO> results = new ArrayList<>();
        for (CreateSaleRequest sale : sales) {
            SaleDTO result = transactionTemplate.execute(status -> createSaleInternal(userId, sale, IMPORTED_SALE_OPTIONS));
            if (result == null) {
                throw new IllegalStateException("Sale import failed before completion");
            }
            results.add(result);
        }
        return results;
    }

    public List<SaleDTO> getSalesByUser(Long userId, LocalDate date, LocalDate dateFrom, LocalDate dateTo) {
        List<Sale> sales;

        if (date != null) {
            sales = getSalesByDateRange(userId, date, date);
        } else if (dateFrom != null || dateTo != null) {
            LocalDate start = dateFrom != null ? dateFrom : dateTo;
            LocalDate end = dateTo != null ? dateTo : dateFrom;

            if (start != null && end != null && start.isAfter(end)) {
                LocalDate swap = start;
                start = end;
                end = swap;
            }

            sales = getSalesByDateRange(userId, start, end);
        } else {
            sales = saleRepository.findByUserIdOrderBySaleDateDesc(userId);
        }

        return sales.stream()
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

        BigDecimal due = saleRepository.sumDueByUserIdAndDateRange(userId, start, end);
        due = due != null ? due : BigDecimal.ZERO;

        Long count = saleRepository.countByUserIdAndDateRange(userId, start, end);

        BigDecimal avg = count > 0
                ? revenue.divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        return new SaleSummaryDTO(revenue, count, avg, due);
    }

    private List<Sale> getSalesByDateRange(Long userId, LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null) {
            return saleRepository.findByUserIdOrderBySaleDateDesc(userId);
        }

        LocalDateTime start = startDate.atStartOfDay();
        LocalDateTime endExclusive = endDate.plusDays(1).atStartOfDay();

        return saleRepository.findByUserIdAndSaleDateGreaterThanEqualAndSaleDateLessThanOrderBySaleDateDesc(
                userId,
                start,
                endExclusive
        );
    }

    private LocalDateTime resolveSaleDate(CreateSaleRequest request) {
        LocalDateTime parsedSaleDate = request.parseSaleDate();
        return parsedSaleDate != null ? parsedSaleDate : LocalDateTime.now();
    }

    private BigDecimal resolveUnitPrice(SaleItemRequest itemReq, InventoryProductDTO product) {
        BigDecimal effectivePrice = itemReq.getUnitPrice() != null ? itemReq.getUnitPrice() : product.getPrice();
        if (effectivePrice == null || effectivePrice.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Unit price must be greater than 0");
        }
        return effectivePrice;
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

    private void addCustomerDue(Long userId, Long customerId, BigDecimal amount) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-User-Id", userId.toString());
            HttpEntity<BigDecimal> entity = new HttpEntity<>(amount, headers);
            restTemplate.exchange(CRM_BASE + "/" + customerId + "/due", HttpMethod.PUT, entity, Object.class);
        } catch (Exception e) {
            log.warn("Failed to update CRM due amount for customerId={}: {}", customerId, e.getMessage());
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
        dto.setCustomerName(sale.getCustomerName());
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
