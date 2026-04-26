package com.smartbiz.inventory.service;

import com.smartbiz.inventory.dto.*;
import com.smartbiz.inventory.exception.InsufficientStockException;
import com.smartbiz.inventory.exception.ProductNotFoundException;
import com.smartbiz.inventory.model.Product;
import com.smartbiz.inventory.model.StockHistory;
import com.smartbiz.inventory.repository.ProductRepository;
import com.smartbiz.inventory.repository.StockHistoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class ProductService {
    private final ProductRepository productRepository;
    private final StockHistoryRepository stockHistoryRepository;

    public List<ProductDTO> findAll(Long userId) {
        return productRepository.findAllByUserId(userId)
            .stream().map(ProductDTO::from).toList();
    }

    public ProductDTO findById(Long userId, Long productId) {
        return productRepository.findByIdAndUserId(productId, userId)
            .map(ProductDTO::from)
            .orElseThrow(() -> new ProductNotFoundException(productId));
    }

    public ProductDTO findByBarcode(Long userId, String barcode) {
        return productRepository.findByBarcodeAndUserId(barcode, userId)
            .map(ProductDTO::from)
            .orElseThrow(() -> new ProductNotFoundException(-1L));
    }

    public List<ProductDTO> findLowStock(Long userId) {
        return productRepository.findLowStockByUserId(userId)
            .stream().map(ProductDTO::from).toList();
    }

    @Transactional
    public ProductDTO create(Long userId, CreateProductRequest request) {
        Product product = Product.builder()
            .userId(userId)
            .name(request.name())
            .sku(request.sku())
            .category(request.category())
            .price(request.price())
            .quantity(request.quantity())
            .reorderLevel(request.reorderLevel())
            .supplier(request.supplier())
            .barcode(request.barcode())
            .imageUrl(request.imageUrl())
            .build();

        product = productRepository.save(product);
        log.info("Product created: {} for userId={}", product.getName(), userId);

        if (request.quantity() > 0) {
            recordStockHistory(product.getId(), request.quantity(), "INITIAL_STOCK", "Initial stock on creation", userId);
        }

        return ProductDTO.from(product);
    }

    @Transactional
    public ProductDTO update(Long userId, Long productId, UpdateProductRequest request) {
        Product product = productRepository.findByIdAndUserId(productId, userId)
            .orElseThrow(() -> new ProductNotFoundException(productId));

        if (request.name() != null) product.setName(request.name());
        if (request.category() != null) product.setCategory(request.category());
        if (request.price() != null) product.setPrice(request.price());
        if (request.reorderLevel() != null) product.setReorderLevel(request.reorderLevel());
        if (request.supplier() != null) product.setSupplier(request.supplier());
        if (request.imageUrl() != null) product.setImageUrl(request.imageUrl());

        if (request.quantity() != null && !request.quantity().equals(product.getQuantity())) {
            int change = request.quantity() - product.getQuantity();
            product.setQuantity(request.quantity());
            recordStockHistory(productId, change, "MANUAL_ADJUSTMENT", "Manual quantity update", userId);
        }

        return ProductDTO.from(productRepository.save(product));
    }

    @Transactional
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
    public void delete(Long userId, Long productId) {
        Product product = productRepository.findByIdAndUserId(productId, userId)
            .orElseThrow(() -> new ProductNotFoundException(productId));
        productRepository.delete(product);
        log.info("Product deleted: {} for userId={}", productId, userId);
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
