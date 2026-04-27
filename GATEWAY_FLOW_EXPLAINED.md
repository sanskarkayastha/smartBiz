# SmartBiz API Gateway Flow — Complete Visual Guide

This document explains exactly what code runs at each step when a mobile user tries to sign up.

---

## Scenario: Mobile User Signs Up

**What the user does:**
1. Opens mobile app
2. Taps "Sign Up"
3. Fills email: `test@test.com`, password: `Test123!`, fullName: `John Doe`
4. Taps "Create Account"

**What happens behind the scenes:**

---

## Step 1: Mobile App Makes Request

### Code: `mobile/contexts/AuthContext.tsx`

```typescript
// User taps "Create Account" button
async function register(email: string, password: string, fullName: string) {
  // Call the auth service
  const data = await authService.register(email, password, fullName);
  await saveSession(data);
}
```

### Code: `mobile/services/auth.ts`

```typescript
export const authService = {
  async register(email: string, password: string, fullName: string): Promise<LoginResponse> {
    // Make HTTP POST request to /auth/signup
    const { data } = await api.post<LoginResponse>('/auth/signup', {
      email, 
      password, 
      fullName
    });
    return data;
  },
};
```

### Code: `mobile/services/api.ts`

```typescript
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:8080';

export const api = axios.create({ 
  baseURL: API_URL,  // http://10.0.2.2:8080 (on Android emulator)
  timeout: 10000 
});

// INTERCEPTOR: Add headers automatically to EVERY request
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('token');
  const userId = await SecureStore.getItemAsync('userId');
  
  // For signup (first time), token and userId are null, so these don't get added
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (userId) config.headers['X-User-Id'] = userId;
  
  return config;
});
```

### Network Request Sent

```
POST http://10.0.2.2:8080/auth/signup HTTP/1.1
Content-Type: application/json

{
  "email": "test@test.com",
  "password": "Test123!",
  "fullName": "John Doe"
}
```

---

## Step 2: Request Reaches API Gateway

```
┌─────────────────────────────────────────────────────────────┐
│                    DOCKER CONTAINER                         │
│                   smartbiz-gateway                          │
│                   Port 8080                                 │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Spring Cloud Gateway (WebFlux)                          ││
│ │                                                         ││
│ │  POST /auth/signup                                      ││
│ │   ↓                                                     ││
│ │  [1] AuthenticationFilter (runs FIRST)                 ││
│ │      Order: -1 (highest priority)                      ││
│ │   ↓                                                     ││
│ │  [2] Route Matching                                    ││
│ │   ↓                                                     ││
│ │  [3] Forward to AUTH-SERVICE                          ││
│ │                                                         ││
│ └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Step 2a: AuthenticationFilter Runs

**File:** `backend/api-gateway/src/main/java/com/smartbiz/gateway/filter/AuthenticationFilter.java`

```java
@Component
public class AuthenticationFilter implements GlobalFilter, Ordered {

    private static final List<String> PUBLIC_PATHS = 
        List.of("/auth/login", "/auth/signup");  // ← Signup is PUBLIC

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();  // "/auth/signup"

        // Step 1: Check if path is PUBLIC (no JWT required)
        if (PUBLIC_PATHS.stream().anyMatch(path::startsWith)) {
            // ✅ Path is public, skip JWT validation
            return chain.filter(exchange);  // Continue to next filter
        }

        // Step 2: For private paths, validate JWT token
        String authHeader = request.getHeaders().getFirst("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return unauthorized(exchange.getResponse());  // Return 401
        }

