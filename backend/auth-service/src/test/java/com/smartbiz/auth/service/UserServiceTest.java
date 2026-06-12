package com.smartbiz.auth.service;

import com.smartbiz.auth.config.JwtUtil;
import com.smartbiz.auth.dto.ForgotPasswordRequest;
import com.smartbiz.auth.dto.GoogleUserProfile;
import com.smartbiz.auth.dto.LoginRequest;
import com.smartbiz.auth.dto.LoginResponse;
import com.smartbiz.auth.dto.ResendVerificationRequest;
import com.smartbiz.auth.dto.ResetPasswordRequest;
import com.smartbiz.auth.dto.SignupRequest;
import com.smartbiz.auth.dto.SignupResponse;
import com.smartbiz.auth.dto.VerifyEmailRequest;
import com.smartbiz.auth.exception.DuplicateEmailException;
import com.smartbiz.auth.exception.EmailNotVerifiedException;
import com.smartbiz.auth.exception.InvalidCredentialsException;
import com.smartbiz.auth.exception.PasswordResetException;
import com.smartbiz.auth.exception.VerificationCodeException;
import com.smartbiz.auth.model.EmailVerificationCode;
import com.smartbiz.auth.model.PasswordResetCode;
import com.smartbiz.auth.model.User;
import com.smartbiz.auth.repository.EmailVerificationCodeRepository;
import com.smartbiz.auth.repository.PasswordResetCodeRepository;
import com.smartbiz.auth.repository.RefreshTokenRepository;
import com.smartbiz.auth.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock UserRepository userRepository;
    @Mock EmailVerificationCodeRepository emailVerificationCodeRepository;
    @Mock PasswordResetCodeRepository passwordResetCodeRepository;
    @Mock RefreshTokenRepository refreshTokenRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock JwtUtil jwtUtil;
    @Mock VerificationEmailService verificationEmailService;

    @InjectMocks UserService userService;

    private SignupRequest signupRequest;
    private LoginRequest loginRequest;
    private VerifyEmailRequest verifyEmailRequest;
    private ResendVerificationRequest resendVerificationRequest;
    private ForgotPasswordRequest forgotPasswordRequest;
    private ResetPasswordRequest resetPasswordRequest;
    private User savedUser;

    @BeforeEach
    void setUp() {
        signupRequest = new SignupRequest("test@test.com", "password123", "Test User");
        loginRequest = new LoginRequest("test@test.com", "password123");
        verifyEmailRequest = new VerifyEmailRequest("test@test.com", "123456");
        resendVerificationRequest = new ResendVerificationRequest("test@test.com");
        forgotPasswordRequest = new ForgotPasswordRequest("test@test.com");
        resetPasswordRequest = new ResetPasswordRequest("test@test.com", "123456", "newpassword123");

        savedUser = User.builder()
                .email("test@test.com")
                .passwordHash("hashed")
                .fullName("Test User")
                .role("USER")
                .emailVerified(true)
                .build();
        savedUser.setId(1L);
    }

    @Test
    void signup_success_returnsVerificationResponse() {
        when(userRepository.findByEmailIgnoreCase("test@test.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(anyString())).thenReturn("hashed");
        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        when(emailVerificationCodeRepository.findByUserId(1L)).thenReturn(Optional.empty());

        SignupResponse response = userService.signup(signupRequest);

        assertThat(response.requiresVerification()).isTrue();
        assertThat(response.email()).isEqualTo("test@test.com");
        verify(verificationEmailService).sendVerificationCode(eq("test@test.com"), eq("Test User"), anyString());
    }

    @Test
    void signup_duplicateVerifiedEmail_throwsDuplicateEmailException() {
        when(userRepository.findByEmailIgnoreCase("test@test.com")).thenReturn(Optional.of(savedUser));

        assertThatThrownBy(() -> userService.signup(signupRequest))
                .isInstanceOf(DuplicateEmailException.class);

        verify(userRepository, never()).save(any());
    }

    @Test
    void login_validCredentials_returnsToken() {
        when(userRepository.findByEmailIgnoreCase("test@test.com")).thenReturn(Optional.of(savedUser));
        when(passwordEncoder.matches("password123", "hashed")).thenReturn(true);
        when(jwtUtil.generateAccessToken(anyLong(), anyString())).thenReturn("access-token");
        when(refreshTokenRepository.save(any())).thenReturn(null);
        doNothing().when(refreshTokenRepository).deleteByUserId(anyLong());

        LoginResponse response = userService.login(loginRequest);

        assertThat(response.accessToken()).isEqualTo("access-token");
    }

    @Test
    void login_wrongPassword_throwsInvalidCredentialsException() {
        when(userRepository.findByEmailIgnoreCase("test@test.com")).thenReturn(Optional.of(savedUser));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(false);

        assertThatThrownBy(() -> userService.login(loginRequest))
                .isInstanceOf(InvalidCredentialsException.class);
    }

    @Test
    void login_unknownEmail_throwsInvalidCredentialsException() {
        when(userRepository.findByEmailIgnoreCase(anyString())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.login(loginRequest))
                .isInstanceOf(InvalidCredentialsException.class);
    }

    @Test
    void login_unverifiedEmail_throwsEmailNotVerifiedException() {
        savedUser.setEmailVerified(false);
        when(userRepository.findByEmailIgnoreCase("test@test.com")).thenReturn(Optional.of(savedUser));

        assertThatThrownBy(() -> userService.login(loginRequest))
                .isInstanceOf(EmailNotVerifiedException.class);
    }

    @Test
    void verifyEmail_validCode_returnsToken() {
        savedUser.setEmailVerified(false);
        EmailVerificationCode code = EmailVerificationCode.builder()
                .id(1L)
                .userId(1L)
                .codeHash("hashed-code")
                .expiresAt(LocalDateTime.now().plusMinutes(5))
                .build();

        when(userRepository.findByEmailIgnoreCase("test@test.com")).thenReturn(Optional.of(savedUser));
        when(emailVerificationCodeRepository.findByUserId(1L)).thenReturn(Optional.of(code));
        when(passwordEncoder.matches("123456", "hashed-code")).thenReturn(true);
        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        when(jwtUtil.generateAccessToken(anyLong(), anyString())).thenReturn("access-token");
        when(refreshTokenRepository.save(any())).thenReturn(null);

        LoginResponse response = userService.verifyEmail(verifyEmailRequest);

        assertThat(response.accessToken()).isEqualTo("access-token");
        assertThat(savedUser.isEmailVerified()).isTrue();
        verify(emailVerificationCodeRepository).delete(code);
    }

    @Test
    void resendVerification_verifiedEmail_throwsVerificationCodeException() {
        when(userRepository.findByEmailIgnoreCase("test@test.com")).thenReturn(Optional.of(savedUser));

        assertThatThrownBy(() -> userService.resendVerificationCode(resendVerificationRequest))
                .isInstanceOf(VerificationCodeException.class);
    }

    @Test
    void requestPasswordReset_verifiedLocalAccount_sendsCode() {
        when(userRepository.findByEmailIgnoreCase("test@test.com")).thenReturn(Optional.of(savedUser));
        when(passwordResetCodeRepository.findByUserId(1L)).thenReturn(Optional.empty());
        when(passwordEncoder.encode(anyString())).thenReturn("hashed-reset-code");

        var response = userService.requestPasswordReset(forgotPasswordRequest);

        assertThat(response.email()).isEqualTo("test@test.com");
        verify(passwordResetCodeRepository).save(any(PasswordResetCode.class));
        verify(verificationEmailService).sendPasswordResetCode(eq("test@test.com"), eq("Test User"), anyString());
    }

    @Test
    void resetPassword_validCode_updatesPasswordAndDeletesResetCode() {
        PasswordResetCode code = PasswordResetCode.builder()
                .id(1L)
                .userId(1L)
                .codeHash("hashed-reset-code")
                .expiresAt(LocalDateTime.now().plusMinutes(5))
                .build();

        when(userRepository.findByEmailIgnoreCase("test@test.com")).thenReturn(Optional.of(savedUser));
        when(passwordResetCodeRepository.findByUserId(1L)).thenReturn(Optional.of(code));
        when(passwordEncoder.matches("123456", "hashed-reset-code")).thenReturn(true);
        when(passwordEncoder.encode("newpassword123")).thenReturn("new-password-hash");
        when(userRepository.save(any(User.class))).thenReturn(savedUser);

        var response = userService.resetPassword(resetPasswordRequest);

        assertThat(response.message()).contains("Password updated successfully");
        assertThat(savedUser.getPasswordHash()).isEqualTo("new-password-hash");
        verify(passwordResetCodeRepository).delete(code);
        verify(refreshTokenRepository).deleteByUserId(1L);
    }

    @Test
    void resetPassword_invalidCode_throwsPasswordResetException() {
        PasswordResetCode code = PasswordResetCode.builder()
                .id(1L)
                .userId(1L)
                .codeHash("hashed-reset-code")
                .expiresAt(LocalDateTime.now().plusMinutes(5))
                .build();

        when(userRepository.findByEmailIgnoreCase("test@test.com")).thenReturn(Optional.of(savedUser));
        when(passwordResetCodeRepository.findByUserId(1L)).thenReturn(Optional.of(code));
        when(passwordEncoder.matches("123456", "hashed-reset-code")).thenReturn(false);

        assertThatThrownBy(() -> userService.resetPassword(resetPasswordRequest))
                .isInstanceOf(PasswordResetException.class)
                .hasMessageContaining("Invalid password reset code");

        verify(userRepository, never()).save(any());
    }

    @Test
    void googleLogin_existingEmail_linksAccount() {
        savedUser.setEmailVerified(false);
        savedUser.setGoogleSubject(null);
        GoogleUserProfile profile = new GoogleUserProfile("google-subject", "test@test.com", true, "Google User");

        when(userRepository.findByGoogleSubject("google-subject")).thenReturn(Optional.empty());
        when(userRepository.findByEmailIgnoreCase("test@test.com")).thenReturn(Optional.of(savedUser));
        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        when(jwtUtil.generateAccessToken(anyLong(), anyString())).thenReturn("access-token");
        when(refreshTokenRepository.save(any())).thenReturn(null);

        LoginResponse response = userService.loginWithGoogleProfile(profile);

        assertThat(response.accessToken()).isEqualTo("access-token");
        assertThat(savedUser.getGoogleSubject()).isEqualTo("google-subject");
        assertThat(savedUser.isEmailVerified()).isTrue();
    }
}
