# SmartBiz

Mobile-first business management system for small businesses in Nepal.
Built as a college Final Year Project.

**Stack:** Java 21 + Spring Boot 3.4.5 microservices · PostgreSQL 15 · React Native (Expo) · TypeScript

---

## What's Built

| Component | Status | Notes |
|-----------|--------|-------|
| Auth Service (8081) | Done | JWT login/signup, BCrypt, refresh tokens |
| Inventory Service (8082) | Done | Product CRUD, stock tracking, multi-tenant |
| Sales Service (8084) | Done | Record sales, deduct stock atomically |
| CRM Service (8083) | Done | Customer management |
| API Gateway (8080) | Done | JWT auth filter, Eureka routing |
| Eureka Server (8761) | Done | Service discovery |
| Mobile App | Done | Onboarding, Dashboard, Inventory, POS, Settings |
| Web Dashboard | Phase 2 | Next.js, not started |

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Java | 21 | [adoptium.net](https://adoptium.net) |
| Maven | 3.9+ | [maven.apache.org](https://maven.apache.org) |
| Docker Desktop | Latest | [docker.com](https://docker.com) |
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| Expo CLI | Latest | `npm install -g expo-cli` |

---

## Quick Start

### Cloudinary product-image setup

Product images are optional. Product CRUD continues to work when Cloudinary is disabled.

1. In the Cloudinary Console, create a **signed** upload preset named `smartbiz_product_images`.
2. Restrict it to images, allow JPEG/PNG/WebP/HEIC, set a 5 MB maximum, and add an incoming `limit` transformation capped at 1600Ã—1600 with automatic quality.
3. Add these backend-only values to the root `.env` file:

```text
CLOUDINARY_ENABLED=true
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CLOUDINARY_UPLOAD_PRESET=smartbiz_product_images
```

Never add `CLOUDINARY_API_SECRET` to `mobile/.env` or `frontend/web/.env.local`. The clients receive only a short-lived signed upload request from inventory-service.

### 1. Clone the repo

```bash
git clone https://github.com/sanskarkayastha/smartbiz.git
cd smartbiz
```

### 2. Start PostgreSQL

```bash
docker run --name smartbiz-postgres \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  -d postgres:15
```

Create the databases (run once):

```bash
docker exec -it smartbiz-postgres psql -U postgres -c "
CREATE DATABASE auth_db;
CREATE DATABASE inventory_db;
CREATE DATABASE sales_db;
CREATE DATABASE crm_db;
"
```

### 3. Start backend services

Open **6 terminal tabs**, one per service. Start them in this exact order:

**Tab 1 — Eureka (service discovery)**
```bash
cd backend/eureka-server
mvn spring-boot:run
# Wait until: Started EurekaServerApplication on port 8761
```

**Tab 2 — API Gateway**
```bash
cd backend/api-gateway
mvn spring-boot:run
# Wait until: Started ApiGatewayApplication on port 8080
```

**Tab 3 — Auth Service**
```bash
cd backend/auth-service
mvn spring-boot:run
# Flyway will auto-create users and refresh_tokens tables
```

**Tab 4 — Inventory Service**
```bash
cd backend/inventory-service
mvn spring-boot:run
# Flyway will auto-create products and stock_history tables
```

**Tab 5 — Sales Service**
```bash
cd backend/sales-service
mvn spring-boot:run
# Flyway will auto-create sales and sale_items tables
```

**Tab 6 — CRM Service**
```bash
cd backend/crm-service
mvn spring-boot:run
# Flyway will auto-create customers table
```

Verify all services registered at: http://localhost:8761

### 4. Test the backend (smoke test)

```bash
# Register a user
curl -s -X POST http://localhost:8080/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"pass123","fullName":"Test User"}' | jq .

# Copy the access_token from the response, then:
TOKEN="paste-your-token-here"

# Create a product
curl -s -X POST http://localhost:8080/inventory/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Wai Wai Noodles","price":25,"quantity":100,"reorderLevel":10}' | jq .

# List products
curl -s http://localhost:8080/inventory/products \
  -H "Authorization: Bearer $TOKEN" | jq .

# Record a sale (use the product id from above)
curl -s -X POST http://localhost:8080/sales \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"items":[{"productId":1,"quantity":3}],"paymentMethod":"CASH"}' | jq .

# Check today's analytics
curl -s http://localhost:8080/sales/analytics/today \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### 5. Start the mobile app

```bash
cd mobile
npm install
npx expo start --android   # Android emulator
# or
npx expo start --ios       # iOS simulator
# or
npx expo start             # Expo Go on physical device
```

**Environment:** The default API URL is `http://10.0.2.2:8080` which routes to your host machine from the Android emulator.

For a **physical device**, set your machine's LAN IP in `mobile/.env`:
```
EXPO_PUBLIC_API_URL=http://192.168.1.X:8080
```

---

## API Reference

All endpoints (except `/auth/**`) require:
- `Authorization: Bearer <token>` header
- `X-User-Id: <userId>` header (injected automatically by the API Gateway)

### Auth Service — `/auth`
| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/auth/signup` | `{email, password, fullName}` | Register |
| POST | `/auth/login` | `{email, password}` | Login → returns JWT |

### Inventory Service — `/inventory`
| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/inventory/products` | — | List user's products |
| GET | `/inventory/products/{id}` | — | Get product |
| GET | `/inventory/products/low-stock` | — | Products at/below reorder level |
| POST | `/inventory/products` | `{name, price, quantity, ...}` | Create product |
| PUT | `/inventory/products/{id}` | partial fields | Update product |
| POST | `/inventory/products/{id}/stock` | `{quantityChange, type, reason}` | Adjust stock |
| DELETE | `/inventory/products/{id}` | — | Delete product |

### Sales Service — `/sales`
| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/sales` | `{items:[{productId,quantity}], paymentMethod}` | Record sale (deducts stock) |
| GET | `/sales` | — | List user's sales |
| GET | `/sales/{id}` | — | Get sale with items |
| GET | `/sales/analytics/today` | — | Daily summary (revenue, orders, avg) |

### CRM Service — `/customers`
| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/customers` | — | List user's customers |
| POST | `/customers` | `{name, phone, email, address}` | Create customer |
| GET | `/customers/{id}` | — | Get customer |
| PUT | `/customers/{id}` | partial fields | Update customer |

---

## Running Tests

```bash
# Auth Service tests
cd backend/auth-service && mvn test

# Inventory Service tests
cd backend/inventory-service && mvn test

# Sales Service tests
cd backend/sales-service && mvn test

# All at once from root backend folder
cd backend && mvn test
```

---

## Project Structure

```
smartbiz/
├── backend/
│   ├── api-gateway/          # JWT auth filter + routing (port 8080)
│   ├── eureka-server/        # Service discovery (port 8761)
│   ├── auth-service/         # Login, signup, JWT (port 8081)
│   ├── inventory-service/    # Products, stock (port 8082)
│   ├── crm-service/          # Customers (port 8083)
│   ├── sales-service/        # Transactions, analytics (port 8084)
│   ├── ai-service/           # [Phase 2] Claude API integration
│   └── messaging-service/    # [Phase 2] Unified inbox
├── mobile/                   # Expo / React Native app
│   ├── app/                  # Screens (file-based routing)
│   │   ├── (tabs)/           # Home, Inventory, Sales, Settings
│   │   ├── onboarding.tsx    # Welcome screen
│   │   ├── login.tsx         # Login screen
│   │   ├── register.tsx      # Register screen
│   │   └── add-product.tsx   # Add product modal
│   ├── components/ui/        # Shared UI components
│   ├── contexts/             # AuthContext (JWT + SecureStore)
│   └── services/             # API service layer (axios)
├── frontend/web/             # [Phase 2] Next.js dashboard
├── CLAUDE.md                 # Claude Code instructions
├── DECISIONS.md              # Architecture decisions + why
└── PROJECT_CONTEXT.md        # Full architecture reference
```

---

## Key Architecture Decisions

- **JWT auth at Gateway only** — The API Gateway validates the JWT and injects `X-User-Id`. Downstream services trust this header without re-validating. See `DECISIONS.md` for why.
- **Database per service** — Each service has its own PostgreSQL database. No shared tables, no cross-service JPA relationships.
- **Atomic sale flow** — When a sale is created, stock is checked first, then the sale is saved, then stock is deducted. `@Transactional` ensures the DB write rolls back if deduction fails.
- **Flyway migrations** — All schema changes go through Flyway (`db/migration/V*.sql`). Never modify existing migration files; always create new ones.

---

## Troubleshooting

**Service won't start**
- Check PostgreSQL is running: `docker ps | grep postgres`
- Check Eureka is up before starting other services: http://localhost:8761
- Check port not already in use: `netstat -an | grep 8081` (Windows) or `lsof -i :8081` (Mac/Linux)

**Mobile can't reach backend**
- Android emulator: use `10.0.2.2` (maps to host localhost), not `localhost`
- Physical device: use your machine's LAN IP in `mobile/.env`
- Verify all 6 backend services appear in Eureka dashboard

**Flyway migration failed**
- Delete and recreate the database, then restart the service
- Never edit existing `V*.sql` files — create a new `V2__*.sql` instead

**401 Unauthorized from API**
- Token expired (24h TTL) — log in again to get a new token
- Missing `Authorization: Bearer` prefix on the header
