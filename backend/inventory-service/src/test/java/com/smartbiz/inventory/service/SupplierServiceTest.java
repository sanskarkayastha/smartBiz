package com.smartbiz.inventory.service;

import com.smartbiz.inventory.dto.PagedResponse;
import com.smartbiz.inventory.dto.PaymentStatus;
import com.smartbiz.inventory.dto.RecordSupplierPaymentRequest;
import com.smartbiz.inventory.dto.SupplierDTO;
import com.smartbiz.inventory.dto.SupplierLedgerEntryDTO;
import com.smartbiz.inventory.dto.SupplierSummaryDTO;
import com.smartbiz.inventory.model.Product;
import com.smartbiz.inventory.model.Supplier;
import com.smartbiz.inventory.model.SupplierLedgerEntry;
import com.smartbiz.inventory.model.SupplierLedgerEntryType;
import com.smartbiz.inventory.repository.ProductRepository;
import com.smartbiz.inventory.repository.SupplierLedgerEntryRepository;
import com.smartbiz.inventory.repository.SupplierRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SupplierServiceTest {

    @Mock SupplierRepository supplierRepository;
    @Mock SupplierLedgerEntryRepository supplierLedgerEntryRepository;
    @Mock ProductRepository productRepository;

    @InjectMocks SupplierService supplierService;

    @Test
    void getSuppliers_enrichesEachSupplierWithStockMetrics() {
        Supplier supplier = Supplier.builder()
            .id(1L)
            .userId(10L)
            .name("ABC Traders")
            .balanceOwed(new BigDecimal("1200.00"))
            .build();

        Page<Supplier> supplierPage = new PageImpl<>(List.of(supplier));
        when(supplierRepository.findWithFilters(eq(10L), eq(""), eq(false), any(Pageable.class))).thenReturn(supplierPage);
        when(productRepository.findByUserIdAndSupplierNameIn(10L, List.of("abc traders"))).thenReturn(List.of(
            product("Rice", "ABC Traders", 5, 5),
            product("Oil", "ABC Traders", 0, 2),
            product("Soap", "ABC Traders", 9, 3)
        ));

        PagedResponse<SupplierDTO> response = supplierService.getSuppliers(10L, 0, 20, null, false);

        assertThat(response.content()).hasSize(1);
        SupplierDTO result = response.content().get(0);
        assertThat(result.productCount()).isEqualTo(3);
        assertThat(result.totalUnits()).isEqualTo(14);
        assertThat(result.lowStockCount()).isEqualTo(2);
        assertThat(result.outOfStockCount()).isEqualTo(1);
    }

    @Test
    void getSummary_rollsUpBalanceAndRestockSignals() {
        Supplier supplierA = Supplier.builder()
            .id(1L)
            .userId(10L)
            .name("ABC Traders")
            .balanceOwed(new BigDecimal("1200.00"))
            .build();
        Supplier supplierB = Supplier.builder()
            .id(2L)
            .userId(10L)
            .name("City Wholesale")
            .balanceOwed(BigDecimal.ZERO)
            .build();

        when(supplierRepository.findAllByUserIdOrderByNameAsc(10L)).thenReturn(List.of(supplierA, supplierB));
        when(productRepository.findByUserIdAndSupplierNameIn(10L, List.of("abc traders", "city wholesale"))).thenReturn(List.of(
            product("Rice", "ABC Traders", 0, 4),
            product("Soap", "City Wholesale", 7, 3)
        ));

        SupplierSummaryDTO result = supplierService.getSummary(10L);

        assertThat(result.totalSuppliers()).isEqualTo(2);
        assertThat(result.suppliersWithBalance()).isEqualTo(1);
        assertThat(result.totalBalanceOwed()).isEqualByComparingTo("1200.00");
        assertThat(result.linkedProducts()).isEqualTo(2);
        assertThat(result.suppliersNeedingRestock()).isEqualTo(1);
        assertThat(result.lowStockProducts()).isEqualTo(1);
        assertThat(result.outOfStockProducts()).isEqualTo(1);
    }

    @Test
    void recordPurchase_partialPayment_addsOnlyOutstandingAmount() {
        Supplier supplier = Supplier.builder()
            .id(1L)
            .userId(10L)
            .name("ABC Traders")
            .balanceOwed(new BigDecimal("200.00"))
            .build();

        when(supplierRepository.findByUserIdAndNameIgnoreCase(10L, "ABC Traders")).thenReturn(Optional.of(supplier));
        when(supplierRepository.save(any(Supplier.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Supplier updated = supplierService.recordPurchase(
            10L,
            "ABC Traders",
            15L,
            10,
            new BigDecimal("100.00"),
            PaymentStatus.PARTIAL,
            new BigDecimal("250.00"),
            "Restock"
        );

        assertThat(updated.getBalanceOwed()).isEqualByComparingTo("950.00");
        verify(supplierLedgerEntryRepository).save(any(SupplierLedgerEntry.class));
    }

    @Test
    void recordPayment_reducesSupplierBalance() {
        Supplier supplier = Supplier.builder()
            .id(1L)
            .userId(10L)
            .name("ABC Traders")
            .balanceOwed(new BigDecimal("1200.00"))
            .build();

        when(supplierRepository.findByIdAndUserId(1L, 10L)).thenReturn(Optional.of(supplier));
        when(supplierRepository.save(any(Supplier.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SupplierDTO result = supplierService.recordPayment(
            10L,
            1L,
            new RecordSupplierPaymentRequest(new BigDecimal("300.00"), "Cash paid")
        );

        assertThat(result.balanceOwed()).isEqualByComparingTo("900.00");
    }

    @Test
    void getLedger_returnsNewestEntriesFirst() {
        Supplier supplier = Supplier.builder()
            .id(1L)
            .userId(10L)
            .name("ABC Traders")
            .balanceOwed(new BigDecimal("500.00"))
            .build();

        SupplierLedgerEntry entry = SupplierLedgerEntry.builder()
            .id(10L)
            .supplierId(1L)
            .userId(10L)
            .type(SupplierLedgerEntryType.PURCHASE)
            .amount(new BigDecimal("500.00"))
            .quantity(5)
            .unitCost(new BigDecimal("100.00"))
            .note("Restock")
            .createdAt(LocalDateTime.now())
            .build();

        when(supplierRepository.findByIdAndUserId(1L, 10L)).thenReturn(Optional.of(supplier));
        when(supplierLedgerEntryRepository.findTop20BySupplierIdAndUserIdOrderByCreatedAtDescIdDesc(1L, 10L))
            .thenReturn(List.of(entry));

        List<SupplierLedgerEntryDTO> result = supplierService.getLedger(10L, 1L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).type()).isEqualTo(SupplierLedgerEntryType.PURCHASE);
        assertThat(result.get(0).amount()).isEqualByComparingTo("500.00");
    }

    private Product product(String name, String supplier, int quantity, Integer reorderLevel) {
        return Product.builder()
            .userId(10L)
            .name(name)
            .supplier(supplier)
            .price(new BigDecimal("100.00"))
            .quantity(quantity)
            .reorderLevel(reorderLevel)
            .build();
    }
}
