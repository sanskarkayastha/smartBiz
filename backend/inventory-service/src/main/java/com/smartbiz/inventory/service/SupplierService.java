package com.smartbiz.inventory.service;

import com.smartbiz.inventory.dto.*;
import com.smartbiz.inventory.model.Product;
import com.smartbiz.inventory.model.Supplier;
import com.smartbiz.inventory.repository.ProductRepository;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class SupplierService {
    private static final String CACHE_NAME = "suppliers";

    private final SupplierRepository supplierRepository;
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
        Supplier supplier = Supplier.builder()
            .userId(userId)
            .name(name)
            .phone(request.phone() != null && !request.phone().isBlank() ? request.phone().trim() : null)
            .email(request.email() != null && !request.email().isBlank() ? request.email().trim() : null)
            .balanceOwed(request.balanceOwed() != null ? request.balanceOwed() : BigDecimal.ZERO)
            .notes(request.notes() != null && !request.notes().isBlank() ? request.notes().trim() : null)
            .build();
        log.info("Created supplier '{}' for userId={}", name, userId);
        return SupplierDTO.from(supplierRepository.save(supplier));
    }

    @Transactional
    @CacheEvict(value = CACHE_NAME, allEntries = true)
    public void findOrCreate(Long userId, String supplierName) {
        String trimmed = supplierName.trim();
        if (trimmed.isEmpty()) return;
        supplierRepository.findByUserIdAndNameIgnoreCase(userId, trimmed)
            .orElseGet(() -> {
                Supplier s = Supplier.builder().userId(userId).name(trimmed).build();
                log.info("Auto-created supplier '{}' for userId={}", trimmed, userId);
                return supplierRepository.save(s);
            });
    }

    @Transactional
    @CacheEvict(value = CACHE_NAME, allEntries = true)
    public SupplierDTO updateSupplier(Long userId, Long id, UpdateSupplierRequest request) {
        Supplier supplier = supplierRepository.findByIdAndUserId(id, userId)
            .orElseThrow(() -> new EntityNotFoundException("Supplier not found: " + id));

        if (request.phone() != null) supplier.setPhone(request.phone().isBlank() ? null : request.phone().trim());
        if (request.email() != null) supplier.setEmail(request.email().isBlank() ? null : request.email().trim());
        if (request.balanceOwed() != null) supplier.setBalanceOwed(request.balanceOwed());
        if (request.notes() != null) supplier.setNotes(request.notes().isBlank() ? null : request.notes().trim());

        return SupplierDTO.from(supplierRepository.save(supplier));
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

    private String normalizeSupplierKey(String name) {
        return name == null ? "" : name.trim().toLowerCase();
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
