# SmartBiz - Project Context for Claude Code

## Project Overview
Mobile-first business management system for small businesses in Nepal.
**Stack:** React Native + Spring Boot Microservices + PostgreSQL

---

## Core Features
1. **Inventory Management** - Barcode scanning, stock tracking, low-stock alerts
2. **CRM** - Customer management, purchase history, lead tracking
3. **Sales** - POS with auto stock deduction, analytics dashboard
4. **AI Insights** - Claude API chatbot, sales forecasting, reorder suggestions
5. **Unified Inbox** - WhatsApp/Instagram/Facebook messages in one place
6. **Web Dashboard** - React.js analytics and reporting

---

## Backend Architecture - Microservices

### Services (Java Spring Boot 3.2+)
```
API Gateway          :8080   (Spring Cloud Gateway)
Eureka Server        :8761   (Service Discovery)
Auth Service         :8081   (JWT, user management)
Inventory Service    :8082   (Products, stock)
CRM Service          :8083   (Customers)
Sales Service        :8084   (Transactions, analytics)
AI Service           :8085   (Claude API, forecasting)
Messaging Service    :8086   (Unified inbox)
```

### Inter-Service Communication
- Sales → Inventory (check/deduct stock)
- Sales → CRM (update customer totals)
- AI → Sales (fetch data for insights)
- All via REST APIs, discovered through Eureka

---

## Database Schema (PostgreSQL 15+)

### auth_db
```sql
users (id, email, password_hash, full_name, phone, role, created_at, updated_at)
refresh_tokens (id, user_id FK, token, expires_at, created_at)
```

### inventory_db
```sql
products (id, user_id, name, sku, category, price, quantity, reorder_level, 
          supplier, barcode, image_url, created_at, updated_at)
stock_history (id, product_id FK, quantity_change, type, reason, created_by, created_at)
```

### crm_db
```sql
customers (id, user_id, name, phone, email, address, lead_status, notes,
           total_purchases, last_purchase_date, created_at, updated_at)
customer_interactions (id, customer_id FK, interaction_type, notes, created_by, created_at)
```

### sales_db
```sql
sales (id, user_id, customer_id, total_amount, payment_method, status, 
       sale_date, created_by, created_at)
sale_items (id, sale_id FK, product_id, product_name, quantity, unit_price, subtotal)
```

### messaging_db
```sql
messages (id, user_id, customer_id, platform, sender_id, sender_name, 
          content, is_read, message_timestamp, created_at)
```

---

## Key Technical Decisions

**Why Microservices?** College requirement + better separation of concerns

**Why PostgreSQL?** College requirement + relational data fits better than NoSQL

**Why Database-Per-Service?** Data isolation, independent scaling, service autonomy

**Cross-Service References:** Stored as IDs only, fetched via REST when needed

---

## Critical Workflows

### Record Sale Flow
1. Mobile App → API Gateway → Sales Service
2. Sales Service → Inventory Service (check stock availability)
3. Sales Service → Inventory Service (deduct stock atomically)
4. Sales Service → CRM Service (update customer.total_purchases)
5. If stock < reorder_level → Firebase notification
6. Return success to mobile app

### AI Query Flow
1. User asks "What sold most this week?"
2. AI Service → Sales Service (fetch top products)
3. AI Service → Claude API (context + question)
4. AI Service → Mobile App (natural language response)

---

## Project Structure

```
smartbiz/
├── api-gateway/              # Spring Cloud Gateway
├── eureka-server/            # Service Discovery
├── auth-service/             # Auth microservice
│   ├── src/main/java/com/smartbiz/auth/
│   │   ├── controller/       # REST endpoints
│   │   ├── service/          # Business logic
│   │   ├── repository/       # JPA repositories
│   │   ├── model/            # JPA entities
│   │   ├── dto/              # Request/Response objects
│   │   ├── config/           # Security, JWT config
│   │   └── AuthServiceApplication.java
│   ├── src/main/resources/
│   │   ├── application.yml   # Config
│   │   └── db/migration/     # Flyway SQL scripts
│   └── pom.xml
├── inventory-service/        # Same structure
├── crm-service/             # Same structure
├── sales-service/           # Same structure
├── ai-service/              # Same structure
├── messaging-service/       # Same structure
├── mobile-app/              # React Native (Expo)
├── web-dashboard/           # React.js
└── docker-compose.yml       # Local dev environment
```

---

## Spring Boot Common Dependencies

