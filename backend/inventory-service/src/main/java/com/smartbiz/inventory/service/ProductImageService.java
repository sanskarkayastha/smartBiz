package com.smartbiz.inventory.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.smartbiz.inventory.config.CloudinaryProperties;
import com.smartbiz.inventory.dto.ConfirmProductImageRequest;
import com.smartbiz.inventory.dto.ProductDTO;
import com.smartbiz.inventory.dto.ProductImageUploadSignature;
import com.smartbiz.inventory.exception.ImageStorageUnavailableException;
import com.smartbiz.inventory.exception.ProductNotFoundException;
import com.smartbiz.inventory.model.Product;
import com.smartbiz.inventory.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class ProductImageService {
    private static final String PRODUCT_FOLDER = "smartbiz/products";

    private final ProductRepository productRepository;
    private final Cloudinary cloudinary;
    private final CloudinaryProperties properties;
    private final ApplicationEventPublisher eventPublisher;

    public ProductImageUploadSignature createUploadSignature(Long userId, Long productId) {
        ensureConfigured();
        findProduct(userId, productId);

        long timestamp = Instant.now().getEpochSecond();
        String publicId = expectedPrefix(userId, productId) + UUID.randomUUID();
        Map<String, Object> parameters = ObjectUtils.asMap(
            "public_id", publicId,
            "timestamp", timestamp,
            "upload_preset", properties.getUploadPreset()
        );
        String signature = cloudinary.apiSignRequest(
            parameters,
            properties.getApiSecret(),
            cloudinary.config.signatureVersion
        );

        return new ProductImageUploadSignature(
            "https://api.cloudinary.com/v1_1/" + properties.getCloudName() + "/image/upload",
            properties.getApiKey(),
            timestamp,
            signature,
            publicId,
            properties.getUploadPreset()
        );
    }

    @Transactional
    @CacheEvict(value = "products", allEntries = true)
    public ProductDTO attach(Long userId, Long productId, ConfirmProductImageRequest request) {
        ensureConfigured();
        Product product = findProduct(userId, productId);
        verifyUploadedImage(userId, productId, request);

        String previousPublicId = product.getImagePublicId();
        product.setImagePublicId(request.publicId());
        product.setImageUrl(cloudinary.url()
            .secure(true)
            .version(request.version())
            .generate(request.publicId()));

        Product saved = productRepository.save(product);
        if (previousPublicId != null && !previousPublicId.equals(request.publicId())) {
            eventPublisher.publishEvent(new ProductImageDeleteEvent(previousPublicId));
        }
        return ProductDTO.from(saved);
    }

    @Transactional
    @CacheEvict(value = "products", allEntries = true)
    public ProductDTO remove(Long userId, Long productId) {
        ensureConfigured();
        Product product = findProduct(userId, productId);
        String previousPublicId = product.getImagePublicId();
        product.setImagePublicId(null);
        product.setImageUrl(null);
        Product saved = productRepository.save(product);

        if (previousPublicId != null) {
            eventPublisher.publishEvent(new ProductImageDeleteEvent(previousPublicId));
        }
        return ProductDTO.from(saved);
    }

    public void discard(Long userId, Long productId, ConfirmProductImageRequest request) {
        ensureConfigured();
        findProduct(userId, productId);
        verifyUploadedImage(userId, productId, request);
        if (productRepository.existsByIdAndUserIdAndImagePublicId(productId, userId, request.publicId())) {
            throw new IllegalArgumentException("Attached product images cannot be discarded.");
        }
        deleteAsset(request.publicId());
    }

    public void deleteAsset(String publicId) {
        if (!properties.isConfigured() || publicId == null || publicId.isBlank()) return;
        try {
            cloudinary.uploader().destroy(publicId, ObjectUtils.asMap(
                "resource_type", "image",
                "invalidate", true
            ));
        } catch (Exception e) {
            log.warn("Could not delete Cloudinary product image {}: {}", publicId, e.getMessage());
        }
    }

    private void verifyUploadedImage(Long userId, Long productId, ConfirmProductImageRequest request) {
        if (!request.publicId().startsWith(expectedPrefix(userId, productId))) {
            throw new IllegalArgumentException("Image does not belong to this product.");
        }

        if (!cloudinary.verifyApiResponseSignature(
            request.publicId(),
            String.valueOf(request.version()),
            request.signature()
        )) {
            throw new IllegalArgumentException("Image upload could not be verified.");
        }
    }

    private Product findProduct(Long userId, Long productId) {
        return productRepository.findByIdAndUserId(productId, userId)
            .orElseThrow(() -> new ProductNotFoundException(productId));
    }

    private String expectedPrefix(Long userId, Long productId) {
        return PRODUCT_FOLDER + "/" + userId + "/" + productId + "/";
    }

    private void ensureConfigured() {
        if (!properties.isConfigured()) {
            throw new ImageStorageUnavailableException();
        }
    }
}
