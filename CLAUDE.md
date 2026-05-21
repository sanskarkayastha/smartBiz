# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**SmartBiz** is a mobile-first business management system for small businesses in Nepal. It's a college project (12 weeks, solo) with a strict constraint: **must use Java Spring Boot + PostgreSQL**.

**Stack:**
- Backend: Java Spring Boot 3.4.5 Microservices with Java 21 (6 active services)
- Mobile: React Native (Expo) with TypeScript — 8 tabs, fully connected to backend
- Web Dashboard: React.js (Next.js) — Phase 2, partially built
- Database: PostgreSQL 15+ (Neon cloud) with Flyway migrations
- Service Discovery: Eureka + Spring Cloud Gateway
- Deployment: Docker Compose (multi-stage builds)

**Current Status:** MVP fully built and running. All 6 core backend services are live via Docker. Mobile app has 8 tabs all connected to the backend. Web dashboard has inventory + suppliers pages.

---

## What's Built (Session Summary)

| Feature | Backend | Mobile | Web |
|---------|---------|--------|-----|
| Auth (login/signup/profile) | ✅ | ✅ | ✅ |
| Inventory (CRUD + stock) | ✅ | ✅ | ✅ |
| Suppliers | ✅ | ✅ | ✅ |
| Sales (POS + analytics) | ✅ | ✅ | — |
| Customers (CRM) | ✅ | ✅ | — |
| Leads (pipeline tracking) | ✅ | ✅ | — |
| AI Insights + Voice + Scanner | ✅ (Gemini) | ✅ | — |
| Messaging | Phase 2 | — | — |

---

## MVP Scope

Core services delivered:
1. **Auth Service** — JWT login/signup/profile update
2. **Inventory Service** — Product CRUD + stock + supplier auto-create
3. **Sales Service** — POS, atomic stock deduction, weekly analytics
4. **CRM Service** — Customer management + Lead pipeline tracking
5. **AI Service** — Gemini API chatbot (sales insights, reorder suggestions)
6. **Mobile App** — 8-tab fully connected app
7. **Infrastructure** — Eureka, API Gateway, Docker Compose, Neon PostgreSQL

**Phase 2 (not yet built):**
- Messaging / Unified Inbox
- Full Web Dashboard
- Firebase push notifications
- Barcode scanning
- Refresh token flow

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

### Lead-to-Customer Conversion Flow
```
Mobile App → API Gateway → CRM Service (/leads/{id}/convert)
  → Creates Customer from Lead data
  → Deletes Lead record
  → Returns CustomerDTO
```

