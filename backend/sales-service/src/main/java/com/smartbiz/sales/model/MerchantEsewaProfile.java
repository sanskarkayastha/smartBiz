package com.smartbiz.sales.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "merchant_esewa_profiles")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class MerchantEsewaProfile {
    @Id @Column(name = "user_id") private Long userId;
    @Column(name = "product_code", nullable = false) private String productCode;
    @Column(name = "encrypted_access_key", nullable = false) private String encryptedAccessKey;
    @Column(nullable = false) private String environment;
    @CreationTimestamp @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt;
    @UpdateTimestamp @Column(name = "updated_at", nullable = false) private LocalDateTime updatedAt;
}
