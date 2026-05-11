# SmartBiz — Session Handoff Document

> Read this file at the start of every new session. It contains the full system state, what's been built, and exactly what to do next.

---

## What SmartBiz Is

Mobile-first business management system for small businesses in Nepal.
- **College FYP project** (solo, 12 weeks) — must use Java Spring Boot + PostgreSQL
- Stack: Java Spring Boot 3.4.5 microservices + React Native (Expo) + Next.js web dashboard
- All client traffic routes through an API Gateway (port 8080)
- JWT authentication: gateway validates token and injects `X-User-Id` header to all downstream services

---

## Current State — What's Built and Working

### Backend (all in `backend/`)
| Service | Port | Status | Endpoints |
|---------|------|--------|-----------|
| eureka-server | 8761 | ✅ Complete | Service discovery |
| api-gateway | 8080 | ✅ Complete | JWT filter, CORS, routing |
| auth-service | 8081 | ✅ Complete | POST /auth/signup, POST /auth/login, PUT /auth/profile |
| inventory-service | 8082 | ✅ Complete | Full CRUD /inventory/products, /low-stock, /barcode, /{id}/stock |
| crm-service | 8083 | ✅ Complete | Full CRUD /customers, /{id}/purchase |
| sales-service | 8084 | ✅ Complete | POST/GET /sales, /analytics/today, /analytics/weekly |
| ai-service | 8085 | ❌ Stub only | Directory exists, nothing implemented |
| messaging-service | 8086 | ⛔ Skip | Too complex (WhatsApp requires business approval) |

### Mobile App (`mobile/`)
All screens fully wired to real APIs:
- Home: daily summary, weekly bar chart (real data), low-stock alerts, quick actions
- Inventory: product list with search/filter, add/edit/delete products
- Sales: POS tab (cart, payment method CASH/CARD/DIGITAL), History tab (pull-to-refresh)
- Customers: list with search, add/edit/delete, pull-to-refresh
- Settings: profile card, edit profile modal
- Placeholders still showing "Coming Soon": Change Password, Language, Notifications

### Web Dashboard (`frontend/web/`)
- `/` — marketing landing page (hero, features, how-it-works, footer)
- `/login` and `/signup` — auth pages, set httpOnly `smartbiz_session` cookie
- `/dashboard/overview` — stats cards + weekly chart + low-stock panel
- `/dashboard/inventory` — products table + Add Product modal (no edit/delete yet)
- `/dashboard/sales` — sales table + New Sale POS modal
- `/dashboard/customers` — customers table + Add Customer modal (no edit/delete yet)

---

## Authentication Architecture (Critical — Read This)

### How it works
1. `POST /auth/login` (or `/auth/signup`) → goes DIRECTLY to `AUTH_SERVICE_URL` (port 8081), NOT through the gateway. Login has no JWT yet.
2. Returns `{ access_token, userId, email, fullName }`
3. All other requests → API Gateway (port 8080) with:
   - `Authorization: Bearer {token}`
   - `X-User-Id: {userId}`
4. Gateway's `AuthenticationFilter.java` validates the JWT and forwards the headers downstream.

### Web proxy pattern
Client components can't read the httpOnly cookie. So:
- **Server Components** call `requireSession()` + `apiFetch()` directly at render time
- **Client modals** POST to Next.js route handlers (`/api/products`, `/api/sales`, `/api/customers`) which read the cookie server-side and proxy to the gateway
- After a successful mutation, client calls `router.refresh()` to re-render the Server Component

### Key files
```
frontend/web/src/lib/session.ts              — getSession(), requireSession(), apiFetch()
frontend/web/src/app/api/auth/login/route.ts — proxies to AUTH_SERVICE_URL, sets cookie
frontend/web/src/app/api/products/route.ts   — proxies POST to API_GATEWAY_URL/inventory/products
frontend/web/src/app/api/sales/route.ts      — proxies POST to API_GATEWAY_URL/sales
frontend/web/src/app/api/customers/route.ts  — proxies POST to API_GATEWAY_URL/customers
```

