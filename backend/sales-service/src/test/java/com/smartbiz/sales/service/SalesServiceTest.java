package com.smartbiz.sales.service;

import com.smartbiz.sales.dto.*;
import com.smartbiz.sales.exception.InsufficientStockException;
import com.smartbiz.sales.model.Sale;
import com.smartbiz.sales.model.SaleItem;
import com.smartbiz.sales.repository.SaleItemRepository;
import com.smartbiz.sales.repository.SaleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import com.smartbiz.payment.PlanAccessClient;
import org.springframework.http.*;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SalesServiceTest {

    @Mock SaleRepository saleRepository;
    @Mock SaleItemRepository saleItemRepository;
    @Mock RestTemplate restTemplate;
    @Mock TransactionTemplate transactionTemplate;

    @InjectMocks SalesService salesService;
    @Mock PlanAccessClient planAccessClient;

    private InventoryProductDTO product;
    private CreateSaleRequest request;

    @BeforeEach
    void setUp() {
        product = new InventoryProductDTO();
        product.setId(1L);
        product.setName("Test Product");
        product.setPrice(new BigDecimal("100.00"));
        product.setQuantity(10);

        SaleItemRequest itemReq = new SaleItemRequest();
        itemReq.setProductId(1L);
        itemReq.setQuantity(2);

        request = new CreateSaleRequest();
        request.setItems(List.of(itemReq));
        request.setPaymentMethod("CASH");
    }

    @Test
    void createSale_success_returnsSaleDTO() {
        when(restTemplate.exchange(contains("/inventory/products/1"), eq(HttpMethod.GET), any(), eq(InventoryProductDTO.class)))
                .thenReturn(ResponseEntity.ok(product));
        when(saleRepository.save(any(Sale.class))).thenAnswer(invocation -> {
            Sale sale = invocation.getArgument(0);
            sale.setId(100L);
            sale.setCreatedAt(LocalDateTime.now());
            return sale;
        });
        when(saleItemRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));
        when(restTemplate.exchange(contains("/stock"), eq(HttpMethod.POST), any(), eq(Object.class)))
                .thenReturn(ResponseEntity.ok(null));

        SaleDTO result = salesService.createSale(1L, request);

        assertThat(result.getId()).isEqualTo(100L);
        assertThat(result.getTotalAmount()).isEqualByComparingTo(new BigDecimal("200.00"));
        verify(saleRepository).save(any(Sale.class));
    }

    @Test
    void createSale_withHistoricalSaleDate_preservesRequestedDate() {
        LocalDateTime historicalDate = LocalDateTime.of(2024, 5, 10, 14, 30, 0);
        request.setSaleDate("2024-05-10T14:30");

        when(restTemplate.exchange(contains("/inventory/products/1"), eq(HttpMethod.GET), any(), eq(InventoryProductDTO.class)))
                .thenReturn(ResponseEntity.ok(product));
        when(saleRepository.save(any(Sale.class))).thenAnswer(invocation -> {
            Sale sale = invocation.getArgument(0);
            sale.setId(101L);
            sale.setCreatedAt(LocalDateTime.now());
            return sale;
        });
        when(saleItemRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));
        when(restTemplate.exchange(contains("/stock"), eq(HttpMethod.POST), any(), eq(Object.class)))
                .thenReturn(ResponseEntity.ok(null));

        SaleDTO result = salesService.createSale(1L, request);

        assertThat(result.getSaleDate()).isEqualTo(historicalDate);
    }

    @Test
    void createSale_withoutSaleDate_defaultsToCurrentTime() {
        when(restTemplate.exchange(contains("/inventory/products/1"), eq(HttpMethod.GET), any(), eq(InventoryProductDTO.class)))
                .thenReturn(ResponseEntity.ok(product));
        when(saleRepository.save(any(Sale.class))).thenAnswer(invocation -> {
            Sale sale = invocation.getArgument(0);
            sale.setId(102L);
            sale.setCreatedAt(LocalDateTime.now());
            return sale;
        });
        when(saleItemRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));
        when(restTemplate.exchange(contains("/stock"), eq(HttpMethod.POST), any(), eq(Object.class)))
                .thenReturn(ResponseEntity.ok(null));

        LocalDateTime before = LocalDateTime.now().minusSeconds(1);
        SaleDTO result = salesService.createSale(1L, request);
        LocalDateTime after = LocalDateTime.now().plusSeconds(1);

        assertThat(result.getSaleDate()).isAfterOrEqualTo(before.truncatedTo(ChronoUnit.SECONDS));
        assertThat(result.getSaleDate()).isBeforeOrEqualTo(after.truncatedTo(ChronoUnit.SECONDS));
    }

    @Test
    void createSale_insufficientStock_throwsAndDoesNotSave() {
        product.setQuantity(1);

        when(restTemplate.exchange(contains("/inventory/products/1"), eq(HttpMethod.GET), any(), eq(InventoryProductDTO.class)))
                .thenReturn(ResponseEntity.ok(product));

        assertThatThrownBy(() -> salesService.createSale(1L, request))
                .isInstanceOf(InsufficientStockException.class)
                .hasMessageContaining("Insufficient stock");

        verify(saleRepository, never()).save(any());
    }

    @Test
    void createSale_stockDeductionFails_throwsException() {
        when(restTemplate.exchange(contains("/inventory/products/1"), eq(HttpMethod.GET), any(), eq(InventoryProductDTO.class)))
                .thenReturn(ResponseEntity.ok(product));
        when(saleRepository.save(any(Sale.class))).thenAnswer(invocation -> {
            Sale sale = invocation.getArgument(0);
            sale.setId(100L);
            sale.setCreatedAt(LocalDateTime.now());
            return sale;
        });
        when(saleItemRepository.saveAll(anyList())).thenReturn(List.of());
        when(restTemplate.exchange(contains("/stock"), eq(HttpMethod.POST), any(), eq(Object.class)))
                .thenThrow(HttpClientErrorException.create(HttpStatus.BAD_REQUEST, "Bad Request",
                        HttpHeaders.EMPTY, new byte[0], null));

        assertThatThrownBy(() -> salesService.createSale(1L, request))
                .isInstanceOf(InsufficientStockException.class);
    }

    @Test
    void createSale_customUnitPriceOverridesProductPrice() {
        request.getItems().get(0).setUnitPrice(new BigDecimal("175.50"));

        when(restTemplate.exchange(contains("/inventory/products/1"), eq(HttpMethod.GET), any(), eq(InventoryProductDTO.class)))
                .thenReturn(ResponseEntity.ok(product));
        when(saleRepository.save(any(Sale.class))).thenAnswer(invocation -> {
            Sale sale = invocation.getArgument(0);
            sale.setId(103L);
            sale.setCreatedAt(LocalDateTime.now());
            return sale;
        });
        when(saleItemRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));
        when(restTemplate.exchange(contains("/stock"), eq(HttpMethod.POST), any(), eq(Object.class)))
                .thenReturn(ResponseEntity.ok(null));

        SaleDTO result = salesService.createSale(1L, request);

        assertThat(result.getItems()).hasSize(1);
        assertThat(result.getItems().get(0).getUnitPrice()).isEqualByComparingTo(new BigDecimal("175.50"));
        assertThat(result.getItems().get(0).getSubtotal()).isEqualByComparingTo(new BigDecimal("351.00"));
        assertThat(result.getTotalAmount()).isEqualByComparingTo(new BigDecimal("351.00"));
    }

    @Test
    void createSale_invalidUnitPrice_rejected() {
        request.getItems().get(0).setUnitPrice(BigDecimal.ZERO);

        when(restTemplate.exchange(contains("/inventory/products/1"), eq(HttpMethod.GET), any(), eq(InventoryProductDTO.class)))
                .thenReturn(ResponseEntity.ok(product));

        assertThatThrownBy(() -> salesService.createSale(1L, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Unit price must be greater than 0");

        verify(saleRepository, never()).save(any());
    }

    @Test
    void getDailySummary_noSales_returnsZeros() {
        when(saleRepository.sumRevenueByUserIdAndDateRange(anyLong(), any(), any()))
                .thenReturn(BigDecimal.ZERO);
        when(saleRepository.countByUserIdAndDateRange(anyLong(), any(), any()))
                .thenReturn(0L);

        SaleSummaryDTO result = salesService.getDailySummary(1L);

        assertThat(result.getTotalRevenue()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(result.getOrderCount()).isEqualTo(0L);
        assertThat(result.getAvgOrderValue()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    void getTrend_includesDueRevenueAndAggregatesOrdersAndItems() {
        LocalDate day = LocalDate.of(2026, 8, 3);
        Sale cashSale = sale(10L, 1L, "100.00", "CASH", day.atTime(10, 15));
        Sale dueSale = sale(10L, 2L, "50.00", "DUE", day.atTime(14, 30));

        when(saleRepository.findByUserIdAndSaleDateGreaterThanEqualAndSaleDateLessThanOrderBySaleDateDesc(
                10L, day.atStartOfDay(), day.plusDays(1).atStartOfDay()))
                .thenReturn(List.of(dueSale, cashSale));
        when(saleItemRepository.findAllBySaleIdIn(List.of(2L, 1L)))
                .thenReturn(List.of(saleItem(1L, 2), saleItem(2L, 3)));

        SalesTrendDTO result = salesService.getTrend(10L, day, day, AnalyticsBucket.DAY);

        assertThat(result.totals().revenue()).isEqualByComparingTo("150.00");
        assertThat(result.totals().orders()).isEqualTo(2);
        assertThat(result.totals().itemsSold()).isEqualTo(5);
        assertThat(result.totals().averageOrderValue()).isEqualByComparingTo("75.00");
        assertThat(result.points()).singleElement().satisfies(point -> {
            assertThat(point.revenue()).isEqualByComparingTo("150.00");
            assertThat(point.orders()).isEqualTo(2);
            assertThat(point.itemsSold()).isEqualTo(5);
        });
        verify(saleRepository).findByUserIdAndSaleDateGreaterThanEqualAndSaleDateLessThanOrderBySaleDateDesc(
                eq(10L), any(LocalDateTime.class), any(LocalDateTime.class));
    }

    @Test
    void getTrend_fillsMissingDailyBucketsWithZeros() {
        LocalDate from = LocalDate.of(2026, 8, 1);
        LocalDate to = LocalDate.of(2026, 8, 3);
        Sale sale = sale(5L, 8L, "80.00", "CASH", LocalDateTime.of(2026, 8, 2, 12, 0));

        when(saleRepository.findByUserIdAndSaleDateGreaterThanEqualAndSaleDateLessThanOrderBySaleDateDesc(
                eq(5L), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(List.of(sale));
        when(saleItemRepository.findAllBySaleIdIn(List.of(8L))).thenReturn(List.of(saleItem(8L, 1)));

        SalesTrendDTO result = salesService.getTrend(5L, from, to, AnalyticsBucket.DAY);

        assertThat(result.points()).hasSize(3);
        assertThat(result.points().get(0).revenue()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(result.points().get(1).revenue()).isEqualByComparingTo("80.00");
        assertThat(result.points().get(2).orders()).isZero();
    }

    @Test
    void getTrend_alignsHourWeekAndMonthBuckets() {
        LocalDate from = LocalDate.of(2026, 8, 1);
        LocalDate to = LocalDate.of(2026, 8, 5);
        Sale sale = sale(1L, 9L, "25.00", "CASH", LocalDateTime.of(2026, 8, 5, 13, 37));

        when(saleRepository.findByUserIdAndSaleDateGreaterThanEqualAndSaleDateLessThanOrderBySaleDateDesc(
                eq(1L), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(List.of(sale));
        when(saleItemRepository.findAllBySaleIdIn(List.of(9L))).thenReturn(List.of(saleItem(9L, 4)));

        SalesTrendDTO hourly = salesService.getTrend(1L, from, to, AnalyticsBucket.HOUR);
        SalesTrendDTO weekly = salesService.getTrend(1L, from, to, AnalyticsBucket.WEEK);
        SalesTrendDTO monthly = salesService.getTrend(1L, from, to, AnalyticsBucket.MONTH);

        assertThat(hourly.points()).anySatisfy(point -> {
            assertThat(point.periodStart()).isEqualTo(LocalDateTime.of(2026, 8, 5, 13, 0));
            assertThat(point.orders()).isEqualTo(1);
        });
        assertThat(weekly.points()).anySatisfy(point -> {
            assertThat(point.periodStart()).isEqualTo(LocalDateTime.of(2026, 8, 3, 0, 0));
            assertThat(point.orders()).isEqualTo(1);
        });
        assertThat(monthly.points()).singleElement().satisfies(point -> {
            assertThat(point.periodStart()).isEqualTo(LocalDateTime.of(2026, 8, 1, 0, 0));
            assertThat(point.itemsSold()).isEqualTo(4);
        });
    }

    @Test
    void getTrend_usesInclusiveDateBoundaries() {
        LocalDate from = LocalDate.of(2026, 7, 30);
        LocalDate to = LocalDate.of(2026, 8, 3);
        when(saleRepository.findByUserIdAndSaleDateGreaterThanEqualAndSaleDateLessThanOrderBySaleDateDesc(
                7L, from.atStartOfDay(), to.plusDays(1).atStartOfDay()))
                .thenReturn(List.of());

        salesService.getTrend(7L, from, to, AnalyticsBucket.DAY);

        verify(saleRepository).findByUserIdAndSaleDateGreaterThanEqualAndSaleDateLessThanOrderBySaleDateDesc(
                7L, from.atStartOfDay(), to.plusDays(1).atStartOfDay());
        verify(saleItemRepository, never()).findAllBySaleIdIn(anyList());
    }

    @Test
    void getTrend_rejectsReversedAndLongRanges() {
        LocalDate start = LocalDate.of(2025, 1, 1);

        assertThatThrownBy(() -> salesService.getTrend(1L, start.plusDays(1), start, AnalyticsBucket.DAY))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("on or before");
        assertThatThrownBy(() -> salesService.getTrend(1L, start, start.plusDays(366), AnalyticsBucket.MONTH))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("366 days");
        assertThatThrownBy(() -> salesService.getTrend(1L, null, start, AnalyticsBucket.DAY))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("required");

        verifyNoInteractions(saleRepository, saleItemRepository);
    }

    @Test
    void importSales_usesTransactionTemplateForEachSale() {
        when(restTemplate.exchange(contains("/inventory/products/1"), eq(HttpMethod.GET), any(), eq(InventoryProductDTO.class)))
                .thenReturn(ResponseEntity.ok(product));
        when(saleRepository.save(any(Sale.class))).thenAnswer(invocation -> {
            Sale sale = invocation.getArgument(0);
            sale.setId(100L);
            sale.setCreatedAt(LocalDateTime.now());
            return sale;
        });
        when(saleItemRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));
        when(transactionTemplate.execute(any())).thenAnswer(invocation -> invocation.getArgument(0, org.springframework.transaction.support.TransactionCallback.class).doInTransaction(null));

        List<SaleDTO> result = salesService.importSales(1L, new ImportSalesRequest(List.of(request)));

        assertThat(result).hasSize(1);
        verify(transactionTemplate).execute(any());
        verify(restTemplate, never()).exchange(contains("/stock"), eq(HttpMethod.POST), any(), eq(Object.class));
        verify(restTemplate, never()).exchange(contains("/purchase"), any(), any(), eq(Object.class));
        verify(restTemplate, never()).exchange(contains("/due"), any(), any(), eq(Object.class));
    }

    @Test
    void importSales_marksRecordsAsImported() {
        when(restTemplate.exchange(contains("/inventory/products/1"), eq(HttpMethod.GET), any(), eq(InventoryProductDTO.class)))
                .thenReturn(ResponseEntity.ok(product));
        when(saleRepository.save(any(Sale.class))).thenAnswer(invocation -> {
            Sale sale = invocation.getArgument(0);
            sale.setId(101L);
            sale.setCreatedAt(LocalDateTime.now());
            return sale;
        });
        when(saleItemRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));
        when(transactionTemplate.execute(any())).thenAnswer(invocation -> invocation.getArgument(0, org.springframework.transaction.support.TransactionCallback.class).doInTransaction(null));

        List<SaleDTO> result = salesService.importSales(1L, new ImportSalesRequest(List.of(request)));

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getStatus()).isEqualTo("IMPORTED");
    }

    private Sale sale(Long userId, Long id, String total, String paymentMethod, LocalDateTime saleDate) {
        Sale sale = new Sale();
        sale.setId(id);
        sale.setUserId(userId);
        sale.setTotalAmount(new BigDecimal(total));
        sale.setPaymentMethod(paymentMethod);
        sale.setSaleDate(saleDate);
        sale.setStatus("COMPLETED");
        return sale;
    }

    private SaleItem saleItem(Long saleId, int quantity) {
        SaleItem item = new SaleItem();
        item.setSaleId(saleId);
        item.setQuantity(quantity);
        return item;
    }
}
