package com.smartbiz.auth.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash")
    private String passwordHash;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    private String phone;

    @Column(nullable = false)
    @Builder.Default
    private String role = "USER";

    @Column(name = "paid_plan", nullable = false)
    @Builder.Default
    private String paidPlan = "FREE";

    @Column(name = "paid_until")
    private LocalDateTime paidUntil;

    @Column(name = "trial_ends_at")
    private LocalDateTime trialEndsAt;

    @Column(nullable = false)
    @Builder.Default
    private boolean emailVerified = false;

    private LocalDateTime emailVerifiedAt;

    @Column(unique = true)
    private String googleSubject;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