### Environment variables
```
# frontend/web/.env.local
API_GATEWAY_URL=http://localhost:8080
AUTH_SERVICE_URL=http://localhost:8081
GEMINI_API_KEY=your_key_here          ← add this when implementing AI
```

---

## Non-Negotiables (Never Break These)

- ✅ JWT on all endpoints except `/auth/**`
- ✅ `X-User-Id` header in every request for multi-tenancy — every DB query filters by userId
- ✅ Atomic `@Transactional` on stock deduction in SalesService
- ✅ Database-per-service (no cross-service DB access, only REST calls)
- ✅ DTOs for all API responses (never expose JPA entities)
- ✅ Flyway migrations in `src/main/resources/db/migration/` for all schema changes
- ✅ All inter-service calls use Eureka service names (e.g., `lb://INVENTORY-SERVICE`)

---

## What to Build Next (Priority Order)

### 1. AI Service — Gemini API ⭐ (biggest differentiator)

Use **Google Gemini free API** (no cost). Model: `gemini-2.0-flash` or `gemini-1.5-flash`.

**Gemini API call format:**
```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}
Content-Type: application/json

{
  "system_instruction": { "parts": [{ "text": "You are a business assistant for a small business in Nepal. Answer concisely based only on the data provided." }] },
  "contents": [{ "role": "user", "parts": [{ "text": "BUSINESS DATA:\n{context}\n\nQUESTION: {question}" }] }]
}
```
Response: `response.candidates[0].content.parts[0].text`

Get a free API key at: https://aistudio.google.com/app/apikey

#### Backend: `backend/ai-service/` (build from scratch)

**`pom.xml`** — dependencies needed:
- `spring-boot-starter-web`
- `spring-cloud-starter-netflix-eureka-client`
- `lombok`
- `spring-boot-starter-webflux` (for calling other services via WebClient)

**`src/main/resources/application.yml`:**
```yaml
server:
  port: 8085
spring:
  application:
    name: AI-SERVICE
eureka:
  client:
    service-url:
      defaultZone: http://localhost:8761/eureka/
app:
  gemini-api-key: ${GEMINI_API_KEY}
  gemini-url: https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent
```

**`controller/AiController.java`** — base path `/ai`:
- `POST /ai/query` → accepts `{ "question": "..." }` + `X-User-Id` header → returns `{ "response": "..." }`
- `GET /ai/insights` → returns one-sentence proactive insight → returns `{ "insight": "..." }`

**`service/AiService.java`:**
1. `answerQuery(Long userId, String question)`:
   - Call `SALES-SERVICE` (via RestTemplate/WebClient): `GET /sales/analytics/today`, `GET /sales/analytics/weekly`, `GET /sales` (limit 10)
   - Call `INVENTORY-SERVICE`: `GET /inventory/products/low-stock`
   - Build context string from this real data (format as readable text)
   - POST to Gemini API with context + question
   - Return response text

2. `getDailyInsight(Long userId)`:
   - Same data fetching
   - Ask Gemini: "Give me one sentence of business insight based on this data."

When calling other services, pass the `X-User-Id` header through using RestTemplate:
```java
HttpHeaders headers = new HttpHeaders();
headers.set("X-User-Id", userId.toString());
headers.set("Authorization", "Bearer " + jwtToken); // gateway requires this
```

**Important:** The AI service calls other services through the gateway (port 8080), not directly. It needs a service-to-service JWT token. Simplest approach: add a whitelist in the gateway for `/ai/**` → internal calls, or create a static "service token" in the config.

