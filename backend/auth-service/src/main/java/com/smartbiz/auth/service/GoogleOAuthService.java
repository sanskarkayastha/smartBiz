package com.smartbiz.auth.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.smartbiz.auth.config.JwtUtil;
import com.smartbiz.auth.dto.GoogleUserProfile;
import com.smartbiz.auth.exception.FeatureDisabledException;
import com.smartbiz.auth.exception.InvalidCredentialsException;
import com.smartbiz.auth.exception.OAuthStateException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.Arrays;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class GoogleOAuthService {
    private static final String GOOGLE_SCOPE = "openid email profile";

    private final JwtUtil jwtUtil;

    private final RestClient restClient = RestClient.builder().build();

    @Value("${app.auth.google.enabled:false}")
    private boolean googleEnabled;

    @Value("${app.auth.google.client-id:}")
    private String googleClientId;

    @Value("${app.auth.google.client-secret:}")
    private String googleClientSecret;

    @Value("${app.auth.google.allowed-redirect-prefixes:http://localhost:3000/api/auth/google/callback,mobile://auth/callback}")
    private String allowedRedirectPrefixes;

    public URI buildAuthorizationRedirect(String redirectUri, String callbackBaseUrl) {
        validateEnabled();
        validateRedirectUri(redirectUri);

        String state = jwtUtil.generateOauthStateToken(redirectUri);
        String callbackUrl = buildCallbackUrl(callbackBaseUrl);

        return UriComponentsBuilder
            .fromUriString("https://accounts.google.com/o/oauth2/v2/auth")
            .queryParam("client_id", googleClientId)
            .queryParam("redirect_uri", callbackUrl)
            .queryParam("response_type", "code")
            .queryParam("scope", GOOGLE_SCOPE)
            .queryParam("state", state)
            .queryParam("prompt", "select_account")
            .build()
            .encode()
            .toUri();
    }

    public String resolveRedirectUri(String state) {
        validateEnabled();
        try {
            String redirectUri = jwtUtil.parseOauthStateToken(state);
            validateRedirectUri(redirectUri);
            return redirectUri;
        } catch (Exception e) {
            throw new OAuthStateException("Google sign-in session expired. Please try again.");
        }
    }

    public GoogleUserProfile fetchProfileFromAuthorizationCode(String code, String callbackBaseUrl) {
        validateEnabled();
        if (code == null || code.isBlank()) {
            throw new InvalidCredentialsException("Google sign-in failed");
        }

        String callbackUrl = buildCallbackUrl(callbackBaseUrl);
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("code", code);
        form.add("client_id", googleClientId);
        form.add("client_secret", googleClientSecret);
        form.add("redirect_uri", callbackUrl);
        form.add("grant_type", "authorization_code");

        GoogleTokenResponse tokenResponse;
        try {
            tokenResponse = restClient.post()
                .uri("https://oauth2.googleapis.com/token")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .body(GoogleTokenResponse.class);
        } catch (RestClientResponseException e) {
            log.warn("Google token exchange failed with status {} and body {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new InvalidCredentialsException("Google sign-in failed. Check your Google client secret and redirect URI.");
        } catch (Exception e) {
            log.warn("Google token exchange failed", e);
            throw new InvalidCredentialsException("Google sign-in failed");
        }

        if (tokenResponse == null || tokenResponse.accessToken() == null || tokenResponse.idToken() == null) {
            throw new InvalidCredentialsException("Google sign-in failed");
        }

        GoogleUserInfoResponse userInfo;
        try {
            userInfo = restClient.get()
                .uri("https://openidconnect.googleapis.com/v1/userinfo")
                .header("Authorization", "Bearer " + tokenResponse.accessToken())
                .retrieve()
                .body(GoogleUserInfoResponse.class);
        } catch (RestClientResponseException e) {
            log.warn("Google userinfo lookup failed with status {} and body {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new InvalidCredentialsException("Google sign-in failed while loading your Google profile.");
        } catch (Exception e) {
            log.warn("Google userinfo lookup failed", e);
            throw new InvalidCredentialsException("Google sign-in failed");
        }

        if (userInfo == null || userInfo.email() == null || userInfo.sub() == null) {
            throw new InvalidCredentialsException("Google sign-in failed");
        }
        if (!Boolean.TRUE.equals(userInfo.emailVerified())) {
            throw new InvalidCredentialsException("Google account email is not verified");
        }

        return new GoogleUserProfile(
            userInfo.sub(),
            userInfo.email(),
            true,
            userInfo.name()
        );
    }

    private void validateEnabled() {
        if (!googleEnabled || googleClientId.isBlank() || googleClientSecret.isBlank()) {
            throw new FeatureDisabledException("Google sign-in is not configured yet");
        }
    }

    public String resolveCallbackBaseUrl(String forwardedHeader, String forwardedProto, String forwardedHost, String forwardedPort, String scheme, String serverName, int serverPort) {
        Map<String, String> forwarded = parseForwardedHeader(forwardedHeader);
        String protoFromForwarded = forwarded.get("proto");
        String hostFromForwarded = forwarded.get("host");

        String proto = firstValue(forwardedProto);
        String hostValue = firstValue(forwardedHost);
        String portValue = firstValue(forwardedPort);

        String resolvedScheme = (protoFromForwarded == null || protoFromForwarded.isBlank())
            ? ((proto == null || proto.isBlank()) ? scheme : proto)
            : protoFromForwarded;
        String resolvedHost = serverName;
        int resolvedPort = serverPort;

        String preferredHost = (hostFromForwarded == null || hostFromForwarded.isBlank()) ? hostValue : hostFromForwarded;

        if (preferredHost != null && !preferredHost.isBlank()) {
            String hostPart = preferredHost;
            if (hostPart.contains(":")) {
                String[] pieces = hostPart.split(":", 2);
                resolvedHost = pieces[0];
                if (portValue == null || portValue.isBlank()) {
                    try {
                        resolvedPort = Integer.parseInt(pieces[1]);
                    } catch (NumberFormatException ignored) {
                        // Fall back to request port if forwarded host carries a non-numeric suffix.
                    }
                }
            } else {
                resolvedHost = hostPart;
            }
        }

        if (portValue != null && !portValue.isBlank()) {
            try {
                resolvedPort = Integer.parseInt(portValue);
            } catch (NumberFormatException ignored) {
                // Fall back to request port when the forwarded port is malformed.
            }
        }

        boolean defaultPort = ("http".equalsIgnoreCase(resolvedScheme) && resolvedPort == 80)
            || ("https".equalsIgnoreCase(resolvedScheme) && resolvedPort == 443);
        String portSuffix = defaultPort ? "" : ":" + resolvedPort;

        return resolvedScheme + "://" + resolvedHost + portSuffix;
    }

    private String buildCallbackUrl(String callbackBaseUrl) {
        if (callbackBaseUrl == null || callbackBaseUrl.isBlank()) {
            throw new OAuthStateException("Google callback base URL is missing");
        }
        return callbackBaseUrl.replaceAll("/+$", "") + "/auth/google/callback";
    }

    private String firstValue(String headerValue) {
        if (headerValue == null) {
            return null;
        }
        int commaIndex = headerValue.indexOf(',');
        return commaIndex >= 0 ? headerValue.substring(0, commaIndex).trim() : headerValue.trim();
    }

    private Map<String, String> parseForwardedHeader(String forwardedHeader) {
        Map<String, String> values = new HashMap<>();
        String first = firstValue(forwardedHeader);
        if (first == null || first.isBlank()) {
            return values;
        }

        for (String part : first.split(";")) {
            String[] pieces = part.split("=", 2);
            if (pieces.length != 2) {
                continue;
            }

            String key = pieces[0].trim().toLowerCase(Locale.ROOT);
            String value = pieces[1].trim();
            if (value.startsWith("\"") && value.endsWith("\"") && value.length() >= 2) {
                value = value.substring(1, value.length() - 1);
            }
            values.put(key, value);
        }

        return values;
    }

    private void validateRedirectUri(String redirectUri) {
        if (redirectUri == null || redirectUri.isBlank()) {
            throw new OAuthStateException("Missing redirect URI");
        }

        Set<String> allowedPrefixes = new LinkedHashSet<>();
        Arrays.stream(allowedRedirectPrefixes.split(","))
            .map(String::trim)
            .filter(value -> !value.isBlank())
            .forEach(allowedPrefixes::add);

        boolean allowed = allowedPrefixes.stream().anyMatch(redirectUri::startsWith);
        if (!allowed) {
            throw new OAuthStateException("Redirect URI is not allowed");
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record GoogleTokenResponse(
        @JsonProperty("access_token") String accessToken,
        @JsonProperty("id_token") String idToken
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record GoogleUserInfoResponse(
        String sub,
        String email,
        @JsonProperty("email_verified") Boolean emailVerified,
        String name
    ) {}
}
