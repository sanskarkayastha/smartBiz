package com.smartbiz.auth.repository;

import com.smartbiz.auth.model.EmailVerificationCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EmailVerificationCodeRepository extends JpaRepository<EmailVerificationCode, Long> {
    Optional<EmailVerificationCode> findByUserId(Long userId);
    void deleteByUserId(Long userId);
}