**Non-Negotiables:**
- ✅ JWT auth on all endpoints (except /auth/**)
- ✅ User ID in request header (X-User-Id) for multi-tenancy
- ✅ **Atomic transactions** when stock deducted (rollback on failure)
- ✅ Database-per-service (no direct cross-service DB access)
- ✅ All inter-service calls via REST APIs
- ✅ Flyway migrations for all schema changes
- ✅ DTOs for all API responses (never expose JPA entities)

---

## Environment Variables

All services read from environment variables. For local development, load the `.env` file in the project root before running services:

```powershell
# PowerShell — load .env into current session
Get-Content .env | ForEach-Object { if ($_ -match '^([^#=]+)=(.*)$') { [System.Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), 'Process') } }
```

Key variables in `.env`:
```
CRM_DB_URL=jdbc:postgresql://...neon.tech/crm_db?sslmode=require
AUTH_DB_URL=...
INVENTORY_DB_URL=...
SALES_DB_URL=...
DB_USERNAME=neondb_owner
DB_PASSWORD=...
JWT_SECRET=...
GEMINI_API_KEY=...
EUREKA_URL=http://localhost:8761/eureka/
```

Docker Compose reads `.env` automatically — no manual loading needed when using Docker.

---

## Directory Structure

```
smartbiz/
├── PROJECT_CONTEXT.md          # Full architecture + schema docs
├── CLAUDE.md                   # This file
├── PROGRESS.md                 # Session-by-session change log
├── .env                        # Local environment variables (not committed)
├── docker-compose.yml          # All 6 services + networking
├── mobile/                     # Expo/React Native app
│   ├── app/
│   │   ├── (tabs)/
│   │   │   ├── index.tsx       # Home — weekly chart + tap-to-load AI insight
│   │   │   ├── inventory.tsx   # Inventory CRUD + camera FAB (invoice scan) + voice FAB
│   │   │   ├── suppliers.tsx   # Supplier list + edit
│   │   │   ├── sales.tsx       # POS + history tabs
│   │   │   ├── customers.tsx   # Expandable customer cards + history
│   │   │   ├── leads.tsx       # Lead pipeline + voice input in header
│   │   │   ├── ai.tsx          # AI chatbot + camera + mic icons
│   │   │   ├── settings.tsx    # Profile edit
│   │   │   └── _layout.tsx     # 8-tab navigator
│   │   ├── onboarding.tsx      # Landing page
│   │   ├── login.tsx           # Login screen
│   │   ├── register.tsx        # Register screen
│   │   └── add-product.tsx     # Add product screen
│   ├── components/
│   │   └── ui/
│   │       ├── InputField.tsx      # Reusable text input (no flex:1 on wrapper)
│   │       ├── SearchBar.tsx
│   │       ├── FilterTabs.tsx
│   │       ├── StatusBadge.tsx
│   │       ├── VoiceButton.tsx     # Mic button; native SpeechRecognizer or text fallback
│   │       ├── InvoiceScanModal.tsx # Camera → AI parse → review → save flow
│   │       └── colors.ts           # Design tokens
│   ├── services/               # API service layer
│   │   ├── api.ts              # Axios base (base URL + JWT interceptor)
│   │   ├── auth.ts
│   │   ├── inventory.ts
│   │   ├── suppliers.ts
│   │   ├── sales.ts
│   │   ├── customers.ts
│   │   ├── leads.ts            # Lead CRUD + convertToCustomer
│   │   └── ai.ts               # queryAi, scanInvoice, parseVoiceForLead, parseVoiceForProducts
│   ├── contexts/
│   │   └── AuthContext.tsx
│   └── package.json
├── backend/
│   ├── eureka-server/
│   ├── api-gateway/            # Routes: /auth, /inventory, /customers, /leads, /sales, /ai
│   ├── auth-service/           # Port 8081
│   ├── inventory-service/      # Port 8082 — products + suppliers
│   ├── crm-service/            # Port 8083 — customers + leads
│   ├── sales-service/          # Port 8084
│   ├── ai-service/             # Port 8085 — Gemini API
│   └── messaging-service/      # Phase 2
└── frontend/
    └── web/                    # Next.js — inventory + suppliers pages
```

---

## Mobile App Development

### Setup
```bash
cd mobile
npm install
npx expo start
```

### Tab Navigation (8 tabs)
`app/(tabs)/_layout.tsx` defines all tabs in order:
1. Home (`index`) — dashboard + weekly revenue chart + tap-to-load AI insight card
2. Inventory — product list, add/edit/delete, search; camera FAB (invoice scan) + voice FAB
3. Suppliers — supplier list, edit, balance badge
4. Sales — POS cart + history tab
5. Customers — expandable accordion cards, purchase history modal
6. Leads — pipeline with stage filter tabs, expandable cards, stage stepper; voice button in header
7. AI — Gemini chatbot; camera icon (invoice scan) + mic icon (voice-to-chat) in input row
8. Settings — profile edit

### API Base URL
Set in `mobile/.env` or `app.json`:
```
EXPO_PUBLIC_API_URL=http://<your-ip>:8080
```
Currently hardcoded fallback in `services/api.ts`: `http://10.247.23.13:8080`

### All API calls automatically include:
- `Authorization: Bearer <jwt>` — from SecureStore
- `X-User-Id: <id>` — from SecureStore

---

## Backend Microservices

### Running via Docker (preferred)
```bash
# Load .env then start all services
docker-compose up -d --build

# Rebuild specific services only
docker-compose up -d --build api-gateway crm-service

# View logs
docker-compose logs -f crm-service
docker-compose logs -f api-gateway
```

### Running locally (for development)
```bash
# 1. Load .env into shell
Get-Content .env | ForEach-Object { ... }  # see above

# 2. Start Eureka first
cd backend/eureka-server && mvn spring-boot:run

# 3. Start other services
cd backend/crm-service && mvn spring-boot:run
```

### Service Architecture
Each service follows this structure:
```
crm-service/
├── src/main/java/com/smartbiz/crm/
│   ├── controller/         # REST endpoints
│   ├── service/            # Business logic
│   ├── repository/         # JPA repositories
│   ├── model/              # JPA entities
│   ├── dto/                # Request/response DTOs
│   ├── config/             # SecurityConfig
│   └── exception/          # GlobalExceptionHandler + custom exceptions
├── src/main/resources/
│   ├── application.yml     # Port, DB (env vars with fallbacks), Eureka
│   └── db/migration/       # Flyway SQL scripts
└── pom.xml
```

### application.yml pattern (with local fallbacks)
```yaml
spring:
  datasource:
    url: ${CRM_DB_URL:jdbc:postgresql://localhost:5432/crm_db}
    username: ${DB_USERNAME:postgres}
    password: ${DB_PASSWORD:password}
```

### Ports
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

---

## API Gateway Routes

All routes in `backend/api-gateway/src/main/resources/application.yml`:

```yaml
routes:
  - id: auth-service
    uri: lb://AUTH-SERVICE
    predicates: [Path=/auth/**]
  - id: inventory-service
    uri: lb://INVENTORY-SERVICE
    predicates: [Path=/inventory/**]
  - id: crm-service
    uri: lb://CRM-SERVICE
    predicates: [Path=/customers/**,/leads/**]   # both customers + leads
  - id: sales-service
    uri: lb://SALES-SERVICE
    predicates: [Path=/sales/**]
  - id: ai-service
    uri: lb://AI-SERVICE
    predicates: [Path=/ai/**]
```

**Important:** When adding a new endpoint path to an existing service, update BOTH:
1. The gateway `application.yml` predicate
2. The service's `SecurityConfig.java` permitAll list

---

## CRM Service — Leads Feature

The CRM service now manages both customers and leads.

### Lead pipeline stages
`NEW → CONTACTED → INTERESTED → PROPOSAL → WON → LOST`

### Lead endpoints
```
GET    /leads              — list all leads for user
GET    /leads/{id}         — get single lead
POST   /leads              — create lead
PUT    /leads/{id}         — update lead (partial)
DELETE /leads/{id}         — delete lead
POST   /leads/{id}/convert — convert WON lead to Customer (deletes lead)
```

### Lead fields
`name`, `phone`, `email`, `stage`, `source` (WALK_IN/REFERRAL/SOCIAL_MEDIA/PHONE_CALL/ONLINE/OTHER), `estimatedValue`, `notes`, `followUpDate`

### Flyway migrations in crm-service
- `V1__Init.sql` — customers + customer_interactions tables
- `V2__Add_Due_Amount.sql` — due_amount column on customers
- `V3__Create_Leads_Table.sql` — leads table with indexes

---

## Key Patterns & Guidelines

### Authentication & User Isolation
- API Gateway passes `X-User-Id` header extracted from JWT to all downstream services
- Every query must filter by userId: `findByUserIdAndProductId(userId, productId)`
- No cross-user data leaks

### SecurityConfig pattern (CRM service example)
```java
.authorizeHttpRequests(authz -> authz
    .requestMatchers("/customers/**", "/leads/**").permitAll()
    .anyRequest().authenticated()
)
.csrf(csrf -> csrf.disable())
.httpBasic(basic -> basic.disable());
```

### Adding a new service route (checklist)
1. Add `Path=/newpath/**` to API Gateway `application.yml` predicate for the correct service
2. Add `.requestMatchers("/newpath/**").permitAll()` to the service's `SecurityConfig.java`
3. Rebuild affected Docker containers: `docker-compose up -d --build api-gateway <service-name>`

### Inter-Service Communication
```java
RestTemplate restTemplate = new RestTemplate();
String url = "http://INVENTORY-SERVICE:8082/inventory/products/{id}";
ProductDTO product = restTemplate.getForObject(url, ProductDTO.class, productId);
```

### InputField component
`components/ui/InputField.tsx` — wrapper has NO `flex: 1` (was causing smudged layouts). Do not re-add it.

### Error Handling
```java
@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler({CustomerNotFoundException.class, LeadNotFoundException.class})
    public ResponseEntity<Map<String, String>> handleNotFound(RuntimeException e) {
        return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
    }
}
```

---

## Database Schema Strategy

- Flyway migrations in `src/main/resources/db/migration/`
- Naming: `V1__Init.sql`, `V2__Add_Feature.sql`, `V3__Create_X_Table.sql`
- Run automatically on service startup
- **Never modify** existing migration files — create new ones
- `baseline-on-migrate: true` in all services

---

## Debugging Tips

### "Failed to load leads" / endpoint returns 404 from gateway
Check both:
1. API Gateway `application.yml` — does the predicate include the path?
2. Service `SecurityConfig.java` — is the path in `permitAll()`?
3. Rebuild Docker: `docker-compose up -d --build api-gateway <service>`

### Backend service env vars not loading
Spring Boot does NOT auto-load `.env` files. Load manually in PowerShell session before `mvn spring-boot:run`, or use Docker Compose which reads `.env` automatically.

### application.yml variable not resolving
Use `${VAR_NAME:fallback_value}` syntax. Without a fallback, an unset env var crashes the service at startup.

### Mobile app not connecting
- Verify `EXPO_PUBLIC_API_URL` matches your machine's IP (not `localhost`)
- Check API Gateway is running: `curl http://<ip>:8080/auth/health`
- Ensure `.env` is loaded when running Docker: `docker-compose up` reads `.env` automatically

### Gemini 429 "Rate limit reached" from Nepal
- Gemini 2.0 models (`gemini-2.0-flash-lite`, etc.) have `limit: 0` for Nepal free tier — they are permanently blocked regardless of quota remaining
- **Fix:** Use `gemini-2.5-flash-lite` (set in `app.gemini-url` in `application.yml`)
- If 429 persists: verify the GEMINI_API_KEY in root `.env` (Docker reads root `.env`, not `backend/.env`)
- Check active key inside container: `docker exec smartbiz-ai env | grep GEMINI`
- API keys in the same GCP project share quota — use a key from a different GCP project if hitting limits

### Voice input "requires development build"
- `expo-speech-recognition` is a native module — it cannot run in Expo Go
- Android dev build: `cd mobile && npx expo run:android` (USB-connected device, USB debugging on)
- iOS dev build: `eas build --platform ios --profile development` (requires EAS account; Xcode not needed on Windows)
- `VoiceButton.tsx` already has a text input fallback for Expo Go — voice still "works" via typing

---

## References

- **PROJECT_CONTEXT.md** — Full architecture, database schema, REST examples
- **PROGRESS.md** — Session-by-session change log
- **Spring Boot Docs** — https://spring.io/projects/spring-boot
- **Expo Docs** — https://docs.expo.dev
- **Flyway Docs** — https://flywaydb.org