```xml
<!-- Core -->
spring-boot-starter-web
spring-boot-starter-data-jpa
spring-boot-starter-security
spring-boot-starter-validation

<!-- Microservices -->
spring-cloud-starter-netflix-eureka-client

<!-- Database -->
postgresql (driver)
flyway-core (migrations)

<!-- Security -->
io.jsonwebtoken:jjwt-api (JWT)
spring-security-crypto (BCrypt)

<!-- Utils -->
lombok (code generation)
spring-boot-starter-webflux (REST client for inter-service calls)
```

---

## API Gateway Routes

```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: auth-service
          uri: lb://AUTH-SERVICE
          predicates:
            - Path=/auth/**
        - id: inventory-service
          uri: lb://INVENTORY-SERVICE
          predicates:
            - Path=/inventory/**
        - id: crm-service
          uri: lb://CRM-SERVICE
          predicates:
            - Path=/customers/**
        - id: sales-service
          uri: lb://SALES-SERVICE
          predicates:
            - Path=/sales/**
        - id: ai-service
          uri: lb://AI-SERVICE
          predicates:
            - Path=/ai/**
        - id: messaging-service
          uri: lb://MESSAGING-SERVICE
          predicates:
            - Path=/messages/**
```

---

## Sample Entity (Products)

```java
@Entity
@Table(name = "products")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private Long userId;  // Reference to auth service user
    
    @Column(nullable = false)
    private String name;
    
    @Column(unique = true)
    private String sku;
    
    private String category;
    
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;
    
    @Column(nullable = false)
    private Integer quantity;
    
    private Integer reorderLevel;
    
    private String supplier;
    
    @Column(unique = true)
    private String barcode;
    
    private String imageUrl;
    
    @CreationTimestamp
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
```

---

## Sample REST Controller

```java
@RestController
@RequestMapping("/inventory/products")
@RequiredArgsConstructor
public class ProductController {
    private final ProductService productService;
    
    @GetMapping
    public ResponseEntity<List<ProductDTO>> getAllProducts(
        @RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(productService.findByUserId(userId));
    }
    
    @PostMapping
    public ResponseEntity<ProductDTO> createProduct(
        @RequestHeader("X-User-Id") Long userId,
        @Valid @RequestBody CreateProductRequest request) {
        return ResponseEntity.status(201)
            .body(productService.create(userId, request));
    }
    
    @GetMapping("/barcode/{barcode}")
    public ResponseEntity<ProductDTO> findByBarcode(
        @RequestHeader("X-User-Id") Long userId,
        @PathVariable String barcode) {
        return ResponseEntity.ok(
            productService.findByBarcodeAndUserId(barcode, userId));
    }
}
```

---

## Development Environment Setup

```bash
# Prerequisites
Java 17+
Maven 3.8+
PostgreSQL 15+
Docker (optional but recommended)
Node.js 18+ (for React Native/React.js)

# Start databases (Docker Compose)
docker-compose up -d postgres

# Start Eureka Server
cd eureka-server && mvn spring-boot:run

# Start API Gateway
cd api-gateway && mvn spring-boot:run

# Start each microservice
cd auth-service && mvn spring-boot:run
cd inventory-service && mvn spring-boot:run
# ... etc
```

---

## External Dependencies

- **Claude API** (Anthropic) - AI chatbot, forecasting
- **Cloudinary** - Product image storage
- **Firebase** - Push notifications
- **WhatsApp Business API** - Messaging (optional)

---

## Key Constraints

- Solo college project (12 weeks)
- Must use Java Spring Boot + PostgreSQL (college requirement)
- Target: Small businesses in Nepal with smartphones
- Budget: Free tiers only
- Mobile-first design (most users won't have computers)

---

## Non-Negotiables

✅ JWT authentication on all endpoints except /auth/**  
✅ User ID in every request header for multi-tenancy  
✅ Atomic transactions when stock deducted (rollback on failure)  
✅ Database-per-service (no direct DB access across services)  
✅ All inter-service calls via REST (no shared database)  
✅ Flyway migrations for all schema changes  

---

## When Coding, Remember:

1. **Each service is independent** - Don't reference other service's models directly
2. **Use DTOs for API responses** - Never expose JPA entities directly
3. **Validate everything** - Use @Valid and custom validators
4. **User isolation** - Always filter by userId from JWT token
5. **Error handling** - Use @ControllerAdvice for global exception handling
6. **Logging** - Use SLF4J for all log statements
7. **Testing** - Write unit tests for service layer, integration tests for controllers

---

## Quick Reference - Port Numbers

| Service | Port |
|---------|------|
| API Gateway | 8080 |
| Eureka | 8761 |
| Auth | 8081 |
| Inventory | 8082 |
| CRM | 8083 |
| Sales | 8084 |
| AI | 8085 |
| Messaging | 8086 |
| PostgreSQL | 5432 |

---

**This file contains everything Claude Code needs to understand the project architecture and help you build it efficiently.**