        // ... JWT validation ...
        return chain.filter(exchange);
    }

    @Override
    public int getOrder() {
        return -1;  // Run FIRST (before all other filters)
    }
}
```

**What happens for signup request:**
- Path = `/auth/signup` ✅ matches PUBLIC_PATHS
- JWT validation is **SKIPPED** (no authorization header needed)
- Request continues to next step

---

### Step 2b: Route Matching

**File:** `backend/api-gateway/src/main/resources/application.yml`

```yaml
spring:
  cloud:
    gateway:
      routes:
        # ← Route #1
        - id: auth-service
          uri: lb://AUTH-SERVICE          # Load-balanced URL (via Eureka)
          predicates:
            - Path=/auth/**               # ← MATCHES "/auth/signup" ✅
          filters:
            - StripPrefix=0
        
        # ← Route #2
        - id: inventory-service
          uri: lb://INVENTORY-SERVICE
          predicates:
            - Path=/inventory/**          # Doesn't match
          filters:
            - StripPrefix=0
        
        # ... other routes ...
```

**What happens:**
- Request path `/auth/signup` matches the first route (auth-service) ✅
- Gateway resolves `lb://AUTH-SERVICE` using Eureka service discovery
- Eureka returns the actual address: `http://smartbiz-auth:8081` (docker container hostname)

---

## Step 3: Request Forwarded to Auth Service

```
┌─────────────────────────────────────┐
│   API Gateway (8080)                │
│   ↓ Forwards request ↓              │
└─────────────────────────────────────┘
          │
          │ HTTP POST /auth/signup
          │ Load-balanced via Eureka
          ↓
┌─────────────────────────────────────────────────────────────┐
│        DOCKER CONTAINER: smartbiz-auth                      │
│        Port 8081                                            │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Spring Boot Web Application                             ││
│ │                                                         ││
│ │  POST /auth/signup                                      ││
│ │   ↓                                                     ││
│ │  [1] Spring Security Filter Chain                       ││
│ │   ↓                                                     ││
│ │  [2] AuthController.signup()                           ││
│ │   ↓                                                     ││
│ │  [3] UserService.signup()                              ││
│ │   ↓                                                     ││
│ │  [4] Database: Save user + generate JWT                ││
│ │                                                         ││
│ └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Step 3a: Spring Security Validation

**File:** `backend/auth-service/src/main/java/com/smartbiz/auth/config/SecurityConfig.java`

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(authz -> authz
                .requestMatchers("/auth/**").permitAll()  // ← Allow all /auth paths
                .anyRequest().authenticated()
            )
            .csrf(csrf -> csrf.disable())
            .httpBasic(basic -> basic.disable())
            .sessionManagement(session -> 
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)  // No sessions
            );

        return http.build();
    }
}
```

**What happens:**
- Path `/auth/signup` matches `.requestMatchers("/auth/**").permitAll()` ✅
- No authentication required for this endpoint
- Request continues to the controller

---

### Step 3b: AuthController Handles Request

**File:** `backend/auth-service/src/main/java/com/smartbiz/auth/controller/AuthController.java`

```java
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {
    
    private final UserService userService;

    @PostMapping("/signup")  // ← This method handles signup
    public ResponseEntity<LoginResponse> signup(
        @Valid @RequestBody SignupRequest request  // Validates: email, password, fullName
    ) {
        // Call service to handle business logic
        LoginResponse response = userService.signup(request);
        
        // Return 201 Created with JWT tokens
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
```

**What happens:**
- `@PostMapping("/signup")` matches the incoming request ✅
- Request body is validated (email, password, fullName all required)
- Calls `userService.signup(request)`

---

### Step 3c: UserService Creates User & JWT

**File:** `backend/auth-service/src/main/java/com/smartbiz/auth/service/UserService.java` (simplified)

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {
    
    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public LoginResponse signup(SignupRequest request) {
        // Step 1: Check if user already exists
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new EmailAlreadyRegisteredException("Email already registered");
        }

        // Step 2: Create new User entity
        User user = new User();
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));  // Hash password
        user.setFullName(request.getFullName());
        
        // Step 3: Save to database (PostgreSQL)
        User savedUser = userRepository.save(user);
        
        log.info("User created: id={}, email={}", savedUser.getId(), savedUser.getEmail());

        // Step 4: Generate JWT tokens
        String accessToken = jwtUtil.generateToken(
            savedUser.getId(),           // subject
            savedUser.getEmail(),        // custom claim
            Duration.ofHours(24)         // expires in 24 hours
        );
        
        String refreshToken = jwtUtil.generateRefreshToken(
            savedUser.getId(),
            Duration.ofDays(7)           // expires in 7 days
        );

        // Step 5: Return response
        return new LoginResponse(
            accessToken,      // JWT to use for future requests
            refreshToken,     // JWT to refresh access token when expired
            savedUser.getId(),
            savedUser.getEmail(),
            savedUser.getFullName()
        );
    }
}
```

**What happens in database:**

```sql
-- PostgreSQL (auth_db container)
INSERT INTO users (email, password_hash, full_name, created_at) 
VALUES ('test@test.com', '$2a$12$...hashed...', 'John Doe', NOW());
-- Returns: id = 1

-- Generate JWT
Header: {alg: "HS384"}
Payload: {
  sub: "1",              -- User ID
  email: "test@test.com",
  iat: 1777305627,       -- Issued at
  exp: 1777392027        -- Expires at (24 hours later)
}
Signature: HMAC-SHA384(header.payload, "your-secret-key-...")

-- Result: eyJhbGciOiJIUzM4NCJ9.eyJzdWIiOiIxIi...
```

---

## Step 4: Response Sent Back to Mobile

```
┌─────────────────────────────────────┐
│   Auth Service (8081)               │
│   ↓ Returns response ↓              │
└─────────────────────────────────────┘
          │
          │ HTTP 201 Created
          │ Content-Type: application/json
          │
          ↓
┌─────────────────────────────────────┐
│   API Gateway (8080)                │
│   ↓ Forwards response ↓             │
└─────────────────────────────────────┘
          │
          │ Same HTTP 201 response
          │ (Gateway is transparent)
          ↓
┌─────────────────────────────────────────────────────────┐
│              MOBILE APP (Android/iOS)                   │
│   Receives 201 + JWT tokens                            │
└─────────────────────────────────────────────────────────┘
```

### Response Body

```json
HTTP/1.1 201 Created
Content-Type: application/json
Transfer-Encoding: chunked
Vary: Origin,Access-Control-Request-Method,Access-Control-Request-Headers

{
  "access_token": "eyJhbGciOiJIUzM4NCJ9.eyJzdWIiOiIxIiwiZW1haWwiOiJ0ZXN0QHRlc3QuY29tIiwiaWF0IjoxNzc3MzA1NjI3LCJleHAiOjE3NzczOTIwMjd9.-fginpB2lZGUCfI1Fi-JffF0l64V1FfdbFRYQyWe82NCMyg4Xt6VnRJJpQDivIxO",
  "refresh_token": "eyJhbGciOiJIUzM4NCJ9...",
  "userId": 1,
  "email": "test@test.com",
  "fullName": "John Doe"
}
```

---

## Step 5: Mobile App Stores JWT

### Code: `mobile/contexts/AuthContext.tsx`

```typescript
async function saveSession(data: LoginResponse) {
  const authUser: AuthUser = {
    token: data.access_token,        // JWT token
    userId: data.userId,              // User ID
    email: data.email,
    fullName: data.fullName,
  };
  
  // Store in secure device keychain (encrypted)
  await SecureStore.setItemAsync('token', data.access_token);
  await SecureStore.setItemAsync('userId', String(data.userId));
  await SecureStore.setItemAsync('userInfo', JSON.stringify(authUser));
  
  // Update in-memory state
  setUser(authUser);
}
```

**What happens:**
- JWT token stored in device secure storage (iOS Keychain / Android Keystore)
- Automatically included in ALL future requests via axios interceptor
- App navigates to home screen

---

## Step 6: Future Requests (e.g., Get Products)

When user goes to Inventory tab and tries to load products:

### Code: `mobile/services/inventory.ts`

```typescript
async function getProducts(): Promise<Product[]> {
  // Make request to /inventory/products
  const { data } = await api.get<Product[]>('/inventory/products');
  return data;
}
```

### axios Interceptor (automatic)

```typescript
api.interceptors.request.use(async (config) => {
  // Automatically read token from secure storage
  const token = await SecureStore.getItemAsync('token');
  const userId = await SecureStore.getItemAsync('userId');
  
  // Add headers to request
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (userId) config.headers['X-User-Id'] = userId;
  
  return config;
});
```

### Network Request Sent

```
GET http://10.0.2.2:8080/inventory/products HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzM4NCJ9.eyJzdWIiOiIxIi...
X-User-Id: 1
Content-Type: application/json
```

---

## Step 7: Gateway Validates JWT

### AuthenticationFilter (runs again)

```java
@Override
public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
    String path = request.getURI().getPath();  // "/inventory/products"

    // Step 1: Check if public path
    if (PUBLIC_PATHS.stream().anyMatch(path::startsWith)) {
        // Nope, /inventory/** is NOT in PUBLIC_PATHS
        // Continue to JWT validation
    }

    // Step 2: Get Authorization header
    String authHeader = request.getHeaders().getFirst("Authorization");
    // authHeader = "Bearer eyJhbGci..."

    // Step 3: Extract JWT token
    String token = authHeader.substring(7);  // Remove "Bearer "
    // token = "eyJhbGci..."

    try {
        // Step 4: Validate JWT signature and expiry
        Claims claims = Jwts.parser()
            .verifyWith(getSigningKey())      // Verify signature with secret key
            .build()
            .parseSignedClaims(token)
            .getPayload();

        // Step 5: Extract user ID from token
        Long userId = Long.parseLong(claims.getSubject());  // userId = 1

        // Step 6: Inject X-User-Id header into request
        ServerHttpRequest modifiedRequest = request.mutate()
            .header("X-User-Id", userId.toString())  // Add X-User-Id: 1
            .build();

        // Step 7: Forward request with user ID
        return chain.filter(exchange.mutate().request(modifiedRequest).build());
        
    } catch (JwtException | NumberFormatException e) {
        // JWT invalid or expired
        return unauthorized(exchange.getResponse());  // Return 401
    }
}
```

**What happens:**
- JWT token is validated using the secret key
- User ID `1` is extracted from JWT
- `X-User-Id: 1` header is added
- Request continues to Inventory Service with user context

---

## Step 8: Inventory Service Uses User ID

### Routing (application.yml)

```yaml
- id: inventory-service
  uri: lb://INVENTORY-SERVICE
  predicates:
    - Path=/inventory/**
  filters:
    - StripPrefix=0  # Don't strip /inventory prefix
```

Request continues to: `http://INVENTORY-SERVICE:8082/inventory/products`

### Inventory Controller

**File:** `backend/inventory-service/src/main/java/com/smartbiz/inventory/controller/ProductController.java`

```java
@RestController
@RequestMapping("/inventory/products")
@RequiredArgsConstructor
public class ProductController {
    
    private final ProductService productService;

    @GetMapping
    public ResponseEntity<List<ProductDTO>> getAll(
        @RequestHeader("X-User-Id") Long userId  // ← Gateway injected this
    ) {
        // userId = 1 (from JWT)
        return ResponseEntity.ok(productService.findAll(userId));
    }
}
```

### Product Service (Database Query)

**File:** `backend/inventory-service/src/main/java/com/smartbiz/inventory/service/ProductService.java`

```java
@Service
@RequiredArgsConstructor
public class ProductService {
    
    private final ProductRepository productRepository;

    public List<ProductDTO> findAll(Long userId) {
        // Query database for products belonging to THIS USER ONLY
        List<Product> products = productRepository.findByUserIdOrderByCreatedAtDesc(userId);
        // SQL: SELECT * FROM products WHERE user_id = 1
        
        return products.stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
    }
}
```

**What happens:**
- Only products created by userId=1 are returned
- Other users' products are invisible to this user
- Multi-tenancy is enforced at the database level

---

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           MOBILE APP                                    │
│  POST /auth/signup                                                      │
│  {email, password, fullName}                                            │
│                                                                         │
│  ↓ axios interceptor (adds headers if token exists)                    │
│  ↓ No token yet, so no Authorization or X-User-Id header              │
└──────────────────────────────────┬──────────────────────────────────────┘
                                    │
                                    │ HTTP POST
                                    │ http://10.0.2.2:8080/auth/signup
                                    │
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                        API GATEWAY (Port 8080)                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ AuthenticationFilter (Order: -1)                                 │   │
│  │  ✓ Check if /auth/signup is in PUBLIC_PATHS → YES               │   │
│  │  ✓ Skip JWT validation                                           │   │
│  │  ✓ Continue to next filter                                       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    ↓                                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Route Matching                                                   │   │
│  │  ✓ Path /auth/signup matches route: auth-service               │   │
│  │  ✓ Resolve lb://AUTH-SERVICE → smartbiz-auth:8081             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    ↓                                     │
│                        Forward to AUTH-SERVICE                          │
└──────────────────────────────────┬──────────────────────────────────────┘
                                    │
                                    │ HTTP POST
                                    │ http://smartbiz-auth:8081/auth/signup
                                    │
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    AUTH SERVICE (Port 8081)                             │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Spring Security FilterChain                                      │   │
│  │  ✓ Check if /auth/signup requires auth → NO                    │   │
│  │  ✓ Continue to controller                                        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    ↓                                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ AuthController.signup()                                          │   │
│  │  ✓ Validate request body                                        │   │
│  │  ✓ Call userService.signup()                                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    ↓                                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ UserService.signup()                                             │   │
│  │  ✓ Hash password with BCrypt                                    │   │
│  │  ✓ Save user to PostgreSQL                                      │   │
│  │  ✓ Generate JWT access_token (24hr expiry)                      │   │
│  │  ✓ Generate JWT refresh_token (7 day expiry)                    │   │
│  │  ✓ Return LoginResponse                                          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────┬──────────────────────────────────────┘
                                    │
                                    │ HTTP 201 Created
                                    │ {access_token, refresh_token, userId, ...}
                                    │
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                        API GATEWAY (Port 8080)                          │
│  (Transparent forwarding - just passes response back)                   │
└──────────────────────────────────┬──────────────────────────────────────┘
                                    │
                                    │ HTTP 201 Created
                                    │ {access_token, refresh_token, ...}
                                    │
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                           MOBILE APP                                    │
│  ✓ Receive JWT tokens                                                  │
│  ✓ Store in SecureStore (encrypted)                                    │
│  ✓ Set user state                                                      │
│  ✓ Navigate to home screen                                             │
│                                                                         │
│  Next request (e.g., GET /inventory/products):                         │
│  ↓ axios interceptor (adds headers from SecureStore)                  │
│  ↓ Authorization: Bearer <access_token>                               │
│  ↓ X-User-Id: 1                                                        │
└──────────────────────────────────┬──────────────────────────────────────┘
                                    │
                                    ↓ (Gateway validates JWT again...)
```

---

## Key Takeaways

### 1. **Gateway is a Security Guard**
- Checks JWT on every request (except public paths)
- Extracts user ID from JWT
- Injects `X-User-Id` header so services know who is making the request

### 2. **No JWT = No User ID = No Access**
```
GET /inventory/products (no Authorization header)
    ↓
Gateway: "I don't see a JWT token!"
    ↓
Return 401 Unauthorized
    ↓
Mobile app: Auto-logout user
```

### 3. **User Isolation via X-User-Id**
```
User 1 requests: GET /inventory/products
    ↓
Gateway injects: X-User-Id: 1
    ↓
Inventory Service: SELECT * FROM products WHERE user_id = 1
    ↓
Result: Only User 1's products shown

---

User 2 requests: GET /inventory/products
    ↓
Gateway injects: X-User-Id: 2
    ↓
Inventory Service: SELECT * FROM products WHERE user_id = 2
    ↓
Result: Only User 2's products shown (can't see User 1's products)
```

### 4. **JWT is the Trust Mechanism**
```
JWT = Cryptographically signed token

Only valid if:
  1. Signature is correct (verified using secret key)
  2. Not expired (current time < exp claim)
  3. Subject (user ID) is numeric

If someone forges a JWT:
  Signature won't match → 401 Unauthorized
```

---

## Security in Action

### Scenario: Attacker tries to access another user's products

```
Attacker (User 3) tries:
  GET /inventory/products
  X-User-Id: 1  (forged, trying to impersonate User 1)
  
Gateway checks:
  ✓ Is there Authorization header? YES
  ✓ Is JWT valid? Check signature... Must match secret key
  ✓ When was it issued? From JWT claims
  ✓ Who created it? Only Auth Service knows the secret key
  
Since User 3's JWT was signed with their own user ID:
  JWT payload: {sub: "3", ...}
  
When gateway extracts sub:
  X-User-Id header gets set to: 3 (NOT 1)
  
Attacker's forged header is ignored:
  Authorization: Bearer <User3's_JWT>
  X-User-Id: 3  (← This is what matters, extracted from JWT)
  
Inventory Service queries:
  SELECT * FROM products WHERE user_id = 3
  
Result: Only User 3's products shown (attack failed)
```

---

## Files to Review

If you want to dive deeper, read in this order:

1. **Mobile → Request**
   - `mobile/contexts/AuthContext.tsx` (signup function)
   - `mobile/services/auth.ts` (API call)
   - `mobile/services/api.ts` (axios setup + interceptors)

2. **Gateway → Validation**
   - `backend/api-gateway/src/main/resources/application.yml` (routes + CORS)
   - `backend/api-gateway/src/main/java/com/smartbiz/gateway/filter/AuthenticationFilter.java` (JWT validation)
   - `backend/api-gateway/src/main/java/com/smartbiz/gateway/config/GatewaySecurityConfig.java` (Spring Security config)

3. **Auth Service → JWT Generation**
   - `backend/auth-service/src/main/java/com/smartbiz/auth/controller/AuthController.java` (endpoints)
   - `backend/auth-service/src/main/java/com/smartbiz/auth/service/UserService.java` (signup logic)
   - `backend/auth-service/src/main/java/com/smartbiz/auth/config/JwtUtil.java` (JWT generation)

4. **Other Services → User Isolation**
   - `backend/inventory-service/src/main/java/com/smartbiz/inventory/controller/ProductController.java` (uses X-User-Id)
   - `backend/inventory-service/src/main/java/com/smartbiz/inventory/service/ProductService.java` (queries by user_id)

---

Done! Now you understand exactly how the gateway works. 🚀
