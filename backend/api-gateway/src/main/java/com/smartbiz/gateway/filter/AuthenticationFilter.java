package com.smartbiz.gateway.filter;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Component
public class AuthenticationFilter implements GlobalFilter, Ordered {

    private static final Logger log = LoggerFactory.getLogger(AuthenticationFilter.class);
    private static final List<String> PUBLIC_PATHS = List.of(
            "/auth/login",
            "/auth/signup",
            "/auth/verify-email",
            "/auth/resend-verification",
            "/auth/forgot-password",
            "/auth/reset-password",
            "/auth/google/start",
            "/auth/google/callback",
            "/billing/callbacks/esewa",
            "/billing/webhooks/stripe",
            "/sales/payments/esewa/callback",
            "/sales/payments/esewa/return"
    );

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();

        if (isPublicPath(path)) {
            return chain.filter(exchange);
        }

        String authHeader = request.getHeaders().getFirst("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            log.debug("Missing or invalid Authorization header for path: {}", path);
            return unauthorized(exchange.getResponse());
        }

        String token = authHeader.substring(7);
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            Long userId = Long.parseLong(claims.getSubject());

            ServerHttpRequest modifiedRequest = request.mutate()
                    .header("X-User-Id", userId.toString())
                    .build();

            return chain.filter(exchange.mutate().request(modifiedRequest).build());
        } catch (JwtException | NumberFormatException e) {
            log.debug("JWT validation failed: {}", e.getMessage());
            return unauthorized(exchange.getResponse());
        }
    }

    private boolean isPublicPath(String path) {
        return PUBLIC_PATHS.stream().anyMatch(path::startsWith)
            || path.matches("^/billing/payments/[0-9a-fA-F-]{36}/start$");
    }

    private Mono<Void> unauthorized(ServerHttpResponse response) {
        response.setStatusCode(HttpStatus.UNAUTHORIZED);
        response.getHeaders().add("Content-Type", "application/json");
        byte[] body = "{\"error\":\"Unauthorized\",\"message\":\"Valid JWT token required\"}".getBytes(StandardCharsets.UTF_8);
        return response.writeWith(Mono.just(response.bufferFactory().wrap(body)));
    }

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }

    @Override
    public int getOrder() {
        return -1;
    }
}
