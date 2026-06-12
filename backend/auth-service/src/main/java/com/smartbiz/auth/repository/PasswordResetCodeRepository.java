package com.smartbiz.auth.repository;

import com.smartbiz.auth.model.PasswordResetCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PasswordResetCodeRepository extends JpaRepository<PasswordResetCode, Long> {
    Optional<PasswordResetCode> findByUserId(Long userId);
    void deleteByUserId(Long userId);
}
