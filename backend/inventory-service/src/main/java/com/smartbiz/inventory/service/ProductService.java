package com.smartbiz.inventory.service;

import com.smartbiz.inventory.dto.*;
import com.smartbiz.inventory.exception.BarcodeAlreadyExistsException;
import com.smartbiz.inventory.exception.InsufficientStockException;
import com.smartbiz.inventory.exception.ProductNotFoundException;
import com.smartbiz.inventory.model.Product;
import com.smartbiz.inventory.model.StockHistory;
import com.smartbiz.inventory.repository.ProductRepository;
import com.smartbiz.inventory.repository.StockHistoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import com.smartbiz.payment.PlanAccessClient;

@Service
@Slf4j
@RequiredArgsConstructor
public class ProductService {
    private static final String CACHE_NAME = "products";

    private final ProductRepository productRepository;
    private final StockHistoryRepository stockHistoryRepository;
    private final SupplierService supplierService;
    private final ApplicationEventPublisher eventPublisher;
    private final PlanAccessClient planAccessClient;

    @Cacheable(value = CACHE_NAME, key = "#userId + ':' + #page + ':' + #size + ':' + #search + ':' + #category + ':' + #stockStatus")
    public PagedResponse<ProductDTO> findAll(Long userId, int page, int size, String search, String category, String stockStatus) {
        int clampedSize = Math.min(size, 100);
        Pageable pageable = PageRequest.of(page, clampedSize, Sort.by("id").descending());
        String s = (search != null && !search.isBlank()) ? search.trim().toLowerCase() : "";
        String c = (category != null && !category.isBlank()) ? category.trim().toLowerCase() : "";
        String ss = (stockStatus != null && !stockStatus.isBlank()) ? stockStatus.trim() : "";
        return PagedResponse.of(
            productRepository.findWithFilters(userId, s, c, ss, pageable).map(ProductDTO::from)
        );
    }

    public ProductDTO findById(Long userId, Long productId) {
        return productRepository.findByIdAndUserId(productId, userId)
            .map(ProductDTO::from)
            .orElseThrow(() -> new ProductNotFoundException(productId));
    }

    public ProductDTO findByBarcode(Long userId, String barcode) {
        planAccessClient.requirePro(userId, "Barcode-assisted workflows");
        return productRepository.findByBarcodeAndUserId(normalizeBarcode(barcode), userId)
            .map(ProductDTO::from)
            .orElseThrow(() -> new ProductNotFoundException(-1L));
    }

    public List<ProductDTO> findLowStock(Long userId) {
        return productRepository.findLowStockByUserId(userId)
            .stream().map(ProductDTO::from).toList();
    }

    @Transactional
    @CacheEvict(value = {CACHE_NAME, "suppliers"}, allEntries = true)
    public ProductDTO create(Long userId, CreateProductRequest request) {
        planAccessClient.requireWithinLimit(userId, "Products", productRepository.countByUserId(userId), 100);
        String normalizedBarcode = normalizeBarcode(request.barcode());
        ensureBarcodeAvailable(userId, normalizedBarcode, null);
        String normalizedSupplier = normalizeOptionalText(request.supplier());

        Product product = Product.builder()
            .userId(userId)
            .name(request.name())
            .sku(request.sku())
            .category(request.category())
            .price(request.price())
            .costPrice(request.costPrice())
            .quantity(request.quantity())
            .reorderLevel(request.reorderLevel())
            .supplier(normalizedSupplier)
            .barcode(normalizedBarcode)
            .build();

        product = productRepository.save(product);
        log.info("Product created: {} for userId={}", product.getName(), userId);

        if (request.quantity() > 0) {
            recordStockHistory(product.getId(), request.quantity(), "INITIAL_STOCK", "Initial stock on creation", userId);
        }

        if (normalizedSupplier != null) {
            if (request.paymentStatus() != null && request.costPrice() != null && request.quantity() > 0) {
                supplierService.recordPurchase(
                    userId,
                    normalizedSupplier,
                    product.getId(),
                    request.quantity(),
                    request.costPrice(),
                    request.paymentStatus(),
                    request.amountPaidNow(),
                    "Initial stock on creation"
                );
            } else {
                supplierService.findOrCreate(userId, normalizedSupplier);
            }
        }

        return ProductDTO.from(product);
    }

