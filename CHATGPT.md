# CHATGPT.md

This file is the cross-agent project guide for ChatGPT, Codex, Claude, Cursor, and Windsurf.
Use it to stay aligned with the current SmartBiz architecture and to avoid generating code that violates core system rules.

---

## Purpose

SmartBiz is a mobile-first business management system for small businesses in Nepal.

Primary stack:
- Backend: Java 21 + Spring Boot 3.4.5 microservices
- Mobile: React Native + Expo + TypeScript
- Web: Next.js App Router
- Database: PostgreSQL (Neon) with Flyway migrations
- Infra: Eureka, Spring Cloud Gateway, Docker Compose
- Caching: Redis for paginated inventory and CRM endpoints
- AI: Gemini-backed AI service

Current documented state:
- MVP is built and running
- All core backend services are active
- Mobile app has 8 connected tabs
- Web dashboard has feature parity for inventory, suppliers, sales, customers, leads, AI chat, and settings
- Messaging remains Phase 2

---

## Source Of Truth

When docs disagree, use this order:

1. `CHATGPT.md`
2. `AGENTS.md` if your tool supports repository agent instructions
3. `PROJECT_CONTEXT.md` for architecture, workflows, schema, and service map
4. `PROGRESS.md` for latest implemented features and recent behavioral changes
5. `DECISIONS.md` for non-obvious technical rationale
6. `PRODUCT.md` for UX and product tone

Treat older session-by-session debug or handoff notes as historical, not authoritative.

---

## Architecture Snapshot

### Active backend services

| Service | Port | Responsibility |
|---------|------|----------------|
| API Gateway | 8080 | JWT validation, header injection, routing |
| Eureka Server | 8761 | Service discovery |
| Auth Service | 8081 | Signup, login, profile |
| Inventory Service | 8082 | Products, stock, suppliers |
| CRM Service | 8083 | Customers, leads |
| Sales Service | 8084 | POS, sales history, analytics |
| AI Service | 8085 | Gemini chat, invoice scan, voice parsing |

### Not active yet

| Service | Port | Status |
|---------|------|--------|
| Messaging Service | 8086 | Phase 2 |

### Client apps

- `mobile/`: Expo mobile app, 8 tabs
- `frontend/web/`: Next.js dashboard

### Data model strategy

- Database per service
- No direct cross-service DB access
- Cross-service joins happen through REST calls only
- Flyway manages all schema changes

---

## Non-Negotiables

Never generate code that breaks these rules:

- JWT is enforced on all endpoints except `/auth/**`
- API Gateway is the trust boundary for JWT validation
- Gateway injects `X-User-Id`; downstream services rely on that header
- Every user-facing query must be scoped by `userId`
- No cross-service direct database access
- No JPA entities returned from controllers; DTOs only
- No edits to old Flyway migrations; add a new migration instead
- Sales and stock flows must preserve rollback-safe behavior as much as possible
- All new service paths must be added to both:
  - Gateway route predicates
  - The target service `SecurityConfig`

---

## Known Good Patterns

### Backend

- Package shape per service: `controller`, `service`, `repository`, `model`, `dto`, `config`, `exception`
- Use env-var fallbacks in `application.yml`
- Use `findByIdAndUserId(...)` or equivalent user-scoped repository methods
- Use `@RestControllerAdvice` for consistent error responses
- Use `@Transactional` for multi-write service operations
- Keep inter-service communication over REST only

### Database and migrations

- Migration naming pattern: `V1__Init.sql`, `V2__Add_Feature.sql`, `V3__Create_X_Table.sql`
- `baseline-on-migrate: true` is expected
- Do not rewrite old migrations to "fix" schema drift

### Caching

- Inventory and CRM paginated list endpoints use Redis-backed caching
- Preserve the lenient cache error handler in both `CacheConfig.java` files
- Do not remove the `CachingConfigurer` error handler override
- If Redis fails, the app should degrade to DB reads rather than return 500s

### Mobile

- Shared API access belongs in `mobile/services/`
- Auth/session state belongs in `mobile/contexts/AuthContext.tsx`
- Keep the 8-tab navigation structure intact unless there is a deliberate product change
- `components/ui/InputField.tsx` must not reintroduce `flex: 1` on the wrapper
- Voice input requires a dev build for native speech recognition; Expo Go uses fallback text input

### Web

- Next.js App Router
- Prefer Server Components by default
- Use route handlers for client-triggered mutations that need session-backed proxying
- For paginated pages, `searchParams` is async and must be awaited
- Shared pagination uses the `Pagination.tsx` pattern

