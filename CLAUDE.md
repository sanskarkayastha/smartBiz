# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**SmartBiz** is a mobile-first business management system for small businesses in Nepal. It's a college project (12 weeks, solo) with a strict constraint: **must use Java Spring Boot + PostgreSQL**.

**Stack:**
- Backend: Java Spring Boot 3.2+ Microservices (6 services)
- Mobile: React Native (Expo) with TypeScript
- Web Dashboard: React.js (Phase 2)
- Database: PostgreSQL 15+ with Flyway migrations
- Service Discovery: Eureka + Spring Cloud Gateway

**Current Status:** Mobile app scaffolded (onboarding + tab layout). Backend microservices not yet started.

---

## MVP Scope

The viable MVP prioritizes these 3 core services + mobile + infrastructure:
1. **Auth Service** - JWT login/signup (gates everything)
2. **Inventory Service** - Product CRUD + stock management
3. **Sales Service** - Record sales, deduct stock atomically, basic analytics
4. **CRM Service** - Customer management (nice-to-have but important)
5. **Mobile App** - Login → Inventory → POS → Customer screens
6. **Infrastructure** - Eureka, API Gateway, Docker Compose, PostgreSQL

**Out of scope for MVP (Phase 2):**
- AI Insights (complex)
- Unified Inbox/Messaging (requires external APIs)
- Web Dashboard
- Barcode scanning (nice-to-have)
- Firebase notifications

See `PROJECT_CONTEXT.md` for full architecture details.

---

## Critical Workflows & Constraints

### Record Sale Flow (Most Complex)
```
Mobile App → API Gateway → Sales Service
  → Inventory Service (check/deduct stock atomically)
  → CRM Service (update customer total_purchases)
  → Return success or rollback if stock insufficient
```