Actually, simpler: configure the gateway to allow `X-User-Id` from the AI service to pass through without JWT validation for internal service-to-service calls. Or, even simpler: the AI service calls other services **directly by port** (bypassing the gateway), since it's internal:
- `http://localhost:8082/inventory/products/low-stock` with `X-User-Id: {userId}` header
- Use service names via Eureka: `lb://INVENTORY-SERVICE/inventory/products/low-stock`
- Each internal service needs to allow calls without JWT from other internal services — OR have the AI service use a pre-configured static JWT for service calls.

**Recommended approach:** Configure each service to skip JWT validation for requests from AI-SERVICE. In each service's `SecurityConfig.java`, add `/inventory/**` to permit list only when coming from internal network, OR: generate a long-lived static service token in config and use it for inter-service calls.

**Simplest for FYP:** Add a single bypass — the AI service includes `X-User-Id` header directly in calls to inventory/sales services, and those services have a secondary permit config. Or just hardcode a valid test JWT for service-to-service.

**`dto/AiQueryRequest.java`:** `record AiQueryRequest(String question) {}`
**`dto/AiQueryResponse.java`:** `record AiQueryResponse(String response) {}`
**`dto/AiInsightResponse.java`:** `record AiInsightResponse(String insight) {}`

**Add AI route to gateway** in `backend/api-gateway/src/main/resources/application.yml`:
```yaml
- id: ai-service
  uri: lb://AI-SERVICE
  predicates:
    - Path=/ai/**
```

#### Mobile: new AI tab

**`mobile/services/ai.ts`** — new file:
```typescript
import api from './api'
export const queryAi = (question: string): Promise<string> =>
  api.post('/ai/query', { question }).then(r => r.data.response)
export const getDailyInsight = (): Promise<string> =>
  api.get('/ai/insights').then(r => r.data.insight)
```

**`mobile/app/(tabs)/ai.tsx`** — new screen:
- State: `messages: { role: 'user'|'ai', text: string }[]`, `input: string`, `loading: boolean`
- UI: ScrollView of message bubbles (user = right/blue, AI = left/gray)
- Bottom: TextInput + Send button
- Quick-prompt chips: "Top selling products", "What to reorder?", "Revenue this week", "Best customers"
- On send: append user message, call `queryAi(input)`, append AI response
- Import `getDailyInsight` and show as first message on mount

**`mobile/app/(tabs)/_layout.tsx`** — add 5th tab with a sparkle/robot icon and label "AI"

**`mobile/app/(tabs)/index.tsx`** — add AI insight card:
- Load `getDailyInsight()` alongside existing data in `Promise.all` (wrap in try-catch, silent fail)
- Show a highlighted card with sparkle icon and the insight text
- Card background: light blue (blue-50), text: gray-800

#### Web: AI on overview page

**`frontend/web/src/app/api/ai/query/route.ts`** — new route handler:
```typescript
// POST — reads session, proxies to API_GATEWAY_URL/ai/query
```

**`frontend/web/src/components/AiInsightCard.tsx`** — `'use client'` component:
- Props: `initialInsight: string | null`
- Shows the insight in a card with a sparkle icon
- Has a text input + "Ask" button at the bottom
- On submit: `POST /api/ai/query` → shows response below

**`frontend/web/src/app/dashboard/overview/page.tsx`** — add:
- Fetch `apiFetch<{ insight: string }>('/ai/insights', session)` alongside other data
- Render `<AiInsightCard initialInsight={aiData?.insight ?? null} />` as a full-width card

---

### 2. Change Password

#### Backend: `backend/auth-service/`

**`dto/ChangePasswordRequest.java`** — new:
```java
public record ChangePasswordRequest(String currentPassword, String newPassword) {}
```

**`service/UserService.java`** — add `changePassword(Long userId, ChangePasswordRequest req)`:
- Load user by id (throw if not found)
- Verify `req.currentPassword()` matches stored hash via `passwordEncoder.matches()`
- If wrong: throw new `InvalidCredentialsException("Current password is incorrect")`
- Encode `req.newPassword()` and save

