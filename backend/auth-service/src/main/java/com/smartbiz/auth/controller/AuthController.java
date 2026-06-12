package com.smartbiz.auth.controller;

import com.smartbiz.auth.dto.LoginRequest;
import com.smartbiz.auth.dto.LoginResponse;
import com.smartbiz.auth.dto.ResendVerificationRequest;
import com.smartbiz.auth.dto.SignupRequest;
import com.smartbiz.auth.dto.SignupResponse;
import com.smartbiz.auth.dto.UpdateProfileRequest;
import com.smartbiz.auth.dto.VerifyEmailRequest;
import com.smartbiz.auth.dto.GoogleUserProfile;
import com.smartbiz.auth.service.GoogleOAuthService;
import com.smartbiz.auth.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {
    private final UserService userService;
    private final GoogleOAuthService googleOAuthService;

    @PostMapping("/signup")
    public ResponseEntity<SignupResponse> signup(@Valid @RequestBody SignupRequest request) {
        SignupResponse response = userService.signup(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse response = userService.login(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/verify-email")
    public ResponseEntity<LoginResponse> verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        LoginResponse response = userService.verifyEmail(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<SignupResponse> resendVerification(@Valid @RequestBody ResendVerificationRequest request) {
        SignupResponse response = userService.resendVerificationCode(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/google/start")
    public ResponseEntity<Void> googleStart(
            @RequestParam("redirect_uri") String redirectUri,
            HttpServletRequest request) {
        URI authorizationUri = googleOAuthService.buildAuthorizationRedirect(
            redirectUri,
            resolveCallbackBaseUrl(request)
        );
        return ResponseEntity.status(HttpStatus.FOUND).location(authorizationUri).build();
    }

    @GetMapping("/google/callback")
    public ResponseEntity<Void> googleCallback(
            @RequestParam("state") String state,
            @RequestParam(value = "code", required = false) String code,
            @RequestParam(value = "error", required = false) String googleError,
            HttpServletRequest request) {
        String redirectUri = googleOAuthService.resolveRedirectUri(state);
        String callbackBaseUrl = resolveCallbackBaseUrl(request);

        if (googleError != null && !googleError.isBlank()) {
            URI appRedirect = UriComponentsBuilder.fromUriString(redirectUri)
                .queryParam("error", "Google sign-in was cancelled.")
                .build()
                .encode()
                .toUri();

            return ResponseEntity.status(HttpStatus.FOUND).location(appRedirect).build();
        }

        try {
            GoogleUserProfile profile = googleOAuthService.fetchProfileFromAuthorizationCode(code, callbackBaseUrl);
            LoginResponse response = userService.loginWithGoogleProfile(profile);

            URI appRedirect = UriComponentsBuilder.fromUriString(redirectUri)
                .queryParam("access_token", response.accessToken())
                .queryParam("refresh_token", response.refreshToken())
                .queryParam("userId", response.userId())
                .queryParam("email", response.email())
                .queryParam("fullName", response.fullName())
                .build()
                .encode()
                .toUri();

            return ResponseEntity.status(HttpStatus.FOUND).location(appRedirect).build();
        } catch (RuntimeException e) {
            URI appRedirect = UriComponentsBuilder.fromUriString(redirectUri)
                .queryParam("error", e.getMessage())
                .build()
                .encode()
                .toUri();

            return ResponseEntity.status(HttpStatus.FOUND).location(appRedirect).build();
        }
    }

    @PutMapping("/profile")
    public ResponseEntity<Map<String, String>> updateProfile(
            @RequestHeader("X-User-Id") Long userId,
            @RequestBody UpdateProfileRequest request) {
        userService.updateProfile(userId, request);
        return ResponseEntity.ok(Map.of("message", "Profile updated"));
    }

    private String resolveCallbackBaseUrl(HttpServletRequest request) {
        return googleOAuthService.resolveCallbackBaseUrl(
            request.getHeader("Forwarded"),
            request.getHeader("X-Forwarded-Proto"),
            request.getHeader("X-Forwarded-Host"),
            request.getHeader("X-Forwarded-Port"),
            request.getScheme(),
            request.getServerName(),
            request.getServerPort()
        );
    }
}