---

## High-Risk Areas

These are the easiest places for an AI agent to generate bad code.

### 1. Multi-tenancy leaks

Bad generation:
- using `findById(...)` where `findByIdAndUserId(...)` is required
- forgetting `X-User-Id` in controllers or service calls

Correct approach:
- scope every user record lookup by `userId`
- preserve "not found" behavior for cross-tenant access attempts

### 2. Gateway and service route drift

Bad generation:
- adding a backend endpoint without updating gateway routing
- adding a route without updating the service security matcher list

Correct approach:
- update both gateway `application.yml` and the target service `SecurityConfig.java`

### 3. Distributed transaction assumptions

Bad generation:
- assuming Spring `@Transactional` makes cross-service REST workflows fully atomic

Correct approach:
- remember local DB transactions do not automatically roll back remote service calls
- preserve existing behavior carefully
- if you redesign sale orchestration, think in compensating actions, not magic distributed rollback

### 4. Cache regressions

Bad generation:
- "simplifying" cache config by removing the lenient error handler

Correct approach:
- keep fail-open cache behavior

### 5. AI API waste

Bad generation:
- auto-calling Gemini on every render, tab visit, or mount

Correct approach:
- use explicit user-triggered AI calls where the project already moved in that direction
- preserve the documented fixes that removed automatic insight spam

### 6. Stale documentation assumptions

Bad generation:
- assuming the web dashboard is still unbuilt
- assuming the AI service is still a stub

Correct approach:
- verify against `PROGRESS.md` and current code before planning a feature from scratch

---

## Current Feature Reality

Implemented across the system:

- Auth: signup, login, profile update
- Inventory: CRUD, stock adjustment, low-stock, suppliers
- Suppliers: create/update flows via inventory service
- Sales: POS, history, analytics
- Customers: CRUD, purchase history views
- Leads: CRUD, stage pipeline, convert to customer
- AI: chat, multi-turn history, invoice scan, voice parsing, attachments, category inference
- Pagination and Redis caching for inventory and CRM lists
- Web dashboard feature parity for core domains

Still pending:

- Messaging or unified inbox
- Push notifications
- Refresh token flow on clients
- Barcode scanning
- Nepali i18n

---

## Safe Change Workflow For Agents

Before making changes:

1. Read the files you will edit
2. Check `PROJECT_CONTEXT.md` and `PROGRESS.md` if the task touches architecture or recently changed behavior
3. Prefer extending existing patterns over inventing a new one
4. If the feature depends on external setup by the developer or project owner, stop and call that out before implementation

Required external-setup callout examples:

- OAuth providers such as Google login
- SMTP or email delivery for OTP, password reset, or notifications
- Third-party API keys or cloud console configuration
- Mobile app signing, package IDs, bundle IDs, or SHA fingerprints
- Domain, callback URL, webhook, or DNS configuration
- Storage buckets, Redis, queues, or other infra that must exist outside the repo

When one of these is required, agents should:

1. Explain what must be configured outside the codebase
2. Ask the user whether that setup already exists
3. Tell the user what env vars, console values, callback URLs, or secrets will be needed
4. Avoid presenting the feature as fully working until that setup is completed

When adding backend functionality:

1. Add DTOs first
2. Keep repository queries user-scoped
3. Update service logic
4. Update controller endpoints
5. Update gateway routes if path exposure changes
6. Update service `SecurityConfig` matchers if new paths are introduced
7. Add Flyway migration only if schema changes

When touching mobile or web:

1. Reuse existing service-layer functions where possible
2. Keep API payloads aligned with backend DTOs
3. Preserve current pagination and AI interaction patterns
4. Avoid adding silent background AI requests

---

## Environment Notes

- Local non-Docker Spring runs require loading root `.env` manually
- Docker Compose reads root `.env` automatically
- Mobile API URL can vary by emulator, dev machine, and LAN IP
- A hardcoded mobile fallback IP may exist in code and should be treated as temporary dev behavior, not architecture

---

## Documentation Hygiene

If you change core architecture or shipped feature scope:

- update `PROJECT_CONTEXT.md` for enduring architecture changes
- update `PROGRESS.md` for session-level implementation history
- update `DECISIONS.md` when introducing a new non-obvious rule
- keep `CHATGPT.md` aligned if the change affects agent behavior or safety

Do not create one-off handoff or debug Markdown files unless they are truly needed long term.