**`controller/AuthController.java`** — add:
```java
@PutMapping("/password")
public ResponseEntity<Map<String, String>> changePassword(
    @RequestHeader("X-User-Id") Long userId,
    @RequestBody ChangePasswordRequest request) {
    userService.changePassword(userId, request);
    return ResponseEntity.ok(Map.of("message", "Password updated"));
}
```

#### Mobile: `mobile/app/(tabs)/settings.tsx`

Replace the "Coming Soon" alert for Change Password with a modal:
- Fields: `currentPassword` (password input), `newPassword` (password input, min 6 chars)
- Submit → `authService.changePassword(current, newPass)` → success toast → close modal
- Show error inline if current password wrong

**`mobile/services/auth.ts`** — add:
```typescript
export const changePassword = (currentPassword: string, newPassword: string) =>
  api.put('/auth/password', { currentPassword, newPassword })
```

---

### 3. Web Edit/Delete (Inventory + Customers)

#### New API route handlers
**`frontend/web/src/app/api/products/[id]/route.ts`** — new file:
- `PUT` handler: reads session, proxies to `API_GATEWAY_URL/inventory/products/{id}`
- `DELETE` handler: reads session, proxies to `API_GATEWAY_URL/inventory/products/{id}`

**`frontend/web/src/app/api/customers/[id]/route.ts`** — new file:
- `PUT` handler: proxies to `API_GATEWAY_URL/customers/{id}`
- `DELETE` handler: proxies to `API_GATEWAY_URL/customers/{id}`

#### New client components
**`frontend/web/src/components/EditProductModal.tsx`** — same as AddProductModal but:
- Receives `product: Product` prop
- Pre-fills all form fields from `product`
- Submits `PUT /api/products/{product.id}`

**`frontend/web/src/components/EditCustomerModal.tsx`** — same as AddCustomerModal but:
- Receives `customer: Customer` prop
- Pre-fills name, phone, email, address
- Submits `PUT /api/customers/{customer.id}`

**`frontend/web/src/components/ProductActions.tsx`** — `'use client'` component:
- Props: `product: Product`
- Renders pencil icon (opens EditProductModal) + trash icon (DELETE with confirm)
- Delete: `fetch('/api/products/{id}', { method: 'DELETE' })` then `router.refresh()`

**`frontend/web/src/components/CustomerActions.tsx`** — same pattern for customers

#### Update pages
**`frontend/web/src/app/dashboard/inventory/page.tsx`** — add `Actions` column to table, render `<ProductActions product={p} />`

**`frontend/web/src/app/dashboard/customers/page.tsx`** — add `<CustomerActions customer={c} />` per row

---

### 4. Customer Linking on Sales

Sales records a `customer_id` in the DB but the POS currently always sends `null`. This means CRM totals never update.

#### Mobile POS: `mobile/app/(tabs)/sales.tsx`
In the POS tab, add a "Customer (optional)" section above the cart:
- Search input that filters a customer list (load customers on mount)
- Tapping a customer selects them (show their name in a badge with an ×)
- Pass `customerId: selectedCustomer?.id ?? null` in the `createSale` call

**`mobile/services/sales.ts`** — update `createSale` to accept optional `customerId`:
```typescript
createSale(items, paymentMethod, customerId?: number)
```

#### Web POS modal: `frontend/web/src/components/AddSaleModal.tsx`
- Add `customers: Customer[]` prop
- Add a searchable customer selector in the cart panel (above payment method)
- Pass selected `customerId` in the POST body

**`frontend/web/src/app/dashboard/sales/page.tsx`** — fetch customers alongside products:
```typescript
const [sales, products, customers] = await Promise.all([
  apiFetch<Sale[]>('/sales', session),
  apiFetch<Product[]>('/inventory/products', session),
  apiFetch<Customer[]>('/customers', session),
])
```
Pass `customers` to `<AddSaleModal>`.

---

