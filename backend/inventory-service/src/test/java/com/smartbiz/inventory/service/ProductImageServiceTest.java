package com.smartbiz.inventory.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.smartbiz.inventory.config.CloudinaryProperties;
import com.smartbiz.inventory.dto.ConfirmProductImageRequest;
import com.smartbiz.inventory.dto.ProductDTO;
import com.smartbiz.inventory.dto.ProductImageUploadSignature;
import com.smartbiz.inventory.exception.ImageStorageUnavailableException;
import com.smartbiz.inventory.model.Product;
import com.smartbiz.inventory.repository.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProductImageServiceTest {
    @Mock ProductRepository productRepository;
    @Mock ApplicationEventPublisher eventPublisher;

    private Cloudinary cloudinary;
    private CloudinaryProperties properties;
    private ProductImageService productImageService;
    private Product product;

    @BeforeEach
    void setUp() {
        properties = new CloudinaryProperties();
        properties.setEnabled(true);
        properties.setCloudName("smartbiz-test");
        properties.setApiKey("12345");
        properties.setApiSecret("test-secret");
        properties.setUploadPreset("smartbiz_product_images");
        cloudinary = new Cloudinary(ObjectUtils.asMap(
            "cloud_name", properties.getCloudName(),
            "api_key", properties.getApiKey(),
            "api_secret", properties.getApiSecret(),
            "secure", true
        ));
        productImageService = new ProductImageService(productRepository, cloudinary, properties, eventPublisher);

        product = Product.builder()
            .userId(10L)
            .name("Tea")
            .price(new BigDecimal("120.00"))
            .quantity(4)
            .build();
        product.setId(7L);
    }

    @Test
    void signatureUsesProductScopedPublicIdAndDoesNotExposeSecret() {
        when(productRepository.findByIdAndUserId(7L, 10L)).thenReturn(Optional.of(product));

        ProductImageUploadSignature result = productImageService.createUploadSignature(10L, 7L);

        assertThat(result.publicId()).startsWith("smartbiz/products/10/7/");
        assertThat(result.uploadUrl()).isEqualTo("https://api.cloudinary.com/v1_1/smartbiz-test/image/upload");
        assertThat(result.apiKey()).isEqualTo("12345");
        assertThat(result.signature()).doesNotContain(properties.getApiSecret());
    }

    @Test
    void attachAcceptsValidCloudinaryResponseSignature() {
        String publicId = "smartbiz/products/10/7/image-1";
        long version = 123456789L;
        String signature = cloudinary.apiSignRequest(
            ObjectUtils.asMap("public_id", publicId, "version", version),
            properties.getApiSecret(),
            cloudinary.config.signatureVersion
        );
        when(productRepository.findByIdAndUserId(7L, 10L)).thenReturn(Optional.of(product));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ProductDTO result = productImageService.attach(
            10L,
            7L,
            new ConfirmProductImageRequest(publicId, version, signature)
        );

        assertThat(result.imageUrl()).contains("res.cloudinary.com/smartbiz-test/image/upload/v123456789/");
        assertThat(product.getImagePublicId()).isEqualTo(publicId);
    }

    @Test
    void replacingImageSchedulesOldAssetForDeletion() {
        product.setImagePublicId("smartbiz/products/10/7/old-image");
        product.setImageUrl("https://old-image");
        String publicId = "smartbiz/products/10/7/new-image";
        long version = 8L;
        String signature = cloudinary.apiSignRequest(
            ObjectUtils.asMap("public_id", publicId, "version", version),
            properties.getApiSecret(),
            cloudinary.config.signatureVersion
        );
        when(productRepository.findByIdAndUserId(7L, 10L)).thenReturn(Optional.of(product));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        productImageService.attach(10L, 7L, new ConfirmProductImageRequest(publicId, version, signature));

        verify(eventPublisher).publishEvent(new ProductImageDeleteEvent("smartbiz/products/10/7/old-image"));
    }

    @Test
    void removeClearsImageAndSchedulesAssetForDeletion() {
        product.setImagePublicId("smartbiz/products/10/7/image-1");
        product.setImageUrl("https://image");
        when(productRepository.findByIdAndUserId(7L, 10L)).thenReturn(Optional.of(product));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ProductDTO result = productImageService.remove(10L, 7L);

        assertThat(result.imageUrl()).isNull();
        assertThat(product.getImagePublicId()).isNull();
        verify(eventPublisher).publishEvent(new ProductImageDeleteEvent("smartbiz/products/10/7/image-1"));
    }

    @Test
    void attachRejectsForgedSignature() {
        when(productRepository.findByIdAndUserId(7L, 10L)).thenReturn(Optional.of(product));

        assertThatThrownBy(() -> productImageService.attach(
            10L,
            7L,
            new ConfirmProductImageRequest("smartbiz/products/10/7/image-1", 1L, "forged")
        )).isInstanceOf(IllegalArgumentException.class)
          .hasMessage("Image upload could not be verified.");

        verify(productRepository, never()).save(any());
    }

    @Test
    void attachRejectsImageFromAnotherProduct() {
        when(productRepository.findByIdAndUserId(7L, 10L)).thenReturn(Optional.of(product));

        assertThatThrownBy(() -> productImageService.attach(
            10L,
            7L,
            new ConfirmProductImageRequest("smartbiz/products/10/8/image-1", 1L, "unused")
        )).isInstanceOf(IllegalArgumentException.class)
          .hasMessage("Image does not belong to this product.");
    }

    @Test
    void discardRefusesImageAlreadyAttachedToProduct() {
        String publicId = "smartbiz/products/10/7/image-1";
        long version = 2L;
        String signature = cloudinary.apiSignRequest(
            ObjectUtils.asMap("public_id", publicId, "version", version),
            properties.getApiSecret(),
            cloudinary.config.signatureVersion
        );
        when(productRepository.findByIdAndUserId(7L, 10L)).thenReturn(Optional.of(product));
        when(productRepository.existsByIdAndUserIdAndImagePublicId(7L, 10L, publicId)).thenReturn(true);

        assertThatThrownBy(() -> productImageService.discard(
            10L,
            7L,
            new ConfirmProductImageRequest(publicId, version, signature)
        )).isInstanceOf(IllegalArgumentException.class)
          .hasMessage("Attached product images cannot be discarded.");
    }

    @Test
    void disabledCloudinaryDoesNotAffectProductCrudButRejectsImageOperations() {
        properties.setEnabled(false);

        assertThatThrownBy(() -> productImageService.createUploadSignature(10L, 7L))
            .isInstanceOf(ImageStorageUnavailableException.class);
        verify(productRepository, never()).findByIdAndUserId(any(), any());
    }
}
