package com.smartbiz.auth.service;

import com.smartbiz.auth.dto.LoginRequest;
import com.smartbiz.auth.dto.LoginResponse;
import com.smartbiz.auth.dto.SignupRequest;
import com.smartbiz.auth.dto.UpdateProfileRequest;
import com.smartbiz.auth.exception.DuplicateEmailException;
import com.smartbiz.auth.exception.InvalidCredentialsException;
import com.smartbiz.auth.model.RefreshToken;
import com.smartbiz.auth.model.User;
import com.smartbiz.auth.config.JwtUtil;
import com.smartbiz.auth.repository.RefreshTokenRepository;
import com.smartbiz.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public LoginResponse signup(SignupRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new DuplicateEmailException("Email already registered");
        }

        User user = User.builder()
            .email(request.email())
            .passwordHash(passwordEncoder.encode(request.password()))
            .fullName(request.fullName())
            .role("USER")
            .build();

        user = userRepository.save(user);
        log.info("User registered: {}", user.getEmail());

        return createLoginResponse(user);
    }

    @Transactional
    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email())
            .orElseThrow(() -> new InvalidCredentialsException("Invalid credentials"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new InvalidCredentialsException("Invalid credentials");
        }

        refreshTokenRepository.deleteByUserId(user.getId());
        log.info("User logged in: {}", user.getEmail());

        return createLoginResponse(user);
    }

    @Transactional
    public void updateProfile(Long userId, UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        if (request.fullName() != null && !request.fullName().isBlank()) {
            user.setFullName(request.fullName());
        }
        if (request.phone() != null) {
            user.setPhone(request.phone());
        }
        userRepository.save(user);
        log.info("Profile updated for userId={}", userId);
    }

    @Transactional
    private LoginResponse createLoginResponse(User user) {
        String accessToken = jwtUtil.generateAccessToken(user.getId(), user.getEmail());
        String refreshTokenValue = UUID.randomUUID().toString();

        RefreshToken refreshToken = RefreshToken.builder()
            .userId(user.getId())
            .token(refreshTokenValue)
            .expiresAt(LocalDateTime.now().plusDays(30))
            .build();

        refreshTokenRepository.save(refreshToken);

        return new LoginResponse(
            accessToken,
            refreshTokenValue,
            user.getId(),
            user.getEmail(),
            user.getFullName()
        );
    }
}