### 5. Stock History View

The `stock_history` table is populated on every stock change but never shown.

#### Backend: `backend/inventory-service/`

**`dto/StockHistoryDTO.java`** — new:
```java
@Data @NoArgsConstructor @AllArgsConstructor
public class StockHistoryDTO {
    private Long id;
    private int quantityChange;
    private String type;     // SALE, ADJUSTMENT, RESTOCK
    private String reason;
    private LocalDateTime createdAt;
}
```

**`repository/StockHistoryRepository.java`** — add:
```java
List<StockHistory> findByProductIdOrderByCreatedAtDesc(Long productId);
```

**`service/ProductService.java`** — add:
```java
public List<StockHistoryDTO> getStockHistory(Long productId, Long userId) {
    Product p = productRepository.findByIdAndUserId(productId, userId)
        .orElseThrow(() -> new ProductNotFoundException("Product not found"));
    return stockHistoryRepository.findByProductIdOrderByCreatedAtDesc(p.getId())
        .stream().map(this::toHistoryDTO).toList();
}
```

**`controller/ProductController.java`** — add:
```java
@GetMapping("/{id}/history")
public ResponseEntity<List<StockHistoryDTO>> getStockHistory(
    @RequestHeader("X-User-Id") Long userId,
    @PathVariable Long id) {
    return ResponseEntity.ok(productService.getStockHistory(id, userId));
}
```

#### Mobile: `mobile/app/(tabs)/inventory.tsx`
- Tapping a product card (anywhere except edit/delete buttons) opens a "Stock History" modal
- Fetches `GET /inventory/products/{id}/history`
- Shows a list of history entries: date, type badge (green=restock, red=sale, blue=adjustment), quantity change (+N / -N), reason

---

### 6. JWT Secret Externalization

Change 5 `application.yml` files from hardcoded secret to env var:

In each of these files, find the `jwt.secret:` line and change to:
```yaml
jwt:
  secret: ${JWT_SECRET:dev_secret_change_in_production_min_32_chars}
```

Files:
- `backend/auth-service/src/main/resources/application.yml`
- `backend/inventory-service/src/main/resources/application.yml`
- `backend/crm-service/src/main/resources/application.yml`
- `backend/sales-service/src/main/resources/application.yml`
- `backend/api-gateway/src/main/resources/application.yml`

Also verify `docker-compose.yml` passes `JWT_SECRET` env var to all service containers.

---

### 7. CRM Service Tests

Create `backend/crm-service/src/test/java/com/smartbiz/crm/service/CrmServiceTest.java`:

```java
@ExtendWith(MockitoExtension.class)
class CrmServiceTest {
    @Mock CustomerRepository customerRepository;
    @InjectMocks CrmService crmService;

    // Test createCustomer — happy path
    // Test createCustomer — phone duplicate throws
    // Test updateCustomer — ownership check (wrong userId throws CustomerNotFoundException)
    // Test deleteCustomer — ownership check, then deletes
    // Test updatePurchaseTotal — adds amount to existing total
}
```

Follow the same pattern as `backend/auth-service/src/test/java/com/smartbiz/auth/service/UserServiceTest.java`.

---

## File Tree of Key Files

