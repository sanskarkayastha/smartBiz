package com.smartbiz.inventory.service;

import com.smartbiz.inventory.dto.CreateProductRequest;
import com.smartbiz.inventory.dto.PagedResponse;
import com.smartbiz.inventory.dto.PaymentStatus;
import com.smartbiz.inventory.dto.ProductDTO;
import com.smartbiz.inventory.dto.RestockProductRequest;
import com.smartbiz.inventory.dto.StockUpdateRequest;
import com.smartbiz.inventory.exception.InsufficientStockException;
import com.smartbiz.inventory.exception.ProductNotFoundException;
import com.smartbiz.inventory.model.Product;
import com.smartbiz.inventory.model.StockHistory;
import com.smartbiz.inventory.repository.ProductRepository;
import com.smartbiz.inventory.repository.StockHistoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProductServiceTest {

    @Mock ProductRepository productRepository;
    @Mock StockHistoryRepository stockHistoryRepository;
    @Mock SupplierService supplierService;

    @InjectMocks ProductService productService;

    private Product product;

    @BeforeEach
    void setUp() {
        product = Product.builder()
            .userId(10L)
            .name("Test Product")
            .sku("TEST-001")
            .price(new BigDecimal("500.00"))
            .quantity(20)
            .reorderLevel(5)
            .build();
        product.setId(1L);
    }

    @Test
    void createProduct_success_returnsDTO() {
        CreateProductRequest request = new CreateProductRequest(
            "Test Product", "TEST-001", "Groceries",
            new BigDecimal("500.00"), 20, 5, null, null, null, null, null, null
        );

        when(productRepository.save(any(Product.class))).thenReturn(product);
        when(stockHistoryRepository.save(any(StockHistory.class))).thenReturn(new StockHistory());

        ProductDTO result = productService.create(10L, request);

        assertThat(result.name()).isEqualTo("Test Product");
        assertThat(result.quantity()).isEqualTo(20);
        verify(productRepository).save(any(Product.class));
    }

    @Test
    void createProduct_duePurchase_recordsOutstandingSupplierBalance() {
        Product stockedProduct = Product.builder()
            .userId(10L)
            .name("Test Product")
            .price(new BigDecimal("500.00"))
            .costPrice(new BigDecimal("300.00"))
            .quantity(20)
            .supplier("ABC Traders")
            .build();
        stockedProduct.setId(1L);

        CreateProductRequest request = new CreateProductRequest(
            "Test Product", "TEST-001", "Groceries",
            new BigDecimal("500.00"), 20, 5, "ABC Traders", null, null, new BigDecimal("300.00"),
            PaymentStatus.DUE, null
        );

        when(productRepository.save(any(Product.class))).thenReturn(stockedProduct);
        when(stockHistoryRepository.save(any(StockHistory.class))).thenReturn(new StockHistory());

        productService.create(10L, request);

        verify(supplierService).recordPurchase(
            10L,
            "ABC Traders",
            1L,
            20,
            new BigDecimal("300.00"),
            PaymentStatus.DUE,
            null,
            "Initial stock on creation"
        );
    }

    @Test
    void findAll_returnsOnlyOwnProducts() {
        Page<Product> page = new PageImpl<>(List.of(product));
        when(productRepository.findWithFilters(eq(10L), eq(""), eq(""), eq(""), any(Pageable.class))).thenReturn(page);

        PagedResponse<ProductDTO> result = productService.findAll(10L, 0, 20, null, null, null);

        assertThat(result.content()).hasSize(1);
        assertThat(result.content().get(0).userId()).isEqualTo(10L);
    }

    @Test
    void adjustStock_insufficientStock_throwsInsufficientStockException() {
        StockUpdateRequest request = new StockUpdateRequest(-100, "SALE", "Sale test");

        when(productRepository.findByIdAndUserId(1L, 10L)).thenReturn(Optional.of(product));

        assertThatThrownBy(() -> productService.adjustStock(10L, 1L, request))
            .isInstanceOf(InsufficientStockException.class);

        verify(productRepository, never()).save(any());
    }

    @Test
    void adjustStock_validDeduction_updatesQuantity() {
        StockUpdateRequest request = new StockUpdateRequest(-5, "SALE", "Sale test");

        when(productRepository.findByIdAndUserId(1L, 10L)).thenReturn(Optional.of(product));
        when(productRepository.save(any(Product.class))).thenReturn(product);
        when(stockHistoryRepository.save(any(StockHistory.class))).thenReturn(new StockHistory());

        productService.adjustStock(10L, 1L, request);

        verify(productRepository).save(argThat(p -> p.getQuantity() == 15));
    }

    @Test
    void restock_updatesQuantityAndRecordsSupplierPurchase() {
        RestockProductRequest request = new RestockProductRequest(
            6,
            new BigDecimal("280.00"),
            "ABC Traders",
            PaymentStatus.PARTIAL,
            new BigDecimal("500.00"),
            "Weekly refill"
        );

        when(productRepository.findByIdAndUserId(1L, 10L)).thenReturn(Optional.of(product));
        when(productRepository.save(any(Product.class))).thenReturn(product);
        when(stockHistoryRepository.save(any(StockHistory.class))).thenReturn(new StockHistory());

        productService.restock(10L, 1L, request);

        verify(productRepository).save(argThat(p ->
            p.getQuantity() == 26 &&
            "ABC Traders".equals(p.getSupplier()) &&
            p.getCostPrice().compareTo(new BigDecimal("280.00")) == 0
        ));
        verify(supplierService).recordPurchase(
            10L,
            "ABC Traders",
            1L,
            6,
            new BigDecimal("280.00"),
            PaymentStatus.PARTIAL,
            new BigDecimal("500.00"),
            "Weekly refill"
        );
    }

    @Test
    void findById_notFound_throwsProductNotFoundException() {
        when(productRepository.findByIdAndUserId(999L, 10L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> productService.findById(10L, 999L))
            .isInstanceOf(ProductNotFoundException.class);
    }
}
