# SmartBiz TODO — Next Session Context

> Last updated: 2026-04-27  
> **STATUS:** ✅ All critical fixes (1-9) DONE. See PROGRESS.md for details.

---

## What Was Fixed This Session

All 9 critical/important fixes completed:
1. ✅ Gateway Security Config (permits all, lets JWT filter handle auth)
2. ✅ API Gateway pom (Servlet/WebFlux exclusions)
3. ✅ Auth Service stateless session
4. ✅ CRM user ownership validation
5. ✅ API Gateway CORS
6. ✅ Customers mobile tab (new screen)
7. ✅ Inventory edit/delete UI
8. ✅ Sales history tab
9. ✅ Docker infrastructure (compose + 6 Dockerfiles)

**See FIXES_SUMMARY.md for architectural details.**

---

## Root Cause Summary (Already Fixed)

The mobile app IS correctly routing all calls through the API Gateway at port 8080. The gateway JWT filter logic is correct. However, **the API Gateway is broken** because:

1. The parent `backend/pom.xml` adds `spring-boot-starter-security` to ALL modules globally.
2. The API Gateway has NO `SecurityConfig` class.
3. Spring Boot's default reactive security auto-configuration kicks in and requires HTTP Basic auth on every route.
4. This means ALL incoming requests (including `/auth/login`) are rejected BEFORE the JWT GlobalFilter runs.

**Fix #1 is the most critical** — everything else is secondary.

---

## Quick Start — Test the Fixes

### Option 1: Docker (Recommended for full stack test)
```bash
cd /path/to/smartBiz
docker-compose up -d

# Wait 30s for health checks
docker-compose logs -f postgres  # Watch startup

# Test gateway
curl -X POST http://localhost:8080/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"pass123","fullName":"Test"}'

# You should get JWT back, not a 401 error. That confirms Fix #1 worked.
```

### Option 2: Manual (without Docker)
```bash
cd backend

# Terminal 1: Start Eureka
cd eureka-server && mvn spring-boot:run

# Terminal 2: Start API Gateway
cd api-gateway && mvn spring-boot:run

# Terminal 3: Start Auth Service
cd auth-service && mvn spring-boot:run

# Then test the same curl command above
```

### Option 3: Mobile Testing
```bash
# Terminal 4
cd mobile
npx expo start

# Press 'a' for Android emulator
# Or 's' for iOS simulator
# The app should connect to http://10.0.2.2:8080 (Android) automatically
# Try signing up — you should see the onboarding flow work
```

---

## Remaining Work (if session ended before completion)

### Critical (do these first)

**Fix #1 — GatewaySecurityConfig.java (NEW FILE)**
```
backend/api-gateway/src/main/java/com/smartbiz/gateway/config/GatewaySecurityConfig.java
```
Create a `@Configuration` class with a `SecurityWebFilterChain` bean that permits all exchanges. Use `ServerHttpSecurity` (reactive, NOT `HttpSecurity`). This disables Spring Security's default blocking behavior so the JWT GlobalFilter handles auth.

```java
@Configuration
@EnableWebFluxSecurity
public class GatewaySecurityConfig {
    @Bean
    public SecurityWebFilterChain springSecurityFilterChain(ServerHttpSecurity http) {
        return http
            .authorizeExchange(e -> e.anyExchange().permitAll())
            .csrf(csrf -> csrf.disable())
            .httpBasic(basic -> basic.disable())
            .formLogin(form -> form.disable())
            .build();
    }
}
```

**Fix #2 — api-gateway/pom.xml**
Exclude `spring-boot-starter-web` (Servlet/Tomcat) from the API Gateway since it uses WebFlux:
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
    <exclusions>
        <exclusion>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-tomcat</artifactId>
        </exclusion>
        <exclusion>
            <groupId>org.springframework</groupId>
            <artifactId>spring-webmvc</artifactId>
        </exclusion>
    </exclusions>
</dependency>
```

**Fix #3 — Auth SecurityConfig.java**
Add session policy (file: `backend/auth-service/src/main/java/com/smartbiz/auth/config/SecurityConfig.java`):
```java
.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
```

**Fix #4 — CRM CustomerController + CrmService**
Add `@RequestHeader("X-User-Id") Long userId` to `PUT /customers/{id}/purchase` and validate ownership.
- Controller: `backend/crm-service/src/main/java/com/smartbiz/crm/controller/CustomerController.java`
- Service: `backend/crm-service/src/main/java/com/smartbiz/crm/service/CrmService.java`

### CORS

**Fix #5 — api-gateway/src/main/resources/application.yml**
Add `spring.cloud.gateway.globalcors` block.

### Mobile Screens

**Fix #6 — Customers tab**
- New: `mobile/app/(tabs)/customers.tsx`
- Edit: `mobile/app/(tabs)/_layout.tsx` (add People tab)
- Service: `mobile/services/customers.ts` (already implemented, just needs UI)

**Fix #7 — Edit/Delete inventory items**
- Edit: `mobile/app/(tabs)/inventory.tsx` (add swipe or button per row)

**Fix #8 — Sales history**
- Edit: `mobile/app/(tabs)/sales.tsx` (add history section below POS)

### Infrastructure

**Fix #9 — docker-compose.yml**
Add containers for: eureka-server, api-gateway, auth-service, inventory-service, crm-service, sales-service.
Each needs a Dockerfile (multi-stage Maven build → JRE image).
Start order: postgres (healthcheck ready) → eureka → gateway → other services.

---

## Architecture Quick Reference

### Service Ports
| Service | Port | Spring App Name |
|---------|------|----------------|
| API Gateway | 8080 | API-GATEWAY |
| Eureka | 8761 | EUREKA-SERVER |
| Auth | 8081 | AUTH-SERVICE |
| Inventory | 8082 | INVENTORY-SERVICE |
| CRM | 8083 | CRM-SERVICE |
| Sales | 8084 | SALES-SERVICE |

### Key File Paths
- Gateway JWT filter: `backend/api-gateway/src/main/java/com/smartbiz/gateway/filter/AuthenticationFilter.java`
- Gateway routes: `backend/api-gateway/src/main/resources/application.yml`
- Mobile API client: `mobile/services/api.ts` (axios + SecureStore interceptors)
- Mobile auth: `mobile/contexts/AuthContext.tsx`

### Mobile API Base URL
- Android emulator: `http://10.0.2.2:8080` (via `.env` `EXPO_PUBLIC_API_URL`)
- Physical device: use machine's LAN IP, e.g. `http://192.168.x.x:8080`

### Sale Flow (Most Complex)
Mobile → Gateway (JWT check) → Sales Service → Inventory (stock check) → Inventory (deduct stock) → CRM (update total) → response
All inter-service calls via Eureka (`lb://SERVICE-NAME`), RestTemplate `@LoadBalanced`.
