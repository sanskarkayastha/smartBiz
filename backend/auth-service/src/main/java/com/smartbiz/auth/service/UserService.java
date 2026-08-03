package com.smartbiz.auth.service;

import com.smartbiz.auth.dto.EmailActionResponse;
import com.smartbiz.auth.dto.ForgotPasswordRequest;
import com.smartbiz.auth.dto.LoginRequest;
import com.smartbiz.auth.dto.LoginResponse;
import com.smartbiz.auth.dto.GoogleUserProfile;
import com.smartbiz.auth.dto.ResendVerificationRequest;
import com.smartbiz.auth.dto.ResetPasswordRequest;
import com.smartbiz.auth.dto.SignupRequest;
import com.smartbiz.auth.dto.SignupResponse;
import com.smartbiz.auth.dto.UpdateProfileRequest;
import com.smartbiz.auth.dto.VerifyEmailRequest;
import com.smartbiz.auth.exception.DuplicateEmailException;
import com.smartbiz.auth.exception.EmailNotVerifiedException;
import com.smartbiz.auth.exception.InvalidCredentialsException;
import com.smartbiz.auth.exception.PasswordResetException;
import com.smartbiz.auth.exception.UnsupportedAuthProviderException;
import com.smartbiz.auth.exception.VerificationCodeException;
import com.smartbiz.auth.model.User;
import com.smartbiz.auth.config.JwtUtil;
import com.smartbiz.auth.model.EmailVerificationCode;
import com.smartbiz.auth.model.PasswordResetCode;
import com.smartbiz.auth.model.RefreshToken;
import com.smartbiz.auth.repository.EmailVerificationCodeRepository;
import com.smartbiz.auth.repository.PasswordResetCodeRepository;
import com.smartbiz.auth.repository.RefreshTokenRepository;
import com.smartbiz.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final EmailVerificationCodeRepository emailVerificationCodeRepository;
    private final PasswordResetCodeRepository passwordResetCodeRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;
    private final VerificationEmailService verificationEmailService;

    @Value("${app.auth.verification.code-expiry-minutes:10}")
    private int verificationCodeExpiryMinutes;

    @Value("${app.auth.password-reset.code-expiry-minutes:10}")
    private int passwordResetCodeExpiryMinutes;

    @Transactional
    public SignupResponse signup(SignupRequest request) {
        String email = normalizeEmail(request.email());
        Optional<User> existingUser = userRepository.findByEmailIgnoreCase(email);

        if (existingUser.isPresent() && existingUser.get().isEmailVerified()) {
            throw new DuplicateEmailException("Email already registered");
        }

        User user = existingUser
            .map(found -> refreshUnverifiedLocalAccount(found, request))
            .orElseGet(() -> User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(request.password()))
                .fullName(request.fullName().trim())
                .role("USER")
                .paidPlan("FREE")
                .trialEndsAt(LocalDateTime.now().plusDays(14))
                .emailVerified(false)
                .build());

        user = userRepository.save(user);
        createAndSendVerificationCode(user);
        log.info("User registered: {}", user.getEmail());

        return new SignupResponse(
            "Verification code sent to your email",
            user.getEmail(),
            true
        );
    }

    @Transactional
    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmailIgnoreCase(normalizeEmail(request.email()))
            .orElseThrow(() -> new InvalidCredentialsException("Invalid credentials"));

        if (user.getPasswordHash() == null || user.getPasswordHash().isBlank()) {
            throw new UnsupportedAuthProviderException("This account uses Google sign-in. Please continue with Google.");
        }
        if (!user.isEmailVerified()) {
            throw new EmailNotVerifiedException("Please verify your email before logging in.");
        }
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new InvalidCredentialsException("Invalid credentials");
        }

        refreshTokenRepository.deleteByUserId(user.getId());
        log.info("User logged in: {}", user.getEmail());

        return createLoginResponse(user);
    }

    @Transactional
    public LoginResponse verifyEmail(VerifyEmailRequest request) {
        User user = userRepository.findByEmailIgnoreCase(normalizeEmail(request.email()))
            .orElseThrow(() -> new VerificationCodeException("No pending verification found for this email."));

        if (user.isEmailVerified()) {
            throw new VerificationCodeException("Email is already verified. Please sign in.");
        }

        EmailVerificationCode verificationCode = emailVerificationCodeRepository.findByUserId(user.getId())
            .orElseThrow(() -> new VerificationCodeException("Verification code expired. Please request a new code."));

        if (verificationCode.getExpiresAt().isBefore(LocalDateTime.now())) {
            emailVerificationCodeRepository.delete(verificationCode);
            throw new VerificationCodeException("Verification code expired. Please request a new code.");
        }
        if (!passwordEncoder.matches(request.code(), verificationCode.getCodeHash())) {
            throw new VerificationCodeException("Invalid verification code.");
        }

        user.setEmailVerified(true);
        user.setEmailVerifiedAt(LocalDateTime.now());
        userRepository.save(user);
        emailVerificationCodeRepository.delete(verificationCode);
        refreshTokenRepository.deleteByUserId(user.getId());

        log.info("Email verified for {}", user.getEmail());
        return createLoginResponse(user);
    }

    @Transactional
    public SignupResponse resendVerificationCode(ResendVerificationRequest request) {
        User user = userRepository.findByEmailIgnoreCase(normalizeEmail(request.email()))
            .orElseThrow(() -> new VerificationCodeException("No pending verification found for this email."));

        if (user.isEmailVerified()) {
            throw new VerificationCodeException("Email is already verified. Please sign in.");
        }
        if (user.getPasswordHash() == null || user.getPasswordHash().isBlank()) {
            throw new UnsupportedAuthProviderException("This account uses Google sign-in. Please continue with Google.");
        }

        createAndSendVerificationCode(user);
        return new SignupResponse("A new verification code has been sent.", user.getEmail(), true);
    }

    @Transactional
    public EmailActionResponse requestPasswordReset(ForgotPasswordRequest request) {
        User user = userRepository.findByEmailIgnoreCase(normalizeEmail(request.email()))
            .orElseThrow(() -> new PasswordResetException("No local account found for this email."));

        ensureLocalVerifiedAccount(user);
        createAndSendPasswordResetCode(user);
        return new EmailActionResponse("Password reset code sent to your email", user.getEmail());
    }

    @Transactional
    public EmailActionResponse resetPassword(ResetPasswordRequest request) {
        User user = userRepository.findByEmailIgnoreCase(normalizeEmail(request.email()))
            .orElseThrow(() -> new PasswordResetException("No password reset request found for this email."));

        ensureLocalVerifiedAccount(user);

        PasswordResetCode resetCode = passwordResetCodeRepository.findByUserId(user.getId())
            .orElseThrow(() -> new PasswordResetException("Password reset code expired. Please request a new code."));

        if (resetCode.getExpiresAt().isBefore(LocalDateTime.now())) {
            passwordResetCodeRepository.delete(resetCode);
            throw new PasswordResetException("Password reset code expired. Please request a new code.");
        }
        if (!passwordEncoder.matches(request.code(), resetCode.getCodeHash())) {
            throw new PasswordResetException("Invalid password reset code.");
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
        passwordResetCodeRepository.delete(resetCode);
        refreshTokenRepository.deleteByUserId(user.getId());

        log.info("Password reset completed for {}", user.getEmail());
        return new EmailActionResponse("Password updated successfully. Please sign in.", user.getEmail());
    }

    @Transactional
    public LoginResponse loginWithGoogleProfile(GoogleUserProfile profile) {
        String email = normalizeEmail(profile.email());
        User user = userRepository.findByGoogleSubject(profile.subject())
            .or(() -> userRepository.findByEmailIgnoreCase(email))
            .map(existing -> mergeGoogleProfile(existing, profile, email))
            .orElseGet(() -> createGoogleUser(profile, email));

        user = userRepository.save(user);
        refreshTokenRepository.deleteByUserId(user.getId());
        log.info("Google login succeeded for {}", user.getEmail());
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

    private User refreshUnverifiedLocalAccount(User user, SignupRequest request) {
        if (user.getGoogleSubject() != null && (user.getPasswordHash() == null || user.getPasswordHash().isBlank())) {
            throw new DuplicateEmailException("This email is already registered with Google sign-in.");
        }

        user.setFullName(request.fullName().trim());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setEmailVerified(false);
        user.setEmailVerifiedAt(null);
        if (user.getTrialEndsAt() == null) user.setTrialEndsAt(LocalDateTime.now().plusDays(14));
        return user;
    }

    private void createAndSendVerificationCode(User user) {
        String rawCode = generateSixDigitCode();

        EmailVerificationCode code = emailVerificationCodeRepository.findByUserId(user.getId())
            .orElseGet(() -> EmailVerificationCode.builder().userId(user.getId()).build());

        code.setCodeHash(passwordEncoder.encode(rawCode));
        code.setExpiresAt(LocalDateTime.now().plusMinutes(verificationCodeExpiryMinutes));
        emailVerificationCodeRepository.save(code);
        verificationEmailService.sendVerificationCode(user.getEmail(), user.getFullName(), rawCode);
    }

    private void createAndSendPasswordResetCode(User user) {
        String rawCode = generateSixDigitCode();

        PasswordResetCode code = passwordResetCodeRepository.findByUserId(user.getId())
            .orElseGet(() -> PasswordResetCode.builder().userId(user.getId()).build());

        code.setCodeHash(passwordEncoder.encode(rawCode));
        code.setExpiresAt(LocalDateTime.now().plusMinutes(passwordResetCodeExpiryMinutes));
        passwordResetCodeRepository.save(code);
        verificationEmailService.sendPasswordResetCode(user.getEmail(), user.getFullName(), rawCode);
    }

    private void ensureLocalVerifiedAccount(User user) {
        if (user.getPasswordHash() == null || user.getPasswordHash().isBlank()) {
            throw new UnsupportedAuthProviderException("This account uses Google sign-in. Please continue with Google.");
        }
        if (!user.isEmailVerified()) {
            throw new EmailNotVerifiedException("Please verify your email before resetting your password.");
        }
    }

    private User mergeGoogleProfile(User user, GoogleUserProfile profile, String normalizedEmail) {
        if (user.getGoogleSubject() != null && !user.getGoogleSubject().equals(profile.subject())) {
            throw new DuplicateEmailException("This email is already linked to another Google account.");
        }

        user.setEmail(normalizedEmail);
        user.setGoogleSubject(profile.subject());
        user.setEmailVerified(true);
        if (user.getEmailVerifiedAt() == null) {
            user.setEmailVerifiedAt(LocalDateTime.now());
        }
        if (user.getFullName() == null || user.getFullName().isBlank()) {
            user.setFullName(resolveDisplayName(profile.fullName(), normalizedEmail));
        }
        emailVerificationCodeRepository.deleteByUserId(user.getId());
        return user;
    }

    private User createGoogleUser(GoogleUserProfile profile, String normalizedEmail) {
        return User.builder()
            .email(normalizedEmail)
            .fullName(resolveDisplayName(profile.fullName(), normalizedEmail))
            .role("USER")
            .paidPlan("FREE")
            .trialEndsAt(LocalDateTime.now().plusDays(14))
            .emailVerified(true)
            .emailVerifiedAt(LocalDateTime.now())
            .googleSubject(profile.subject())
            .build();
    }

    private String resolveDisplayName(String fullName, String email) {
        if (fullName != null && !fullName.isBlank()) {
            return fullName.trim();
        }
        int atIndex = email.indexOf('@');
        return atIndex > 0 ? email.substring(0, atIndex) : email;
    }

    private String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }

    private String generateSixDigitCode() {
        return String.valueOf(ThreadLocalRandom.current().nextInt(100000, 1_000_000));
    }
}
