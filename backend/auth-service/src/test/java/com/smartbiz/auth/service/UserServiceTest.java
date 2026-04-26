package com.smartbiz.auth.service;

import com.smartbiz.auth.config.JwtUtil;
import com.smartbiz.auth.dto.LoginRequest;
import com.smartbiz.auth.dto.LoginResponse;
import com.smartbiz.auth.dto.SignupRequest;
import com.smartbiz.auth.exception.DuplicateEmailException;
import com.smartbiz.auth.exception.InvalidCredentialsException;
import com.smartbiz.auth.model.User;
import com.smartbiz.auth.repository.RefreshTokenRepository;
import com.smartbiz.auth.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock UserRepository userRepository;
    @Mock RefreshTokenRepository refreshTokenRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock JwtUtil jwtUtil;

    @InjectMocks UserService userService;

    private SignupRequest signupRequest;
    private LoginRequest loginRequest;
    private User savedUser;

    @BeforeEach
    void setUp() {
        signupRequest = new SignupRequest("test@test.com", "password123", "Test User");
        loginRequest = new LoginRequest("test@test.com", "password123");

        savedUser = User.builder()
                .email("test@test.com")
                .passwordHash("hashed")
                .fullName("Test User")
                .role("USER")
                .build();
        savedUser.setId(1L);
    }

    @Test
    void signup_success_returnsTokenResponse() {
        when(userRepository.existsByEmail("test@test.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("hashed");
        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        when(jwtUtil.generateAccessToken(anyLong(), anyString())).thenReturn("access-token");
        when(refreshTokenRepository.save(any())).thenReturn(null);

        LoginResponse response = userService.signup(signupRequest);

        assertThat(response.accessToken()).isEqualTo("access-token");
        assertThat(response.userId()).isEqualTo(1L);
        assertThat(response.email()).isEqualTo("test@test.com");
    }

    @Test
    void signup_duplicateEmail_throwsDuplicateEmailException() {
        when(userRepository.existsByEmail("test@test.com")).thenReturn(true);

        assertThatThrownBy(() -> userService.signup(signupRequest))
                .isInstanceOf(DuplicateEmailException.class);

        verify(userRepository, never()).save(any());
    }

    @Test
    void login_validCredentials_returnsToken() {
        when(userRepository.findByEmail("test@test.com")).thenReturn(Optional.of(savedUser));
        when(passwordEncoder.matches("password123", "hashed")).thenReturn(true);
        when(jwtUtil.generateAccessToken(anyLong(), anyString())).thenReturn("access-token");
        when(refreshTokenRepository.save(any())).thenReturn(null);
        doNothing().when(refreshTokenRepository).deleteByUserId(anyLong());

        LoginResponse response = userService.login(loginRequest);

        assertThat(response.accessToken()).isEqualTo("access-token");
    }

    @Test
    void login_wrongPassword_throwsInvalidCredentialsException() {
        when(userRepository.findByEmail("test@test.com")).thenReturn(Optional.of(savedUser));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(false);

        assertThatThrownBy(() -> userService.login(loginRequest))
                .isInstanceOf(InvalidCredentialsException.class);
    }

    @Test
    void login_unknownEmail_throwsInvalidCredentialsException() {
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.login(loginRequest))
                .isInstanceOf(InvalidCredentialsException.class);
    }
}
