# SmartBiz — Project Context

## Project Overview
Mobile-first business management system for small businesses in Nepal.
**Stack:** React Native (Expo) + Java Spring Boot Microservices + PostgreSQL (Neon cloud)

---

## Current Status
**MVP is complete and running.** All 6 backend services are deployed via Docker Compose. The mobile app has 8 fully connected tabs. The web dashboard has inventory and suppliers pages.

---

## Core Features

| Feature | Status | Notes |
|---------|--------|-------|
| Auth (signup/login/profile) | ✅ Live | JWT, BCrypt, profile update |
| Inventory (products + stock) | ✅ Live | CRUD, supplier auto-create |
| Suppliers | ✅ Live | Auto-created on product save |
| Sales (POS + analytics) | ✅ Live | Atomic stock deduction, weekly chart |
| CRM — Customers | ✅ Live | Expandable cards, purchase history |
| CRM — Leads | ✅ Live | 5-stage pipeline, convert to customer |
| AI Insights | ✅ Live | Gemini API chatbot |
| Web Dashboard | 🔄 Partial | Inventory + Suppliers only |
| Messaging / Unified Inbox | ⬜ Phase 2 | WhatsApp/Instagram |
| Push Notifications | ⬜ Phase 2 | Firebase |

---

## Backend Architecture — Microservices

### Active Services
```
API Gateway          :8080   Spring Cloud Gateway — routes all traffic
Eureka Server        :8761   Service Discovery
Auth Service         :8081   JWT login/signup/profile
Inventory Service    :8082   Products, stock, suppliers
CRM Service          :8083   Customers + Leads (pipeline)
Sales Service        :8084   POS transactions, analytics
AI Service           :8085   Gemini API chatbot
```

### Phase 2 (not yet active)
```
Messaging Service    :8086   Unified inbox (WhatsApp/Instagram/Facebook)
```