```
smartbiz/
├── SESSION_HANDOFF.md               ← This file
├── PROGRESS.md                      ← Task tracking log
├── PROJECT_CONTEXT.md               ← Original architecture doc
├── docker-compose.yml               ← All services + postgres
│
├── backend/
│   ├── eureka-server/               ✅ Done
│   ├── api-gateway/                 ✅ Done — add AI route
│   │   └── src/main/resources/application.yml
│   ├── auth-service/                ✅ Done — add /password endpoint
│   │   └── src/main/java/com/smartbiz/auth/
│   │       ├── controller/AuthController.java
│   │       ├── service/UserService.java
│   │       └── dto/                 ← add ChangePasswordRequest.java
│   ├── inventory-service/           ✅ Done — add /{id}/history endpoint
│   │   └── src/main/java/com/smartbiz/inventory/
│   │       ├── controller/ProductController.java
│   │       ├── service/ProductService.java
│   │       ├── repository/StockHistoryRepository.java
│   │       └── dto/                 ← add StockHistoryDTO.java
│   ├── crm-service/                 ✅ Done — add tests
│   │   └── src/test/java/com/smartbiz/crm/service/CrmServiceTest.java  ← CREATE
│   ├── sales-service/               ✅ Done
│   └── ai-service/                  ❌ Build from scratch
│       └── src/main/java/com/smartbiz/ai/
│           ├── AiServiceApplication.java
│           ├── controller/AiController.java
│           ├── service/AiService.java
│           └── dto/AiQueryRequest|Response|InsightResponse.java
│
├── mobile/
│   ├── services/
│   │   ├── ai.ts                    ← CREATE
│   │   └── auth.ts                  — add changePassword()
│   └── app/(tabs)/
│       ├── ai.tsx                   ← CREATE
│       ├── index.tsx                — add AI insight card
│       ├── settings.tsx             — wire Change Password
│       ├── sales.tsx                — add customer selector in POS
│       ├── inventory.tsx            — add stock history on tap
│       └── _layout.tsx              — add AI tab
│
└── frontend/web/src/
    ├── app/
    │   ├── api/
    │   │   ├── ai/query/route.ts    ← CREATE
    │   │   ├── products/[id]/route.ts ← CREATE
    │   │   └── customers/[id]/route.ts ← CREATE
    │   └── dashboard/
    │       ├── overview/page.tsx    — add AI insight card
    │       ├── inventory/page.tsx   — add ProductActions per row
    │       └── customers/page.tsx   — add CustomerActions per row
    └── components/
        ├── AiInsightCard.tsx        ← CREATE
        ├── EditProductModal.tsx     ← CREATE
        ├── EditCustomerModal.tsx    ← CREATE
        ├── ProductActions.tsx       ← CREATE
        └── CustomerActions.tsx      ← CREATE
```

---

## Coding Conventions to Follow

- **Backend:** Lombok (`@Data`, `@RequiredArgsConstructor`), `@ControllerAdvice` for errors, `@Transactional`, SLF4J logging, DTOs always (never expose entities), userId on every query
- **Mobile:** TypeScript, functional components, `useState`/`useEffect`, `api.ts` axios client (has token + X-User-Id interceptors already), Alert.alert for confirms, RefreshControl for pull-to-refresh
- **Web:** Next.js App Router — Server Components by default (`async function Page()`), `'use client'` only for interactive components, `router.refresh()` after mutations, Tailwind CSS v4 (`@import "tailwindcss"`), brand color `#135BEC`
- **No comments** unless the WHY is non-obvious
- **No extra features** beyond what's listed

---

## Starting a New Session — Checklist

1. Read this file (`SESSION_HANDOFF.md`) top to bottom
2. Check `PROGRESS.md` to see what was completed in prior sessions
3. Start with AI Service — it's the most impactful remaining feature
4. For any file you'll edit, read it first before making changes
5. Test backend endpoints with curl before wiring to frontend
6. Update `PROGRESS.md` as items are completed

---

## Quick Start Commands

```bash
# Backend — start all services
docker-compose up -d postgres
cd backend/eureka-server && mvn spring-boot:run
cd backend/api-gateway && mvn spring-boot:run
cd backend/auth-service && mvn spring-boot:run
cd backend/inventory-service && mvn spring-boot:run
cd backend/crm-service && mvn spring-boot:run
cd backend/sales-service && mvn spring-boot:run
cd backend/ai-service && mvn spring-boot:run      # after building

# Mobile
cd mobile && npx expo start

# Web
cd frontend/web && npm run dev
```

---

*Last updated: Session 3 (2026-05-03)*