    @Transactional
    @CacheEvict(value = {CACHE_NAME, "suppliers"}, allEntries = true)
    public ProductDTO update(Long userId, Long productId, UpdateProductRequest request) {
        Product product = productRepository.findByIdAndUserId(productId, userId)
            .orElseThrow(() -> new ProductNotFoundException(productId));

        if (request.name() != null) product.setName(request.name());
        if (request.category() != null) product.setCategory(request.category());
        if (request.price() != null) product.setPrice(request.price());
        if (request.costPrice() != null) product.setCostPrice(request.costPrice());
        if (request.reorderLevel() != null) product.setReorderLevel(request.reorderLevel());
        if (request.supplier() != null) product.setSupplier(normalizeOptionalText(request.supplier()));
        if (request.barcode() != null) {
            String normalizedBarcode = normalizeBarcode(request.barcode());
            ensureBarcodeAvailable(userId, normalizedBarcode, productId);
            product.setBarcode(normalizedBarcode);
        }
        if (request.quantity() != null && !request.quantity().equals(product.getQuantity())) {
            int change = request.quantity() - product.getQuantity();
            product.setQuantity(request.quantity());
            recordStockHistory(productId, change, "MANUAL_ADJUSTMENT", "Manual quantity update", userId);
        }

        if (request.supplier() != null && !request.supplier().isBlank()) {
            supplierService.findOrCreate(userId, request.supplier());
        }

        return ProductDTO.from(productRepository.save(product));
    }

    @Transactional
    @CacheEvict(value = {CACHE_NAME, "suppliers"}, allEntries = true)
    public ProductDTO adjustStock(Long userId, Long productId, StockUpdateRequest request) {
        Product product = productRepository.findByIdAndUserId(productId, userId)
            .orElseThrow(() -> new ProductNotFoundException(productId));

        int newQuantity = product.getQuantity() + request.quantityChange();
        if (newQuantity < 0) {
            throw new InsufficientStockException(productId, product.getQuantity(), request.quantityChange());
        }

        product.setQuantity(newQuantity);
        productRepository.save(product);
        recordStockHistory(productId, request.quantityChange(), request.type(), request.reason(), userId);

        log.info("Stock adjusted for productId={}: change={}, type={}", productId, request.quantityChange(), request.type());
        return ProductDTO.from(product);
    }

    @Transactional
    @CacheEvict(value = {CACHE_NAME, "suppliers"}, allEntries = true)
    public ProductDTO restock(Long userId, Long productId, RestockProductRequest request) {
        Product product = productRepository.findByIdAndUserId(productId, userId)
            .orElseThrow(() -> new ProductNotFoundException(productId));

        String normalizedSupplier = normalizeOptionalText(request.supplier());
        if (normalizedSupplier != null) {
            product.setSupplier(normalizedSupplier);
        }
        product.setCostPrice(request.unitCost());
        product.setQuantity(product.getQuantity() + request.quantityAdded());
        productRepository.save(product);

        String reason = normalizeOptionalText(request.note()) != null ? request.note().trim() : "Manual restock";
        recordStockHistory(productId, request.quantityAdded(), "RESTOCK", reason, userId);

        if (normalizedSupplier != null) {
            supplierService.recordPurchase(
                userId,
                normalizedSupplier,
                product.getId(),
                request.quantityAdded(),
                request.unitCost(),
                request.paymentStatus(),
                request.amountPaidNow(),
                reason
            );
        }

        log.info("Product restocked: productId={}, quantityAdded={}", productId, request.quantityAdded());
        return ProductDTO.from(product);
    }

    @Transactional
    @CacheEvict(value = {CACHE_NAME, "suppliers"}, allEntries = true)
    public void delete(Long userId, Long productId) {
        Product product = productRepository.findByIdAndUserId(productId, userId)
            .orElseThrow(() -> new ProductNotFoundException(productId));
        productRepository.delete(product);
        if (product.getImagePublicId() != null) {
            eventPublisher.publishEvent(new ProductImageDeleteEvent(product.getImagePublicId()));
        }
        log.info("Product deleted: {} for userId={}", productId, userId);
    }

    private void ensureBarcodeAvailable(Long userId, String barcode, Long productId) {
        if (barcode == null) return;

        boolean exists = productId == null
            ? productRepository.existsByBarcodeAndUserId(barcode, userId)
            : productRepository.existsByBarcodeAndUserIdAndIdNot(barcode, userId, productId);

        if (exists) {
            throw new BarcodeAlreadyExistsException(barcode);
        }
    }

    private String normalizeBarcode(String barcode) {
        if (barcode == null) return null;
        String normalized = barcode.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private String normalizeOptionalText(String value) {
        if (value == null) return null;
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private void recordStockHistory(Long productId, int quantityChange, String type, String reason, Long createdBy) {
        StockHistory history = StockHistory.builder()
            .productId(productId)
            .quantityChange(quantityChange)
            .type(type)
            .reason(reason)
            .createdBy(createdBy)
            .build();
        stockHistoryRepository.save(history);
    }
}
