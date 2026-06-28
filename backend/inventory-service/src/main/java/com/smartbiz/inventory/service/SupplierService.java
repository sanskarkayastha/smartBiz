package com.smartbiz.inventory.service;

import com.smartbiz.inventory.dto.*;
import com.smartbiz.inventory.model.Product;
import com.smartbiz.inventory.model.Supplier;
import com.smartbiz.inventory.model.SupplierLedgerEntry;
import com.smartbiz.inventory.model.SupplierLedgerEntryType;
import com.smartbiz.inventory.repository.ProductRepository;
import com.smartbiz.inventory.repository.SupplierLedgerEntryRepository;
import com.smartbiz.inventory.repository.SupplierRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class SupplierService {
    private static final String CACHE_NAME = "suppliers";

    private final SupplierRepository supplierRepository;
    private final SupplierLedgerEntryRepository supplierLedgerEntryRepository;
    private final ProductRepository productRepository;

    @Cacheable(value = CACHE_NAME, key = "#userId + ':' + #page + ':' + #size + ':' + #search + ':' + #hasBalance")
    public PagedResponse<SupplierDTO> getSuppliers(Long userId, int page, int size, String search, Boolean hasBalance) {
        int clampedSize = Math.min(size, 100);
        Pageable pageable = PageRequest.of(page, clampedSize, Sort.by("name").ascending());
        String s = (search != null && !search.isBlank()) ? search.trim().toLowerCase() : "";
        boolean hb = hasBalance != null && hasBalance;
        Page<Supplier> supplierPage = supplierRepository.findWithFilters(userId, s, hb, pageable);
        Map<String, SupplierMetrics> metricsBySupplier = getMetricsBySupplier(userId, supplierPage.getContent());

        List<SupplierDTO> suppliers = supplierPage.getContent().stream()
            .map(supplier -> {
                SupplierMetrics metrics = metricsBySupplier.getOrDefault(normalizeSupplierKey(supplier.getName()), SupplierMetrics.EMPTY);
                return SupplierDTO.from(
                    supplier,
                    metrics.productCount(),
                    metrics.totalUnits(),
                    metrics.lowStockCount(),
                    metrics.outOfStockCount()
                );
            })
            .toList();

        return new PagedResponse<>(
            suppliers,
            supplierPage.getNumber(),
            supplierPage.getTotalPages(),
            supplierPage.getTotalElements(),
            supplierPage.hasNext()
        );
    }

    @Cacheable(value = CACHE_NAME, key = "#userId + ':summary'")
    public SupplierSummaryDTO getSummary(Long userId) {
        List<Supplier> suppliers = supplierRepository.findAllByUserIdOrderByNameAsc(userId);
        Map<String, SupplierMetrics> metricsBySupplier = getMetricsBySupplier(userId, suppliers);

        int linkedProducts = metricsBySupplier.values().stream().mapToInt(SupplierMetrics::productCount).sum();
        int lowStockProducts = metricsBySupplier.values().stream().mapToInt(SupplierMetrics::lowStockCount).sum();
        int outOfStockProducts = metricsBySupplier.values().stream().mapToInt(SupplierMetrics::outOfStockCount).sum();
        int suppliersNeedingRestock = (int) suppliers.stream()
            .map(supplier -> metricsBySupplier.getOrDefault(normalizeSupplierKey(supplier.getName()), SupplierMetrics.EMPTY))
            .filter(metrics -> metrics.lowStockCount() > 0 || metrics.outOfStockCount() > 0)
            .count();
        long suppliersWithBalance = suppliers.stream()
            .filter(supplier -> supplier.getBalanceOwed() != null && supplier.getBalanceOwed().compareTo(BigDecimal.ZERO) > 0)
            .count();
        BigDecimal totalBalanceOwed = suppliers.stream()
            .map(supplier -> supplier.getBalanceOwed() != null ? supplier.getBalanceOwed() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new SupplierSummaryDTO(
            suppliers.size(),
            suppliersWithBalance,
            totalBalanceOwed,
            linkedProducts,
            suppliersNeedingRestock,
            lowStockProducts,
            outOfStockProducts
        );
    }

    @Transactional
    @CacheEvict(value = CACHE_NAME, allEntries = true)
    public SupplierDTO createSupplier(Long userId, CreateSupplierRequest request) {
        String name = request.name().trim();
        if (supplierRepository.findByUserIdAndNameIgnoreCase(userId, name).isPresent()) {
            throw new IllegalArgumentException("Supplier '" + name + "' already exists");
        }

        BigDecimal openingBalance = firstNonNull(request.openingBalance(), request.balanceOwed());
        validateNonNegative(openingBalance, "Opening balance cannot be negative");

        Supplier supplier = Supplier.builder()
            .userId(userId)
            .name(name)
            .phone(normalizeOptionalText(request.phone()))
            .email(normalizeOptionalText(request.email()))
            .balanceOwed(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP))
            .notes(normalizeOptionalText(request.notes()))
            .build();
        supplier = supplierRepository.save(supplier);

        if (openingBalance.compareTo(BigDecimal.ZERO) > 0) {
            supplier = appendLedgerEntry(
                supplier,
                SupplierLedgerEntryType.OPENING_BALANCE,
                openingBalance,
                null,
                null,
                null,
                "Opening balance"
            );
        }

        log.info("Created supplier '{}' for userId={}", name, userId);
        return SupplierDTO.from(supplier);
    }

    @Transactional
    @CacheEvict(value = CACHE_NAME, allEntries = true)
    public Supplier findOrCreate(Long userId, String supplierName) {
        String trimmed = normalizeOptionalText(supplierName);
        if (trimmed == null) {
            throw new IllegalArgumentException("Supplier name is required");
        }

        return supplierRepository.findByUserIdAndNameIgnoreCase(userId, trimmed)
            .orElseGet(() -> {
                Supplier supplier = Supplier.builder()
                    .userId(userId)
                    .name(trimmed)
                    .balanceOwed(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP))
                    .build();
                log.info("Auto-created supplier '{}' for userId={}", trimmed, userId);
                return supplierRepository.save(supplier);
            });
    }

    @Transactional
    @CacheEvict(value = CACHE_NAME, allEntries = true)
    public SupplierDTO updateSupplier(Long userId, Long id, UpdateSupplierRequest request) {
        Supplier supplier = supplierRepository.findByIdAndUserId(id, userId)
            .orElseThrow(() -> new EntityNotFoundException("Supplier not found: " + id));

        if (request.phone() != null) supplier.setPhone(normalizeOptionalText(request.phone()));
        if (request.email() != null) supplier.setEmail(normalizeOptionalText(request.email()));
        if (request.notes() != null) supplier.setNotes(normalizeOptionalText(request.notes()));

        if (request.balanceOwed() != null) {
            validateNonNegative(request.balanceOwed(), "Current balance cannot be negative");
            BigDecimal targetBalance = toMoney(request.balanceOwed());
            BigDecimal delta = targetBalance.subtract(currentBalance(supplier));
            if (delta.compareTo(BigDecimal.ZERO) == 0) {
                return SupplierDTO.from(supplierRepository.save(supplier));
            }
            supplier = appendLedgerEntry(
                supplier,
                SupplierLedgerEntryType.MANUAL_ADJUSTMENT,
                delta,
                null,
                null,
                null,
                "Set current balance"
            );
            return SupplierDTO.from(supplier);
        }

        return SupplierDTO.from(supplierRepository.save(supplier));
    }

    @Transactional
    @CacheEvict(value = CACHE_NAME, allEntries = true)
    public Supplier recordPurchase(
        Long userId,
        String supplierName,
        Long productId,
        Integer quantity,
        BigDecimal unitCost,
        PaymentStatus paymentStatus,
        BigDecimal amountPaidNow,
        String note
    ) {
        String normalizedSupplierName = normalizeOptionalText(supplierName);
        if (normalizedSupplierName == null) {
            throw new IllegalArgumentException("Supplier is required to record a supplier purchase");
        }
        if (quantity == null || quantity <= 0) {
            throw new IllegalArgumentException("Quantity must be greater than 0");
        }
        if (unitCost == null || unitCost.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Unit cost must be greater than 0");
        }
        if (paymentStatus == null) {
            throw new IllegalArgumentException("Payment status is required");
        }

        Supplier supplier = findOrCreate(userId, normalizedSupplierName);
        BigDecimal purchaseTotal = toMoney(unitCost.multiply(BigDecimal.valueOf(quantity)));
        BigDecimal outstanding = calculateOutstanding(purchaseTotal, paymentStatus, amountPaidNow);

        if (outstanding.compareTo(BigDecimal.ZERO) == 0) {
            return supplier;
        }

        return appendLedgerEntry(
            supplier,
            SupplierLedgerEntryType.PURCHASE,
            outstanding,
            productId,
            quantity,
            unitCost,
            note
        );
    }

    @Transactional
    @CacheEvict(value = CACHE_NAME, allEntries = true)
    public SupplierDTO recordPayment(Long userId, Long id, RecordSupplierPaymentRequest request) {
        Supplier supplier = supplierRepository.findByIdAndUserId(id, userId)
            .orElseThrow(() -> new EntityNotFoundException("Supplier not found: " + id));
        String note = normalizeOptionalText(request.note());

        Supplier updated = appendLedgerEntry(
            supplier,
            SupplierLedgerEntryType.PAYMENT,
            request.amount().negate(),
            null,
            null,
            null,
            note != null ? note : "Supplier payment"
        );
        return SupplierDTO.from(updated);
    }

    @Transactional
    @CacheEvict(value = CACHE_NAME, allEntries = true)
    public SupplierDTO adjustBalance(Long userId, Long id, AdjustSupplierBalanceRequest request) {
        Supplier supplier = supplierRepository.findByIdAndUserId(id, userId)
            .orElseThrow(() -> new EntityNotFoundException("Supplier not found: " + id));
        String note = normalizeOptionalText(request.note());

        Supplier updated = switch (request.mode()) {
            case ADD_DEBT -> {
                if (request.amount() == null) {
                    throw new IllegalArgumentException("Amount is required for manual debt");
                }
                yield appendLedgerEntry(
                    supplier,
                    SupplierLedgerEntryType.MANUAL_ADJUSTMENT,
                    request.amount(),
                    null,
                    null,
                    null,
                    note != null ? note : "Manual debt adjustment"
                );
            }
            case SET_BALANCE -> {
                if (request.targetBalance() == null) {
                    throw new IllegalArgumentException("Target balance is required when setting the current balance");
                }
                validateNonNegative(request.targetBalance(), "Target balance cannot be negative");
                BigDecimal targetBalance = toMoney(request.targetBalance());
                BigDecimal delta = targetBalance.subtract(currentBalance(supplier));
                if (delta.compareTo(BigDecimal.ZERO) == 0) {
                    yield supplier;
                }
                yield appendLedgerEntry(
                    supplier,
                    SupplierLedgerEntryType.MANUAL_ADJUSTMENT,
                    delta,
                    null,
                    null,
                    null,
                    note != null ? note : "Set current balance"
                );
            }
        };

        return SupplierDTO.from(updated);
    }

    public List<SupplierProductDTO> getProductsBySupplier(Long userId, Long supplierId) {
        Supplier supplier = supplierRepository.findByIdAndUserId(supplierId, userId)
            .orElseThrow(() -> new EntityNotFoundException("Supplier not found: " + supplierId));
        return productRepository.findByUserIdAndSupplierIgnoreCase(userId, supplier.getName())
            .stream()
            .map(p -> new SupplierProductDTO(
                p.getId(),
                p.getName(),
                p.getSku(),
                p.getCategory(),
                p.getPrice(),
                p.getQuantity(),
                p.getReorderLevel(),
                p.getReorderLevel() != null && p.getQuantity() <= p.getReorderLevel()
            ))
            .toList();
    }

    public List<SupplierLedgerEntryDTO> getLedger(Long userId, Long supplierId) {
        Supplier supplier = supplierRepository.findByIdAndUserId(supplierId, userId)
            .orElseThrow(() -> new EntityNotFoundException("Supplier not found: " + supplierId));

        return supplierLedgerEntryRepository
            .findTop20BySupplierIdAndUserIdOrderByCreatedAtDescIdDesc(supplier.getId(), userId)
            .stream()
            .map(SupplierLedgerEntryDTO::from)
            .toList();
    }

    private Map<String, SupplierMetrics> getMetricsBySupplier(Long userId, List<Supplier> suppliers) {
        List<String> supplierKeys = suppliers.stream()
            .map(Supplier::getName)
            .map(this::normalizeSupplierKey)
            .filter(key -> !key.isEmpty())
            .distinct()
            .toList();

        if (supplierKeys.isEmpty()) {
            return Map.of();
        }

        Map<String, SupplierMetrics> metricsBySupplier = new HashMap<>();
        for (Product product : productRepository.findByUserIdAndSupplierNameIn(userId, supplierKeys)) {
            String key = normalizeSupplierKey(product.getSupplier());
            if (key.isEmpty()) {
                continue;
            }
            SupplierMetrics current = metricsBySupplier.getOrDefault(key, SupplierMetrics.EMPTY);
            metricsBySupplier.put(key, current.add(product));
        }
        return metricsBySupplier;
    }

    private BigDecimal calculateOutstanding(BigDecimal purchaseTotal, PaymentStatus paymentStatus, BigDecimal amountPaidNow) {
        return switch (paymentStatus) {
            case PAID -> BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
            case DUE -> {
                if (amountPaidNow != null && amountPaidNow.compareTo(BigDecimal.ZERO) > 0) {
                    throw new IllegalArgumentException("Amount paid now is only allowed for partial payments");
                }
                yield purchaseTotal;
            }
            case PARTIAL -> {
                if (amountPaidNow == null) {
                    throw new IllegalArgumentException("Amount paid now is required for partial payments");
                }
                BigDecimal normalizedAmountPaid = toMoney(amountPaidNow);
                if (normalizedAmountPaid.compareTo(BigDecimal.ZERO) <= 0) {
                    throw new IllegalArgumentException("Amount paid now must be greater than 0 for partial payments");
                }
                if (normalizedAmountPaid.compareTo(purchaseTotal) >= 0) {
                    throw new IllegalArgumentException("Amount paid now must be less than the full purchase total");
                }
                yield toMoney(purchaseTotal.subtract(normalizedAmountPaid));
            }
        };
    }

    private Supplier appendLedgerEntry(
        Supplier supplier,
        SupplierLedgerEntryType type,
        BigDecimal amount,
        Long productId,
        Integer quantity,
        BigDecimal unitCost,
        String note
    ) {
        BigDecimal normalizedAmount = toMoney(amount);
        BigDecimal nextBalance = toMoney(currentBalance(supplier).add(normalizedAmount));

        if (nextBalance.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Supplier balance cannot go below zero");
        }

        supplier.setBalanceOwed(nextBalance);
        Supplier savedSupplier = supplierRepository.save(supplier);

        SupplierLedgerEntry entry = SupplierLedgerEntry.builder()
            .supplierId(savedSupplier.getId())
            .userId(savedSupplier.getUserId())
            .type(type)
            .amount(normalizedAmount)
            .productId(productId)
            .quantity(quantity)
            .unitCost(unitCost != null ? toMoney(unitCost) : null)
            .note(normalizeOptionalText(note))
            .build();
        supplierLedgerEntryRepository.save(entry);

        return savedSupplier;
    }

    private BigDecimal currentBalance(Supplier supplier) {
        return supplier.getBalanceOwed() != null ? supplier.getBalanceOwed() : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal toMoney(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal firstNonNull(BigDecimal preferred, BigDecimal fallback) {
        if (preferred != null) {
            return toMoney(preferred);
        }
        if (fallback != null) {
            return toMoney(fallback);
        }
        return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    }

    private void validateNonNegative(BigDecimal value, String message) {
        if (value != null && value.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException(message);
        }
    }

    private String normalizeSupplierKey(String name) {
        return name == null ? "" : name.trim().toLowerCase();
    }

    private String normalizeOptionalText(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private record SupplierMetrics(
        int productCount,
        int totalUnits,
        int lowStockCount,
        int outOfStockCount
    ) {
        private static final SupplierMetrics EMPTY = new SupplierMetrics(0, 0, 0, 0);

        private SupplierMetrics add(Product product) {
            int quantity = product.getQuantity() != null ? product.getQuantity() : 0;
            boolean lowStock = product.getReorderLevel() != null && quantity <= product.getReorderLevel();
            boolean outOfStock = quantity == 0;
            return new SupplierMetrics(
                productCount + 1,
                totalUnits + quantity,
                lowStockCount + (lowStock ? 1 : 0),
                outOfStockCount + (outOfStock ? 1 : 0)
            );
        }
    }
}
