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
import org.springframework.http.*;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.LocalDateTime;
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

    private InventoryProductDTO product;
    private CreateSaleRequest request;
    private Sale savedSale;

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

        savedSale = new Sale();
        savedSale.setId(100L);
        savedSale.setUserId(1L);
        savedSale.setTotalAmount(new BigDecimal("200.00"));
        savedSale.setStatus("COMPLETED");
        savedSale.setSaleDate(LocalDateTime.now());
    }

    @Test
    void createSale_success_returnsSaleDTO() {
        when(restTemplate.exchange(contains("/inventory/products/1"), eq(HttpMethod.GET), any(), eq(InventoryProductDTO.class)))
                .thenReturn(ResponseEntity.ok(product));
        when(saleRepository.save(any(Sale.class))).thenReturn(savedSale);
        when(saleItemRepository.saveAll(anyList())).thenReturn(List.of(new SaleItem()));
        when(restTemplate.exchange(contains("/stock"), eq(HttpMethod.POST), any(), eq(Object.class)))
                .thenReturn(ResponseEntity.ok(null));

        SaleDTO result = salesService.createSale(1L, request);

        assertThat(result.getId()).isEqualTo(100L);
        assertThat(result.getTotalAmount()).isEqualByComparingTo(new BigDecimal("200.00"));
        verify(saleRepository).save(any(Sale.class));
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
        when(saleRepository.save(any(Sale.class))).thenReturn(savedSale);
        when(saleItemRepository.saveAll(anyList())).thenReturn(List.of());
        when(restTemplate.exchange(contains("/stock"), eq(HttpMethod.POST), any(), eq(Object.class)))
                .thenThrow(HttpClientErrorException.create(HttpStatus.BAD_REQUEST, "Bad Request",
                        HttpHeaders.EMPTY, new byte[0], null));

        assertThatThrownBy(() -> salesService.createSale(1L, request))
                .isInstanceOf(InsufficientStockException.class);
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
    void importSales_usesTransactionTemplateForEachSale() {
        when(restTemplate.exchange(contains("/inventory/products/1"), eq(HttpMethod.GET), any(), eq(InventoryProductDTO.class)))
                .thenReturn(ResponseEntity.ok(product));
        when(saleRepository.save(any(Sale.class))).thenReturn(savedSale);
        when(saleItemRepository.saveAll(anyList())).thenReturn(List.of(new SaleItem()));
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
            return sale;
        });
        when(saleItemRepository.saveAll(anyList())).thenReturn(List.of(new SaleItem()));
        when(transactionTemplate.execute(any())).thenAnswer(invocation -> invocation.getArgument(0, org.springframework.transaction.support.TransactionCallback.class).doInTransaction(null));

        List<SaleDTO> result = salesService.importSales(1L, new ImportSalesRequest(List.of(request)));

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getStatus()).isEqualTo("IMPORTED");
    }
}