### Inter-Service Communication
- Sales → Inventory: check stock availability + deduct stock atomically
- Sales → CRM: update customer.total_purchases after sale
- AI → Sales: fetch data for insights
- CRM → CRM: LeadService calls CustomerRepository directly (same service/DB)
- All via REST, discovered through Eureka

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
            - Path=/customers/**,/leads/**    # both customer + lead endpoints

        - id: sales-service
          uri: lb://SALES-SERVICE
          predicates:
            - Path=/sales/**

        - id: ai-service
          uri: lb://AI-SERVICE
          predicates:
            - Path=/ai/**
```

**Rule:** When adding a new path to an existing service, update both the gateway predicate AND the service's `SecurityConfig.java` permitAll list.

---

## Database Schema (PostgreSQL — Neon Cloud)

### auth_db
```sql
users (id, email, password_hash, full_name, phone, role, created_at, updated_at)
refresh_tokens (id, user_id FK, token, expires_at, created_at)
```

### inventory_db
```sql
products (id, user_id, name, sku, category, price, cost_price, quantity,
          reorder_level, supplier_id FK, barcode, image_url, created_at, updated_at)

suppliers (id, user_id, name, contact_person, phone, email, address,
           total_owed, created_at, updated_at)

stock_history (id, product_id FK, quantity_change, type, reason, created_by, created_at)
```

### crm_db
```sql
customers (id, user_id, name, phone, email, address, lead_status, notes,
           total_purchases, due_amount, last_purchase_date, created_at, updated_at)

customer_interactions (id, customer_id FK, interaction_type, notes, created_by, created_at)

leads (id, user_id, name, phone, email,
       stage VARCHAR(50) DEFAULT 'NEW',     -- NEW|CONTACTED|INTERESTED|PROPOSAL|WON|LOST
       source VARCHAR(50),                  -- WALK_IN|REFERRAL|SOCIAL_MEDIA|PHONE_CALL|ONLINE|OTHER
       estimated_value DECIMAL(12,2),
       notes TEXT,
       follow_up_date DATE,
       created_at, updated_at)
```

### sales_db
```sql
sales (id, user_id, customer_id, customer_name, total_amount, payment_method,
       status, sale_date, created_at)

sale_items (id, sale_id FK, product_id, product_name, quantity, unit_price, subtotal)
```

### Flyway migration versions per service
| Service | Migrations |
|---------|-----------|
| auth-service | V1__Init |
| inventory-service | V1__Init, V2__Add_Suppliers |
| crm-service | V1__Init, V2__Add_Due_Amount, V3__Create_Leads_Table |
| sales-service | V1__Init |

---

## Mobile App — Tab Structure (8 tabs)

```
app/(tabs)/
├── index.tsx       Home       — summary cards + live weekly revenue chart
├── inventory.tsx   Inventory  — product list, search, add/edit/delete
├── suppliers.tsx   Suppliers  — supplier list, edit, balance badge
├── sales.tsx       Sales      — POS cart + payment method + history tab
├── customers.tsx   Customers  — expandable accordion cards, purchase history modal
├── leads.tsx       Leads      — pipeline with stage filter, expandable cards,
│                               stage stepper arrows, convert→customer
├── ai.tsx          AI         — Gemini chatbot
└── settings.tsx    Settings   — profile edit (name/phone)
```

### API Service Layer (`mobile/services/`)
| File | Endpoints |
|------|-----------|
| `api.ts` | Axios base — JWT + X-User-Id interceptors |
| `auth.ts` | login, register, updateProfile |
| `inventory.ts` | products CRUD |
| `suppliers.ts` | suppliers list + update |
| `sales.ts` | createSale, getSales, getDailySummary, getWeeklySummary |
| `customers.ts` | customers CRUD, getCustomersWithDue |
| `leads.ts` | leads CRUD, convertToCustomer |
| `ai.ts` | chat endpoint |

---

## CRM Service — Leads API

### Lead pipeline stages (ordered)
```
NEW → CONTACTED → INTERESTED → PROPOSAL → WON
                                           ↓
                                        (convert to Customer, lead deleted)
LOST  ← reachable from any stage via edit
```

### REST Endpoints
```
GET    /leads                 List all leads for user (sorted by createdAt desc)
GET    /leads/{id}            Get single lead
POST   /leads                 Create lead (name required, stage defaults to NEW)
PUT    /leads/{id}            Update lead (all fields optional — partial update)
DELETE /leads/{id}            Delete lead
POST   /leads/{id}/convert    Convert WON lead → Customer record, delete lead
```

### Lead source values
`WALK_IN | REFERRAL | SOCIAL_MEDIA | PHONE_CALL | ONLINE | OTHER`

---

## Key Technical Decisions

**Why Microservices?** College requirement + better separation of concerns

**Why PostgreSQL?** College requirement + relational data fits better than NoSQL

**Why Neon (cloud Postgres)?** Free tier, no local Docker DB needed, accessible from any device

**Why Database-Per-Service?** Data isolation, independent scaling, service autonomy

**Cross-Service References:** Stored as IDs only (e.g., `customer_id` in sales table), fetched via REST when needed

**Leads in CRM service (not separate service):** Leads are pre-customer pipeline data — same bounded context as customers. `LeadService.convertToCustomer()` directly calls `CrmService.create()` and `CustomerRepository` since they share the same Spring context and database.

**InputField wrapper:** No `flex: 1` — caused smudged layouts on login/register when fields stretched to fill parent.

---

## Critical Workflows

### Record Sale Flow
1. Mobile App → `POST /sales` (API Gateway → Sales Service)
2. Sales Service → Inventory Service: `GET /inventory/products/{id}` (check stock)
3. Sales Service → Inventory Service: `PUT /inventory/products/{id}/stock` (deduct — atomic)
4. Sales Service → CRM Service: `PUT /customers/{id}/purchase` (update total)
5. All wrapped in `@Transactional` — rolls back if any step fails
6. Returns `SaleDTO` to mobile

### Lead → Customer Conversion
1. Mobile taps "Convert" on a WON lead → `POST /leads/{id}/convert`
2. `LeadService.convertToCustomer()` calls `CrmService.create()` with lead's name/phone/email
3. Lead record deleted, `CustomerDTO` returned
4. Mobile removes lead from list, shows success alert

### AI Query Flow
1. User sends message in AI tab
2. `POST /ai/chat` → AI Service → Gemini API
3. AI Service optionally queries Sales Service for context data
4. Returns natural language response to mobile

---

## Docker Setup

```bash
# Start everything (reads .env automatically)
docker-compose up -d

# Rebuild specific services after code changes
docker-compose up -d --build api-gateway crm-service

# View logs
docker-compose logs -f crm-service

# Stop all
docker-compose down
```

All services use multi-stage Maven builds in their Dockerfiles. The `.env` file in the project root is loaded by Docker Compose automatically for environment variables.

---

## Environment Variables (`.env`)

```bash
# Database (Neon cloud PostgreSQL)
AUTH_DB_URL=jdbc:postgresql://...neon.tech/auth_db?sslmode=require&channel_binding=require
INVENTORY_DB_URL=jdbc:postgresql://...neon.tech/inventory_db?sslmode=require&channel_binding=require
CRM_DB_URL=jdbc:postgresql://...neon.tech/crm_db?sslmode=require&channel_binding=require
SALES_DB_URL=jdbc:postgresql://...neon.tech/sales_db?sslmode=require&channel_binding=require
DB_USERNAME=neondb_owner
DB_PASSWORD=...

# Security
JWT_SECRET=...   # min 32 chars, same across all services

# AI
GEMINI_API_KEY=...

# Service Discovery
EUREKA_URL=http://localhost:8761/eureka/
```

---

## Project Structure

```
smartbiz/
├── .env                          # Environment variables (not committed)
├── docker-compose.yml            # All services
├── CLAUDE.md                     # AI coding guidance
├── PROGRESS.md                   # Change log
├── PROJECT_CONTEXT.md            # This file
├── backend/
│   ├── eureka-server/
│   ├── api-gateway/              # Dockerfile, application.yml (routes)
│   ├── auth-service/             # Dockerfile, V1 migration
│   ├── inventory-service/        # Dockerfile, V1+V2 migrations
│   ├── crm-service/              # Dockerfile, V1+V2+V3 migrations
│   ├── sales-service/            # Dockerfile, V1 migration
│   ├── ai-service/               # Dockerfile (Gemini integration)
│   └── messaging-service/        # Phase 2
├── mobile/
│   ├── app/
│   │   ├── (tabs)/               # 8 tab screens
│   │   ├── onboarding.tsx
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── add-product.tsx
│   ├── components/ui/
│   ├── services/                 # API service layer
│   └── contexts/AuthContext.tsx
└── frontend/web/                 # Next.js web dashboard (partial)
```

---

## Non-Negotiables

✅ JWT authentication on all endpoints except /auth/**
✅ User ID (`X-User-Id` header) in every request for multi-tenancy
✅ Atomic transactions when stock deducted (rollback on failure)
✅ Database-per-service (no direct DB access across services)
✅ All inter-service calls via REST (no shared database)
✅ Flyway migrations for all schema changes (`baseline-on-migrate: true`)
✅ DTOs for all API responses (never expose JPA entities)

---

## Quick Reference — Port Numbers

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
