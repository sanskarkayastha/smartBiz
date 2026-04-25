# SmartBiz Backend - Microservices

Multi-module Spring Boot 4.0.6 backend with 8 microservices.

## Services

| Service | Port | Purpose |
|---------|------|---------|
| **Eureka Server** | 8761 | Service discovery and registration |
| **API Gateway** | 8080 | Route incoming requests to services |
| **Auth Service** | 8081 | User authentication and JWT tokens |
| **Inventory Service** | 8082 | Products and stock management |
| **CRM Service** | 8083 | Customer relationship management |
| **Sales Service** | 8084 | Sales transactions and POS |
| **AI Service** | 8085 | Claude API integration (Phase 2) |
| **Messaging Service** | 8086 | Unified inbox (Phase 2) |

## Prerequisites

- Java 21+
- Maven 3.8+
- PostgreSQL 15+ (via Docker or local)
- Docker & Docker Compose (optional, for local dev)

## Local Development Setup

### 1. Start PostgreSQL (Docker)

```bash
# From project root
docker-compose up -d postgres

# Wait for postgres to be ready
docker-compose ps
```

This creates 6 databases: `auth_db`, `inventory_db`, `crm_db`, `sales_db`, `messaging_db`, `ai_db`

### 2. Build All Services

```bash
cd backend
mvn clean install
```

This builds all modules and runs unit tests.

### 3. Start Services (in separate terminals or in order)

**Terminal 1 - Eureka Server:**
```bash
cd backend/eureka-server
mvn spring-boot:run
# Access at http://localhost:8761
```

**Terminal 2 - API Gateway:**
```bash
cd backend/api-gateway
mvn spring-boot:run
# Gateway ready at http://localhost:8080
```

**Terminal 3 - Auth Service:**
```bash
cd backend/auth-service
mvn spring-boot:run
```

**Terminal 4 - Inventory Service:**
```bash
cd backend/inventory-service
mvn spring-boot:run
```

**Terminal 5 - CRM Service:**
```bash
cd backend/crm-service
mvn spring-boot:run
```

**Terminal 6 - Sales Service:**
```bash
cd backend/sales-service
mvn spring-boot:run
```

## Common Commands

### Build specific service
```bash
cd backend/{service-name}
mvn clean install
```

### Run specific service
```bash
cd backend/{service-name}
mvn spring-boot:run
```

### Run tests
```bash
# All tests
mvn test

# Single service
cd backend/{service-name}
mvn test

# Single test class
mvn test -Dtest=UserServiceTest

# Single test method
mvn test -Dtest=UserServiceTest#testCreateUser
```

### View service logs
```bash
cd backend/{service-name}
mvn spring-boot:run
# Logs print to console
```

## Project Structure

Each service follows this structure:
```
{service-name}/
├── src/main/java/com/smartbiz/{service-name}/
│   ├── controller/      # REST endpoints
│   ├── service/         # Business logic
│   ├── repository/      # JPA repositories
│   ├── model/           # JPA entities
│   ├── dto/             # Request/Response DTOs
│   └── config/          # Configuration classes
├── src/main/resources/
│   ├── application.yml  # Spring configuration
│   └── db/migration/    # Flyway SQL migrations
├── src/test/            # Unit & integration tests
└── pom.xml              # Maven dependencies
```

## Database Migrations

Migrations run automatically on service startup via Flyway.

**Location:** `src/main/resources/db/migration/`

**Naming convention:** `V{number}__{description}.sql`
- V1__Init.sql (initial schema)
- V2__AddUserColumn.sql (add column)
- V3__CreateIndexes.sql (optimizations)

Never modify existing migration files. Create new ones for any changes.

## Key Architecture Principles

✅ **Multi-tenancy** — All queries filtered by `userId` from JWT token  
✅ **Atomic transactions** — Stock deduction rolls back if any step fails  
✅ **Database-per-service** — Each service has its own PostgreSQL database  
✅ **Service discovery** — All services register with Eureka  
✅ **REST communication** — Services call each other via REST APIs  
✅ **DTOs** — All API responses use DTOs (not JPA entities)  
✅ **JWT authentication** — API Gateway validates tokens, passes userId in header  

## Testing

### Unit Tests
Test business logic in the service layer:
```bash
cd backend/auth-service
mvn test -Dtest=UserServiceTest
```

### Integration Tests
Test full controller → service → database flow:
```bash
cd backend/auth-service
mvn test -Dtest=UserControllerTest
```

### Critical Path Tests
Test cross-service workflows (e.g., record sale):
```bash
cd backend/sales-service
mvn test -Dtest=RecordSaleIntegrationTest
```

## API Gateway Routes

All external requests go through the API Gateway at `http://localhost:8080`.

| Path | Service | Port |
|------|---------|------|
| `/auth/**` | Auth Service | 8081 |
| `/inventory/**` | Inventory Service | 8082 |
| `/customers/**` | CRM Service | 8083 |
| `/sales/**` | Sales Service | 8084 |
| `/ai/**` | AI Service | 8085 |
| `/messages/**` | Messaging Service | 8086 |

Example:
```bash
# Mobile calls API Gateway
POST http://localhost:8080/auth/login
# Gateway forwards to Auth Service at http://INVENTORY-SERVICE:8082/auth/login
```

## Troubleshooting

### Port already in use
```bash
# Find process on port
lsof -i :8081

# Kill it
kill -9 <PID>

# Or change port in application.yml
```

### PostgreSQL connection refused
```bash
# Ensure postgres is running
docker-compose ps

# Start if not running
docker-compose up -d postgres

# Wait 10s for postgres to be ready
sleep 10
```

### Eureka server not found
```bash
# Ensure Eureka server is running first
cd backend/eureka-server
mvn spring-boot:run

# Other services need Eureka to register
```

### Migrations failed
```bash
# Check logs
mvn spring-boot:run 2>&1 | grep -i flyway

# If corrupted, drop and recreate DB
docker-compose down -v
docker-compose up -d postgres
```

## Next Steps

1. ✅ Create base microservices structure
2. ➜ Implement Auth Service endpoints (login, signup)
3. ➜ Implement Inventory Service endpoints (CRUD products)
4. ➜ Implement Sales Service with inter-service calls
5. ➜ Implement CRM Service
6. ➜ Write integration tests
7. ➜ Connect mobile app to API Gateway

---

**Reference:** See `CLAUDE.md` in project root for development guidelines and patterns.
