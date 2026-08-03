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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.DayOfWeek;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.time.ZoneId;
import com.smartbiz.payment.PlanAccessClient;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SalesService {
    private static final int MAX_TREND_DAYS = 366;

    private static final class MutableTrendPoint {
        private BigDecimal revenue = BigDecimal.ZERO;
        private long orders;
        private long itemsSold;

        private void add(BigDecimal saleRevenue, long saleItems) {
            revenue = revenue.add(saleRevenue != null ? saleRevenue : BigDecimal.ZERO);
            orders++;
            itemsSold += saleItems;
        }
    }

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
    private static final SaleProcessingOptions ESEWA_PENDING_OPTIONS =
            new SaleProcessingOptions(true, false, false, false, "PAYMENT_PENDING");

    private static final String INVENTORY_BASE = "http://INVENTORY-SERVICE/inventory/products";
    private static final String CRM_BASE = "http://CRM-SERVICE/customers";

    private final SaleRepository saleRepository;
    private final SaleItemRepository saleItemRepository;
    private final RestTemplate restTemplate;
    private final TransactionTemplate transactionTemplate;
    private final PlanAccessClient planAccessClient;
    @Value("${app.internal-service-token:smartbiz-internal-dev-token}") private String internalServiceToken;

    @Transactional
    public SaleDTO createSale(Long userId, CreateSaleRequest request) {
        enforceSalesLimit(userId);
        return createSaleInternal(userId, request, LIVE_SALE_OPTIONS);
    }

    @Transactional
    public SaleDTO createPendingEsewaSale(Long userId, CreateSaleRequest request, java.util.UUID reservationId, LocalDateTime expiresAt) {
        enforceSalesLimit(userId);
        request.setPaymentMethod("ESEWA");
        SaleDTO result = createSaleInternal(userId, request, ESEWA_PENDING_OPTIONS);
        Sale sale = saleRepository.findByIdAndUserId(result.getId(), userId)
            .orElseThrow(() -> new SaleNotFoundException("Sale not found: " + result.getId()));
        sale.setStockReservationId(reservationId);
        sale.setPaymentExpiresAt(expiresAt);
        saleRepository.save(sale);
        return result;
    }

    @Transactional
    public SaleDTO finalizeEsewaSale(Long userId, Long saleId, String paymentReference) {
        Sale sale = saleRepository.findLockedByIdAndUserId(saleId, userId)
            .orElseThrow(() -> new SaleNotFoundException("Sale not found: " + saleId));
        if ("COMPLETED".equals(sale.getStatus())) return toDTO(sale, saleItemRepository.findBySaleId(saleId));
        if (!List.of("PAYMENT_PENDING", "PAYMENT_REVIEW").contains(sale.getStatus())) {
            throw new IllegalStateException("Sale cannot be finalized from status " + sale.getStatus());
        }
        sale.setStatus("COMPLETED");
        sale.setPaymentReference(paymentReference);
        sale.setFinalizedAt(LocalDateTime.now());
        saleRepository.save(sale);
        if (sale.getCustomerId() != null) updateCustomerTotalExactlyOnce(userId, saleId, sale.getCustomerId(), sale.getTotalAmount());
        return toDTO(sale, saleItemRepository.findBySaleId(saleId));
    }

    @Transactional
    public SaleDTO cancelEsewaSale(Long userId, Long saleId, boolean review) {
        Sale sale = saleRepository.findLockedByIdAndUserId(saleId, userId)
            .orElseThrow(() -> new SaleNotFoundException("Sale not found: " + saleId));
        if ("COMPLETED".equals(sale.getStatus())) throw new IllegalStateException("Completed sale cannot be canceled");
        if (!"CANCELED".equals(sale.getStatus())) {
            sale.setStatus(review ? "PAYMENT_REVIEW" : "CANCELED");
            saleRepository.save(sale);
        }
        return toDTO(sale, saleItemRepository.findBySaleId(saleId));
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
        planAccessClient.requirePro(userId, "Sales file imports");
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

    public SalesTrendDTO getTrend(Long userId, LocalDate from, LocalDate to, AnalyticsBucket bucket) {
        planAccessClient.requirePro(userId, "Advanced sales trends");
        validateTrendRange(from, to, bucket);

        LocalDateTime start = from.atStartOfDay();
        LocalDateTime endExclusive = to.plusDays(1).atStartOfDay();
        List<Sale> sales = saleRepository
                .findByUserIdAndSaleDateGreaterThanEqualAndSaleDateLessThanOrderBySaleDateDesc(
                        userId, start, endExclusive).stream()
                .filter(sale -> List.of("COMPLETED", "IMPORTED").contains(sale.getStatus()))
                .toList();

        List<Long> saleIds = sales.stream().map(Sale::getId).toList();
        Map<Long, Long> itemsBySale = saleIds.isEmpty()
                ? Map.of()
                : saleItemRepository.findAllBySaleIdIn(saleIds).stream()
                        .collect(Collectors.groupingBy(
                                SaleItem::getSaleId,
                                Collectors.summingLong(item -> item.getQuantity() != null ? item.getQuantity() : 0L)
                        ));

        LinkedHashMap<LocalDateTime, MutableTrendPoint> buckets = initializeBuckets(from, to, bucket);
        BigDecimal totalRevenue = BigDecimal.ZERO;
        long totalItems = 0L;

        for (Sale sale : sales) {
            LocalDateTime key = bucketStart(sale.getSaleDate(), bucket);
            long saleItems = itemsBySale.getOrDefault(sale.getId(), 0L);
            MutableTrendPoint point = buckets.get(key);
            if (point != null) {
                point.add(sale.getTotalAmount(), saleItems);
            }
            totalRevenue = totalRevenue.add(
                    sale.getTotalAmount() != null ? sale.getTotalAmount() : BigDecimal.ZERO);
            totalItems += saleItems;
        }

        long totalOrders = sales.size();
        BigDecimal averageOrderValue = totalOrders > 0
                ? totalRevenue.divide(BigDecimal.valueOf(totalOrders), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        List<SalesTrendPointDTO> points = buckets.entrySet().stream()
                .map(entry -> new SalesTrendPointDTO(
                        entry.getKey(),
                        entry.getValue().revenue,
                        entry.getValue().orders,
                        entry.getValue().itemsSold
                ))
                .toList();

        return new SalesTrendDTO(
                from,
                to,
                bucket,
                new SalesTrendTotalsDTO(totalRevenue, totalOrders, totalItems, averageOrderValue),
                points
        );
    }

    private void validateTrendRange(LocalDate from, LocalDate to, AnalyticsBucket bucket) {
        if (from == null || to == null || bucket == null) {
            throw new IllegalArgumentException("from, to, and bucket are required");
        }
        if (from.isAfter(to)) {
            throw new IllegalArgumentException("from must be on or before to");
        }
        long inclusiveDays = ChronoUnit.DAYS.between(from, to) + 1;
        if (inclusiveDays > MAX_TREND_DAYS) {
            throw new IllegalArgumentException("Analytics range cannot exceed 366 days");
        }
    }

    private LinkedHashMap<LocalDateTime, MutableTrendPoint> initializeBuckets(
            LocalDate from,
            LocalDate to,
            AnalyticsBucket bucket) {
        LinkedHashMap<LocalDateTime, MutableTrendPoint> points = new LinkedHashMap<>();
        LocalDateTime current = bucketStart(from.atStartOfDay(), bucket);
        LocalDateTime last = bucketStart(to.atTime(23, 59, 59), bucket);

        while (!current.isAfter(last)) {
            points.put(current, new MutableTrendPoint());
            current = nextBucket(current, bucket);
        }
        return points;
    }

    private LocalDateTime bucketStart(LocalDateTime value, AnalyticsBucket bucket) {
        return switch (bucket) {
            case HOUR -> value.withMinute(0).withSecond(0).withNano(0);
            case DAY -> value.toLocalDate().atStartOfDay();
            case WEEK -> value.toLocalDate()
                    .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
                    .atStartOfDay();
            case MONTH -> value.toLocalDate().withDayOfMonth(1).atStartOfDay();
        };
    }

    private LocalDateTime nextBucket(LocalDateTime value, AnalyticsBucket bucket) {
        return switch (bucket) {
            case HOUR -> value.plusHours(1);
            case DAY -> value.plusDays(1);
            case WEEK -> value.plusWeeks(1);
            case MONTH -> value.plusMonths(1);
        };
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

    private void updateCustomerTotalExactlyOnce(Long userId, Long saleId, Long customerId, BigDecimal amount) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Internal-Service-Token", internalServiceToken);
        Map<String, Object> body = Map.of("userId", userId, "saleId", saleId, "customerId", customerId, "amount", amount);
        restTemplate.exchange(CRM_BASE + "/internal/purchases", HttpMethod.POST, new HttpEntity<>(body, headers), Void.class);
    }

    private void enforceSalesLimit(Long userId) {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Kathmandu"));
        LocalDateTime start = today.withDayOfMonth(1).atStartOfDay();
        LocalDateTime end = today.plusMonths(1).withDayOfMonth(1).atStartOfDay();
        planAccessClient.requireWithinLimit(userId, "Monthly sales", saleRepository.countQuotaSales(userId, start, end), 300);
    }
}