**Non-Negotiables:**
- ✅ JWT auth on all endpoints (except /auth/**)
- ✅ User ID in request header (X-User-Id) for multi-tenancy
- ✅ **Atomic transactions** when stock deducted (rollback on failure) — this is critical
- ✅ Database-per-service (no direct cross-service DB access)
- ✅ All inter-service calls via REST APIs
- ✅ Flyway migrations for all schema changes
- ✅ DTOs for all API responses (never expose JPA entities)

---

## Directory Structure

```
smartbiz/
├── PROJECT_CONTEXT.md          # Full architecture + schema docs
├── CLAUDE.md                   # This file
├── mobile/                     # Expo/React Native app
│   ├── app/                    # File-based routing (expo-router)
│   │   ├── (tabs)/             # Main tab screens
│   │   │   ├── index.tsx       # Home screen
│   │   │   ├── inventory.tsx   # Inventory management
│   │   │   ├── sales.tsx       # POS screen
│   │   │   ├── settings.tsx    # Settings
│   │   │   └── _layout.tsx     # Tab navigator
│   │   ├── onboarding.tsx      # Login/signup (entry point)
│   │   └── _layout.tsx         # Root layout
│   ├── components/             # Reusable UI components
│   ├── assets/                 # Images, fonts
│   ├── package.json            # Dependencies
│   └── README.md               # Expo setup guide
├── backend/                    # [To be built] Microservices
│   ├── eureka-server/          # Service discovery
│   ├── api-gateway/            # Spring Cloud Gateway
│   ├── auth-service/           # JWT + user management
│   ├── inventory-service/      # Products + stock
│   ├── crm-service/            # Customers
│   ├── sales-service/          # Transactions + analytics
│   ├── ai-service/             # [Phase 2] Claude API integration
│   └── messaging-service/      # [Phase 2] Unified inbox
└── frontend/                   # [Phase 2] React.js dashboard
    └── web/
```

---

## Mobile App Development

### Setup
```bash
cd mobile
npm install
npx expo start
```

### Run Commands
```bash
npx expo start                  # Start dev server
npx expo start --android        # Android emulator
npx expo start --ios            # iOS simulator
npx expo start --web            # Web browser
npm run lint                    # ESLint check
```

### Navigation Structure
- **Expo Router** (file-based routing)
- Entry: `app/_layout.tsx` → `app/onboarding.tsx` (login) or `app/(tabs)/_layout.tsx` (main)
- Tab navigation: `app/(tabs)/_layout.tsx` manages the 4 tabs

### Key Dependencies
- `expo-router` - File-based routing
- `@react-navigation/*` - Navigation primitives
- `@expo/vector-icons` - Icon library
- `expo-image` - Optimized image component
- TypeScript for type safety

### Development Notes
- **No backend connected yet** - screens are UI-only placeholders
- When implementing screens, add API calls via REST client (fetch or axios)
- All API calls must include `X-User-Id` header and JWT token in Authorization header
- Use environment variables (via app.json) for API Gateway URL

---

## Backend Microservices

### Setup & Build
```bash
cd backend/{service-name}
mvn clean install              # Build service + run tests
mvn spring-boot:run            # Run service locally
```

### Service Architecture
Each service follows this structure:
```
auth-service/
├── src/main/java/com/smartbiz/auth/
│   ├── controller/             # REST endpoints
│   ├── service/                # Business logic
│   ├── repository/             # JPA repositories (Spring Data)
│   ├── model/                  # JPA entities
│   ├── dto/                    # Request/response DTOs
│   ├── config/                 # Security, JWT config
│   └── AuthServiceApplication.java
├── src/main/resources/
│   ├── application.yml         # Spring config (port, DB, Eureka)
│   └── db/migration/           # Flyway SQL migration scripts
├── src/test/                   # Unit + integration tests
└── pom.xml                     # Maven dependencies
```

### Ports (Reference)
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

### Database Setup
```bash
# Start PostgreSQL (requires Docker)
docker-compose up -d postgres

# Each service has its own database:
# auth_db, inventory_db, crm_db, sales_db, messaging_db
# Migrations run automatically via Flyway on service startup
```

### Building a New Service
1. **Create pom.xml** with standard dependencies (Spring Boot, JPA, PostgreSQL, Flyway, JWT)
2. **Create application.yml** with port, database config, Eureka client config
3. **Create Flyway migration** in `src/main/resources/db/migration/V1__Init.sql`
4. **Create JPA entities** in `model/` package
5. **Create DTOs** (request/response objects) in `dto/` package
6. **Create repositories** (Spring Data JPA) in `repository/` package
7. **Create service layer** (business logic) in `service/` package
8. **Create REST controllers** in `controller/` package
9. **Add exception handling** via `@ControllerAdvice` (global error handler)
10. **Write tests** (unit tests for services, integration tests for controllers)

### Common Maven Commands
```bash
mvn clean install              # Build + run tests
mvn spring-boot:run            # Run service
mvn test                       # Run tests only
mvn test -Dtest=UserServiceTest  # Run single test class
mvn test -Dtest=UserServiceTest#testCreateUser  # Run single test method
```

### Key Dependencies
```xml
<!-- Spring Boot -->
spring-boot-starter-web         # REST APIs
spring-boot-starter-data-jpa    # Database access
spring-boot-starter-security    # Security
spring-boot-starter-validation  # @Valid annotations

<!-- Microservices -->
spring-cloud-starter-netflix-eureka-client   # Service discovery
spring-cloud-starter-config                  # External config

<!-- Database -->
postgresql (driver)
flyway-core (schema migrations)

<!-- Security -->
jjwt (JWT tokens)
spring-security-crypto (BCrypt hashing)

<!-- Utils -->
lombok (reduce boilerplate)
```

---

## Key Patterns & Guidelines

### Authentication & User Isolation
- **Entry point:** API Gateway extracts JWT token, passes `X-User-Id` header to all services
- **Each service validates** `X-User-Id` header exists and matches JWT subject
- **Every query** must filter by userId: `findByUserIdAndProductId(userId, productId)`
- **No cross-user data leaks** — this is critical for multi-tenancy

### Inter-Service Communication
```java
// Example: Sales Service calls Inventory Service to check stock
RestTemplate restTemplate = new RestTemplate();
String inventoryUrl = "http://INVENTORY-SERVICE:8082/inventory/products/{id}";
ProductDTO product = restTemplate.getForObject(inventoryUrl, ProductDTO.class, productId);
```

- Use Eureka service names (e.g., `INVENTORY-SERVICE`) not hardcoded IPs
- Always wrap in try-catch; handle service unavailability gracefully
- Timeout after 5s to avoid cascading failures

### Database Transactions
- Use `@Transactional` for operations that need atomicity
- When Sales Service deducts stock, entire operation (update sales + update inventory) must roll back if either fails
- Test with `@DataJpaTest` + `@Transactional` for unit tests

### Testing
```bash
# Unit tests (test service layer)
mvn test -Dtest=ProductServiceTest

# Integration tests (test controllers + full flow)
mvn test -Dtest=ProductControllerTest

# Run all tests
mvn test
```

Write tests for:
1. **Service layer** - business logic (unit tests)
2. **Controllers** - API endpoints (integration tests with `@SpringBootTest`)
3. **Critical workflows** - record sale, stock deduction (integration tests)

### Error Handling
Use `@ControllerAdvice` for global exception handler:
```java
@ControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(EntityNotFoundException e) {
        return ResponseEntity.status(404).body(new ErrorResponse(e.getMessage()));
    }
}
```

### Logging
Use SLF4J with Logback (auto-configured by Spring Boot):
```java
private static final Logger log = LoggerFactory.getLogger(ProductService.class);
log.info("Creating product: {}", productName);
log.error("Failed to create product", e);
```

---

## Database Schema Strategy

- **Flyway migrations** in `src/main/resources/db/migration/`
- Naming: `V1__Init.sql`, `V2__AddUserConstraint.sql`
- Run automatically on service startup
- **Never modify** old migration files; create new ones for changes
- Example migration:
```sql
-- V1__Init.sql
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100) UNIQUE,
  price DECIMAL(10, 2) NOT NULL,
  quantity INTEGER NOT NULL,
  reorder_level INTEGER,
  barcode VARCHAR(100) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Docker & Local Development

### Docker Compose
```bash
# Start all services locally
docker-compose up -d

# Stop all
docker-compose down

# View logs
docker-compose logs -f postgres
docker-compose logs -f eureka-server
```

Expected `docker-compose.yml`:
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

---

## Workflow: Adding a New Feature

### Example: Add "Reorder Now" button for low-stock products

1. **Backend:**
   - Inventory Service: Add `POST /inventory/products/{id}/reorder` endpoint
   - Flyway migration (if needed for schema)
   - Unit test for service logic
   - Integration test for controller

2. **Mobile:**
   - Add button to inventory screen
   - Call API with `X-User-Id` + JWT token
   - Handle success/error responses
   - Add loading state

3. **Test:**
   - Start backend: `cd backend/inventory-service && mvn spring-boot:run`
   - Start mobile: `cd mobile && npx expo start`
   - Test on Android/iOS emulator

4. **Commit:**
   ```bash
   git add .
   git commit -m "Add reorder feature for low-stock products"
   ```

---

## Development Checklist for Each Service

Before marking a service "done":
- [ ] Flyway migrations in place
- [ ] JPA entities created
- [ ] DTOs for all API responses (no entity exposure)
- [ ] REST controllers with endpoints documented
- [ ] Service layer with business logic
- [ ] `@ControllerAdvice` global exception handler
- [ ] User isolation (all queries filtered by userId)
- [ ] Unit tests for service layer
- [ ] Integration tests for controllers
- [ ] Registers with Eureka (`spring.application.name`, `eureka.client.service-url`)
- [ ] application.yml configured (port, DB, JWT secret)
- [ ] README.md with curl examples for endpoints

---

## Next Steps (MVP Priority)

1. **Backend Setup** (Week 1-2)
   - Create Eureka Server, API Gateway, Auth Service
   - Implement JWT token generation
   - Test with curl before mobile integration

2. **Core Services** (Week 3-5)
   - Inventory Service (products, stock)
   - Sales Service (record sale, deduct stock)
   - CRM Service (customers)

3. **Mobile Integration** (Week 6-8)
   - Connect login screen to Auth Service
   - Implement inventory screens (list, add, edit)
   - Implement POS screen (record sale)
   - Implement customer screens

4. **Testing & Polish** (Week 9-12)
   - Integration tests for critical workflows
   - Docker Compose setup
   - Bug fixes and performance tuning

---

## Debugging Tips

### Backend Service Won't Start
```bash
# Check logs
mvn spring-boot:run 2>&1 | grep -i "error\|exception"

# Common issues:
# - Port already in use: lsof -i :8081 (or use different port in application.yml)
# - DB not running: docker-compose up -d postgres
# - Eureka not available: start eureka-server first
```

### Mobile App Not Connecting to Backend
- Check `X-User-Id` header is sent
- Check JWT token is in `Authorization: Bearer {token}` header
- Check API Gateway is running on port 8080
- Check mobile app is configured with correct API URL (via environment variable)

### Flyway Migration Failed
- Migrations run on startup; clear DB if schema corrupted
- Avoid modifying existing migration files; create new ones
- Run migrations manually: `mvn clean install` (forces re-run)

---

## References

- **PROJECT_CONTEXT.md** - Full architecture, database schema, REST examples
- **Mobile README.md** - Expo-specific setup guide
- **Spring Boot Docs** - https://spring.io/projects/spring-boot
- **Expo Docs** - https://docs.expo.dev
- **Flyway Docs** - https://flywaydb.org
