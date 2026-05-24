# SmartBiz — Progress Log

## Status Legend
- ✅ Done
- 🔄 In Progress
- ⬜ Not Started

---

## Session 1 — 2026-04-27 — Critical Backend Fixes

### Batch 1 — Gateway & Auth

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | Add `GatewaySecurityConfig.java` to API Gateway | ✅ | Permits all exchanges, disables Spring Security defaults |
| 2 | Exclude `spring-boot-starter-web` from API Gateway pom.xml | ✅ | Added exclusions for tomcat + webmvc |
| 3 | Add `SessionCreationPolicy.STATELESS` to Auth Service SecurityConfig | ✅ | |
| 4 | Fix CRM `updatePurchaseTotal` — add X-User-Id + user ownership check | ✅ | Controller + Service updated |
| 5 | Add CORS `globalcors` block to API Gateway application.yml | ✅ | |

### Batch 2 — Mobile MVP Screens

| # | Task | Status | Notes |
|---|------|--------|-------|
| 6 | Add Customers tab to mobile app | ✅ | customers.tsx — list + create modal |
| 7 | Add Edit + Delete to Inventory screen | ✅ | modal, edit/delete buttons, handlers |
| 8 | Add Sales History section | ✅ | POS/History tabs, history card list |

### Batch 3 — Infrastructure

| # | Task | Status | Notes |
|---|------|--------|-------|
| 9 | Dockerize all Spring Boot services | ✅ | docker-compose.yml + 6 Dockerfiles (multi-stage) |

---

## Session 2 — 2026-05-03 — Backend Completion + Mobile Polish

| # | Task | Status | Notes |
|---|------|--------|-------|
| 10 | Add `DELETE /customers/{id}` to CRM service | ✅ | |
| 11 | Add `GET /sales/analytics/weekly` to Sales service | ✅ | DailyRevenueDTO added |
| 12 | Add `PUT /auth/profile` to Auth service | ✅ | UpdateProfileRequest DTO |
| 13 | Customers screen: search + edit + delete + pull-to-refresh | ✅ | |
| 14 | Customers service: updateCustomer + deleteCustomer | ✅ | |
| 15 | Sales POS: payment method selector (CASH/CARD/DIGITAL) | ✅ | |
| 16 | Home: real weekly chart data from `/sales/analytics/weekly` | ✅ | |
| 17 | Settings: Edit Profile modal wired to `PUT /auth/profile` | ✅ | |
| 18 | AuthContext: expose `updateUser()` | ✅ | Updates SecureStore + state |
| 19 | Sales History: pull-to-refresh | ✅ | |

---

## Session 3 — 2026-05-12 — Supplier Management + Web Dashboard

### Backend — Inventory Service

| # | Task | Status | Notes |
|---|------|--------|-------|
| 20 | Flyway V2 migration — `suppliers` table | ✅ | `V2__Add_Suppliers.sql` |
| 21 | Supplier entity, DTO, repository | ✅ | |
| 22 | SupplierService with findOrCreate + update | ✅ | Auto-creates on product create/edit |
| 23 | SupplierController (`GET /inventory/suppliers`, `PUT /inventory/suppliers/{id}`) | ✅ | |
| 24 | Hook supplier auto-create into ProductService | ✅ | createProduct + updateProduct |

### Mobile

| # | Task | Status | Notes |
|---|------|--------|-------|
| 25 | Add `supplier` field to Product type + CreateProductPayload | ✅ | |
| 26 | Add supplier input to Add Product screen | ✅ | |
| 27 | Add supplier field to inventory edit modal | ✅ | |
| 28 | New Suppliers tab screen (search + edit modal) | ✅ | |
| 29 | Add Suppliers tab to `_layout.tsx` | ✅ | |

### Web Dashboard

| # | Task | Status | Notes |
|---|------|--------|-------|
| 30 | AddProductModal — edit mode (PUT /api/products/{id}) | ✅ | |
| 31 | Inventory page — edit/delete per row + search (InventoryClient.tsx) | ✅ | |
| 32 | API routes — PUT/DELETE `/api/products/[id]` | ✅ | |
| 33 | New Suppliers page with balance summary | ✅ | |
| 34 | EditSupplierModal component | ✅ | |
| 35 | API routes — GET/PUT `/api/suppliers` | ✅ | |
| 36 | Add Suppliers nav item to Sidebar | ✅ | |

---

## Session 4 — 2026-05-19 — Lead Tracking + Customer UI Redesign

### CRM Service — Lead Feature (Backend)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 37 | Flyway V3 migration — `leads` table | ✅ | stage, source, estimated_value, follow_up_date |
| 38 | `Lead.java` entity | ✅ | Uses LocalDate for followUpDate |
| 39 | `LeadDTO.java`, `CreateLeadRequest.java`, `UpdateLeadRequest.java` | ✅ | |
| 40 | `LeadRepository.java` | ✅ | findByUserId, findByIdAndUserId, findByUserIdAndStage |
| 41 | `LeadService.java` — CRUD + convertToCustomer() | ✅ | convertToCustomer: creates Customer, deletes Lead, @Transactional |
| 42 | `LeadController.java` — 6 endpoints at `/leads` | ✅ | GET, POST, PUT, DELETE, POST /convert |
| 43 | `LeadNotFoundException.java` | ✅ | |
| 44 | Update `GlobalExceptionHandler` to handle LeadNotFoundException | ✅ | Combined handler for both not-found types |
| 45 | Update `SecurityConfig` — add `/leads/**` to permitAll | ✅ | |

### API Gateway Fix

| # | Task | Status | Notes |
|---|------|--------|-------|
| 46 | Add `/leads/**` to CRM service route predicate | ✅ | `Path=/customers/**,/leads/**` |

### Mobile — Leads Screen

| # | Task | Status | Notes |
|---|------|--------|-------|
| 47 | `mobile/services/leads.ts` — full API service | ✅ | getLeads, createLead, updateLead, deleteLead, convertToCustomer |
| 48 | `mobile/app/(tabs)/leads.tsx` — full leads screen | ✅ | Stage filter tabs, expandable accordion cards, stage stepper arrows, overdue follow-up warning, convert flow |
| 49 | Add Leads tab to `_layout.tsx` (funnel-outline icon) | ✅ | Between Customers and AI |

### Mobile — Customer Screen Redesign

| # | Task | Status | Notes |
|---|------|--------|-------|
| 50 | Remove "Total" from collapsed customer card | ✅ | Cleaner card header |
| 51 | Expandable accordion customer cards | ✅ | LayoutAnimation, one card open at a time |
| 52 | Expanded view: full details + Edit/History/Delete action buttons | ✅ | |
| 53 | Purchase History modal | ✅ | Fetches all sales, filters by customerId, shows per-sale rows |

### Bug Fixes

| # | Task | Status | Notes |
|---|------|--------|-------|
| 54 | Fix `InputField.tsx` — remove `flex: 1` from wrapper | ✅ | Was causing smudged login/register input fields |
| 55 | Fix `application.yml` (crm-service) — add fallback defaults for env vars | ✅ | `${CRM_DB_URL:jdbc:postgresql://localhost:5432/crm_db}` |
| 56 | Fix gateway route — `/leads/**` not routed to CRM service | ✅ | Was blocking all lead API calls |
| 57 | Fix CRM SecurityConfig — `/leads/**` not in permitAll | ✅ | Was returning 401 for lead endpoints |

---

## Session 5 — 2026-05-19 — AI Fix + Multi-Turn Conversation

### AI Service — Backend

| # | Task | Status | Notes |
|---|------|--------|-------|
| 58 | Create `backend/ai-service/Dockerfile` | ✅ | Was missing — service was never dockerized |
| 59 | Uncomment & fix `ai-service` in `docker-compose.yml` | ✅ | Was commented out; fixed `OPENAI_API_KEY` → `GEMINI_API_KEY`; added `INVENTORY_SERVICE_URL` + `SALES_SERVICE_URL` env vars; remapped host port to 8887 (8085 was taken) |
| 60 | Fix `AiService.java` — replace hardcoded `localhost` URLs | ✅ | Now reads from `@Value("${app.inventory-url}")` + `@Value("${app.sales-url}")` — works in both Docker and local |
| 61 | Add multi-turn conversation to `AiService.java` | ✅ | Builds Gemini `contents` array from full message history; `"ai"` role mapped to `"model"` for Gemini; context injected into first user turn |
| 62 | Update `AiQueryRequest.java` — accept message list | ✅ | Changed from `String question` to `List<ChatMessage> messages` (nested record) |
| 63 | Update `application.yml` (ai-service) | ✅ | Added `inventory-url` and `sales-url` with localhost fallbacks for local dev |

### Mobile — AI Screen

| # | Task | Status | Notes |
|---|------|--------|-------|
| 64 | Fix `KeyboardAvoidingView` for Android | ✅ | Changed `undefined` → `'height'`; added `keyboardShouldPersistTaps="handled"` |
| 65 | Pass full conversation history in `send()` | ✅ | `queryAi(updatedMessages)` sends all messages including current one |
| 66 | Update `mobile/services/ai.ts` | ✅ | `queryAi` now accepts `ChatMessage[]`; exported `ChatMessage` type |

---

## Session 6 — 2026-05-19 — Invoice Scanner + Voice Input

### AI Service — Backend

| # | Task | Status | Notes |
|---|------|--------|-------|
| 67 | `ParsedProduct.java`, `ParsedLead.java` DTOs | ✅ | Shared extraction result types |
| 68 | `ScanInvoiceRequest/Response.java` DTOs | ✅ | base64 image in, product list out |
| 69 | `ParseVoiceRequest/Response.java` DTOs | ✅ | text + intent in, lead or products out |
| 70 | `AiController` — `POST /ai/scan-invoice` endpoint | ✅ | |
| 71 | `AiController` — `POST /ai/parse-voice` endpoint | ✅ | |
| 72 | `AiService.scanInvoice()` — Gemini Vision multimodal call | ✅ | inline_data parts format |
| 73 | `AiService.parseVoice()` — structured JSON extraction for lead/product | ✅ | includes today's date for relative date resolution |
| 74 | `AiService.callGeminiWithParts()` / `callGeminiTextOnly()` / `callGeminiRaw()` helpers | ✅ | Refactored to share raw call logic |
| 75 | `AiService.parseProductJson()` / `parseLeadJson()` — Jackson ObjectMapper parsing | ✅ | Strips markdown fences before parse; graceful fallback on error |

### Mobile

| # | Task | Status | Notes |
|---|------|--------|-------|
| 76 | Install `expo-image-picker` + `expo-speech-recognition` | ✅ | |
| 77 | Update `app.json` — RECORD_AUDIO permission + expo-speech-recognition plugin + expo-image-picker plugin | ✅ | |
| 78 | `services/ai.ts` — `ParsedProduct`, `ParsedLead` types + `scanInvoice()`, `parseVoiceForLead()`, `parseVoiceForProducts()` | ✅ | |
| 79 | `components/ui/VoiceButton.tsx` — reusable mic button with pulse animation | ✅ | Expo Go fallback: text input modal; dev build: native SpeechRecognizer |
| 80 | `components/ui/InvoiceScanModal.tsx` — 4-step flow: camera → processing → review → save | ✅ | Match detection (green chip) vs new product (amber chip); addRow/deleteRow; stock top-up for matches |
| 81 | `inventory.tsx` — camera FAB + voice FAB above existing add FAB | ✅ | Voice → parseVoiceForProducts → InvoiceScanModal pre-loaded |
| 82 | `leads.tsx` — voice button in header | ✅ | Voice → parseVoiceForLead → pre-filled create modal |
| 83 | `ai.tsx` — camera icon + mic icon in input row | ✅ | Camera opens InvoiceScanModal; mic fills chat input box |

---

## Session 7 — 2026-05-21 — AI Quality Improvements + API Spam Fix

### AI Service — Backend

| # | Task | Status | Notes |
|---|------|--------|-------|
| 84 | Switch Gemini model to `gemini-2.5-flash-lite` | ✅ | 2.0 models have `limit:0` from Nepal; 2.5 models work without billing |
| 85 | Rewrite `buildContext()` — 5 human-readable context sources | ✅ | Today's sales, weekly sales breakdown, low stock, inventory total value, customer overdue summary |
| 86 | New system prompt — remove 3-sentence cap, add bullet-point guidance | ✅ | Structured, practical answers; NPR currency; handles [unavailable] gracefully |
| 87 | Add CRM context source to AI service | ✅ | New `@Value crmBase` field; fetches `/customers` for overdue payment summary |
| 88 | Update `application.yml` (ai-service) — add `crm-url` | ✅ | `${CRM_SERVICE_URL:http://localhost:8083}` |
| 89 | Update `docker-compose.yml` — add `CRM_SERVICE_URL` env var + `crm-service` dependency to ai-service | ✅ | |

### Mobile — Home Tab

| # | Task | Status | Notes |
|---|------|--------|-------|
| 90 | Remove auto-`getDailyInsight()` on Home tab mount | ✅ | Was spamming Gemini API on every tab navigation and Docker rebuild |
| 91 | Add tap-to-load insight flow with spinner | ✅ | Shows "Tap to get today's business insight" → spinner → result + "Ask more questions →" |

---

## Session 8 — 2026-05-21 — Web Dashboard Feature Parity

### Phase A — Fix AI Waste + API Mismatch

| # | Task | Status | Notes |
|---|------|--------|-------|
| 92 | Remove auto `/ai/insights` call from overview server component | ✅ | Was calling Gemini on every page render |
| 93 | Fix `AiInsightCard` — remove `initialInsight` prop, fix payload to `{ messages: [...] }` | ✅ | Was sending `{ question }` but backend expects `{ messages }` array |

### Phase B — Customers Enhancement

| # | Task | Status | Notes |
|---|------|--------|-------|
| 94 | Create `CustomersClient.tsx` — search, edit, delete, purchase history modal | ✅ | Filters sales client-side by customerId |
| 95 | Create `/api/customers/[id]/route.ts` — PUT + DELETE | ✅ | |
| 96 | Add `GET` handler to `/api/customers/route.ts` | ✅ | Needed for AddSaleModal customer search |
| 97 | Update `AddCustomerModal` — edit mode support (PUT + pre-fill) | ✅ | Accepts optional `customer` + `onSaved` props |
| 98 | Update `customers/page.tsx` — fetch sales + use CustomersClient | ✅ | Sales fetched server-side, passed to client |

### Phase C — Leads Page (New)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 99 | Create `/api/leads/route.ts` — GET + POST | ✅ | |
| 100 | Create `/api/leads/[id]/route.ts` — PUT + DELETE | ✅ | |
| 101 | Create `/api/leads/[id]/convert/route.ts` — POST | ✅ | |
| 102 | Create `AddLeadModal.tsx` — add + edit, all fields, stage/source chips | ✅ | |
| 103 | Create `LeadsClient.tsx` — stage filter tabs, expandable cards, stage stepper, convert | ✅ | Overdue follow-up warning; convert only shown for WON leads |
| 104 | Create `leads/page.tsx` — server component, initial fetch | ✅ | |

### Phase D — AI Chat Page (New)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 105 | Create `/api/ai/scan-invoice/route.ts` | ✅ | Forwards base64 image to AI service |
| 106 | Create `dashboard/ai/page.tsx` — full chat UI | ✅ | Quick prompts, conversation history, file upload for invoice scan, no auto AI calls |
| 107 | Create `/api/products/route.ts` GET handler | ✅ | Needed by AI page for product match detection |
| 108 | Create `/api/products/[id]/stock/route.ts` — PUT | ✅ | Needed by AI page to top-up matched product stock |

### Phase E — Settings Page (New)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 109 | Create `/api/auth/profile/route.ts` — PUT | ✅ | Updates session cookie with new fullName |
| 110 | Create `/api/auth/me/route.ts` — GET | ✅ | Returns session data + phone from backend profile |
| 111 | Create `dashboard/settings/page.tsx` — profile display + inline edit form | ✅ | |

### Phase F — Sales + Sidebar

| # | Task | Status | Notes |
|---|------|--------|-------|
| 112 | Update `AddSaleModal` — add DUE payment type + optional customer search dropdown | ✅ | Auto-suggests from existing customers; DUE shown in red |
| 113 | Update `sales/page.tsx` — add DUE to payment labels + styled DUE badge | ✅ | |
| 114 | Update `Sidebar.tsx` — add Leads, AI Assistant, Settings nav entries | ✅ | |

---

## Session 9 — 2026-05-24 — AI Fix + Attachment-based Chat

### AI Service — Backend

| # | Task | Status | Notes |
|---|------|--------|-------|
| 115 | Fix 403 FORBIDDEN — update Gemini model to `gemini-2.5-flash` | ✅ | Old GCP project was denied; model also updated from `gemini-2.5-flash-lite` |
| 116 | Fix null pointer in `callGeminiRaw()` response parsing | ✅ | Added null check on `content` for safety-blocked responses |
| 117 | Extend `AiQueryRequest.java` — add `image`, `mimeType`, `fileText` optional fields | ✅ | Supports images and Excel (text) attachments |
| 118 | Extend `AiQueryResponse.java` — add `List<ParsedProduct> products` | ✅ | Null for regular chat; populated when AI extracts products |
| 119 | Update `AiController.java` — pass new fields to service | ✅ | |
| 120 | Add `processWithImage()` to AiService — vision call with PRODUCTS_JSON delimiter | ✅ | User prompt + image → Gemini Vision → text response + optional product list |
| 121 | Add `processWithFileText()` to AiService — text/Excel processing | ✅ | CSV text injected into prompt; PRODUCTS_JSON delimiter parsed out |
| 122 | Add `splitResponseAndProducts()` helper — PRODUCTS_JSON delimiter parsing | ✅ | Splits AI response into text + structured product list |

### Mobile

| # | Task | Status | Notes |
|---|------|--------|-------|
| 123 | Install `xlsx`, `expo-document-picker`, `expo-file-system` in mobile | ✅ | |
| 124 | Update `mobile/services/ai.ts` — `queryAi()` now accepts optional attachment | ✅ | Returns `QueryAiResponse { response, products? }` instead of plain string |
| 125 | Rewrite `mobile/app/(tabs)/ai.tsx` — unified attachment picker | ✅ | Paperclip icon → Alert sheet (Photo / Excel); attachment chip shown above input; InvoiceScanModal pre-loaded from AI response products |

### Web

| # | Task | Status | Notes |
|---|------|--------|-------|
| 126 | Install `xlsx` in web | ✅ | |
| 127 | Rewrite `frontend/web/src/app/dashboard/ai/page.tsx` — unified attachment | ✅ | Single file input accepts image/* + .xlsx; Excel parsed client-side with SheetJS; review panel triggered from `/ai/query` response; fixed role mapping bug ('model'→'ai') |

---

## Session 10 — 2026-05-24 — AI Auto-Category Inference

### AI Service — Backend

| # | Task | Status | Notes |
|---|------|--------|-------|
| 128 | Add `String category` to `ParsedProduct.java` record | ✅ | Nullable; backward-compatible — absent from JSON deserializes as null |
| 129 | Update `scanInvoice()` prompt — include `category` in JSON template | ✅ | Instructs Gemini to infer 1-2 word category from product name |
| 130 | Update `processWithImage()` PRODUCTS_JSON template — add category | ✅ | Same inference instruction for attachment-based chat |
| 131 | Update `processWithFileText()` PRODUCTS_JSON template — add category | ✅ | Same for Excel/CSV text attachment flow |

### Mobile

| # | Task | Status | Notes |
|---|------|--------|-------|
| 132 | Add `category?: string` to `ParsedProduct` type in `ai.ts` | ✅ | Already matches backend field |
| 133 | Add Category `TextInput` to `InvoiceScanModal` review row UI | ✅ | Editable; below qty/rate row |
| 134 | Pass `category` in `handleSave()` → `createProduct()` call | ✅ | `row.category?.trim() || undefined` |
| 135 | Handle `'category'` as string field in `updateRow()` | ✅ | Avoids `parseFloat()` coercion |
| 136 | Update `addRow()` default — include `category: ''` | ✅ | Consistent empty state for manually added rows |

### Web

| # | Task | Status | Notes |
|---|------|--------|-------|
| 137 | Add `category?: string` to `ParsedProduct` and `ReviewProduct` types | ✅ | |
| 138 | Map `p.category` from AI response into `ReviewProduct` objects | ✅ | Populated from Gemini inference |
| 139 | Add category input field to review panel rows | ✅ | Between name and qty; editable |
| 140 | Pass `category` in `saveScannedProducts()` POST body for new products | ✅ | `p.category || undefined` |
| 141 | Fix `updateReviewProduct()` — treat `'category'` as string field | ✅ | `stringFields` array guards against `Number()` coercion |

---

## Session 11 — 2026-05-24 — Pagination + Redis Caching

### Backend — Inventory Service

| # | Task | Status | Notes |
|---|------|--------|-------|
| 142 | Add `spring-boot-starter-data-redis` + `spring-boot-starter-cache` to pom.xml | ✅ | No version needed; managed by Spring Boot parent BOM |
| 143 | Add Redis config block to `application.yml` | ✅ | `${REDIS_HOST:localhost}` fallback for local dev |
| 144 | Create `CacheConfig.java` | ✅ | `@EnableCaching`, `RedisCacheManager`, `GenericJackson2JsonRedisSerializer`, 5 min TTL |
| 145 | Create `PagedResponse<T>` record DTO | ✅ | `content`, `currentPage`, `totalPages`, `totalElements`, `hasNext` |
| 146 | `ProductRepository` — add `Page<Product> findAllByUserId(userId, pageable)` | ✅ | Kept existing List version for internal use |
| 147 | `SupplierRepository` — add `Page<Supplier> findAllByUserIdOrderByNameAsc(userId, pageable)` | ✅ | |
| 148 | `ProductService` — paginate `findAll()`, add `@Cacheable`/`@CacheEvict` on all writes | ✅ | Cache key: `userId:page:size`; evict `allEntries=true` on write |
| 149 | `SupplierService` — paginate `getSuppliers()`, add `@Cacheable`/`@CacheEvict` | ✅ | `findOrCreate` also evicts |
| 150 | `ProductController` — add `?page=0&size=20` params, return `PagedResponse<ProductDTO>` | ✅ | |
| 151 | `SupplierController` — add `?page=0&size=20` params, return `PagedResponse<SupplierDTO>` | ✅ | |

### Backend — CRM Service

| # | Task | Status | Notes |
|---|------|--------|-------|
| 152 | Add Redis deps + config to pom.xml and application.yml | ✅ | Same pattern as inventory |
| 153 | Create `CacheConfig.java` + `PagedResponse<T>` in crm package | ✅ | |
| 154 | `CustomerRepository` — add `Page<Customer> findByUserIdOrderByCreatedAtDesc(userId, pageable)` | ✅ | |
| 155 | `LeadRepository` — add `Page<Lead> findByUserIdOrderByCreatedAtDesc(userId, pageable)` | ✅ | |
| 156 | `CrmService` — paginate `findByUserId()`, `@CacheEvict` on all writes including `updatePurchaseTotal` + `addDueAmount` | ✅ | |
| 157 | `LeadService` — paginate `getLeads()`, `@Caching` on `convertToCustomer` evicts both `leads` + `customers` | ✅ | |
| 158 | `CustomerController` — add `?page=0&size=20` params | ✅ | |
| 159 | `LeadController` — add `?page=0&size=20` params | ✅ | |

### Infrastructure

| # | Task | Status | Notes |
|---|------|--------|-------|
| 160 | Add `redis:7-alpine` service to `docker-compose.yml` | ✅ | 256mb maxmemory, allkeys-lru policy, healthcheck |
| 161 | Add `REDIS_HOST: redis` + `REDIS_PORT: 6379` to inventory + crm services | ✅ | |
| 162 | Add `depends_on: redis: condition: service_healthy` to inventory + crm services | ✅ | |

### Mobile

| # | Task | Status | Notes |
|---|------|--------|-------|
| 163 | `services/inventory.ts` — add `PagedResponse<T>` type, update `getProducts(page, size)` | ✅ | |
| 164 | `services/suppliers.ts` — add `PagedResponse<T>` type, update `getSuppliers(page, size)` | ✅ | |
| 165 | `services/customers.ts` — add `PagedResponse<T>` type, update `getCustomers(page, size)` | ✅ | |
| 166 | `services/leads.ts` — add `PagedResponse<T>` type, update `getLeads(page, size)` | ✅ | |
| 167 | `inventory.tsx` — pagination state + `loadMore()` + `ListFooterComponent` "Load More" button | ✅ | Writes call `load()` to reset to page 0 |
| 168 | `suppliers.tsx` — pagination state + `loadMore()` + `ListFooterComponent` "Load More" button | ✅ | |
| 169 | `customers.tsx` — pagination state + `loadMore()` + bottom "Load More" in ScrollView | ✅ | |
| 170 | `leads.tsx` — pagination state + `loadMore()` + bottom "Load More" in ScrollView; `handleStageStep` keeps local mutation | ✅ | |

### Web — Bug Fixes + Pagination UI

| # | Task | Status | Notes |
|---|------|--------|-------|
| 171 | Fix all web pages broken by pagination response shape change | ✅ | Changed `apiFetch<T[]>` → `apiFetch<{content:T[]}>` + `?size=1000` on suppliers, inventory, customers, leads; fixed sales products fetch too |
| 172 | Add lenient `CacheErrorHandler` to both `CacheConfig.java` files | ✅ | Both services now implement `CachingConfigurer`; Redis GET/PUT/EVICT errors log as WARN and fall through to DB instead of propagating a 500 — root cause of "no products after tab switch" |
| 173 | Create `Pagination.tsx` reusable component | ✅ | Client component; Previous/Next `<Link>` buttons; shows "Showing X–Y of Z"; hidden when `totalPages ≤ 1` |
| 174 | Add URL-based pagination to `suppliers/page.tsx` | ✅ | Reads `?page=N` from `searchParams` (Next.js 16 Promise); fetches 15 per page; Pagination bar at bottom of table |
| 175 | Add URL-based pagination to `inventory/page.tsx` + `InventoryClient.tsx` | ✅ | Server passes `currentPage`, `totalPages`, `totalElements`, `pageSize` to client; Pagination bar in table card |
| 176 | Add URL-based pagination to `customers/page.tsx` + `CustomersClient.tsx` | ✅ | Same pattern; `totalElements` shown in subtitle |
| 177 | Add URL-based pagination to `leads/page.tsx` + `LeadsClient.tsx` | ✅ | Same pattern; pagination rendered in its own white card below the lead list |

---

## Phase 2 Backlog (Post-MVP)

| # | Task | Status | Notes |
|---|------|--------|-------|
| B1 | Messaging Service / Unified Inbox | ⬜ | WhatsApp/Instagram Business API |
| B2 | Firebase push notifications | ⬜ | Low stock alerts, follow-up reminders |
| B3 | Refresh token flow in mobile | ⬜ | Auto re-login on token expiry |
| B4 | Change Password endpoint + mobile flow | ⬜ | PUT /auth/password |
| B5 | Language support (Nepali i18n) | ⬜ | |
| B6 | Barcode scanning in inventory | ⬜ | Expo Camera integration |

---

## Files Changed — Complete List

### Session 1
- `backend/api-gateway/src/main/java/com/smartbiz/gateway/config/GatewaySecurityConfig.java` (NEW)
- `backend/api-gateway/pom.xml`
- `backend/api-gateway/src/main/resources/application.yml`
- `backend/auth-service/src/main/java/com/smartbiz/auth/config/SecurityConfig.java`
- `backend/crm-service/src/main/java/com/smartbiz/crm/controller/CustomerController.java`
- `backend/crm-service/src/main/java/com/smartbiz/crm/service/CrmService.java`
- `docker-compose.yml`
- 6× Dockerfiles (eureka, gateway, auth, inventory, crm, sales)

### Session 2
- `backend/crm-service/…/controller/CustomerController.java`
- `backend/crm-service/…/service/CrmService.java`
- `backend/sales-service/…/controller/SalesController.java`
- `backend/sales-service/…/service/SalesService.java`
- `backend/sales-service/…/dto/DailyRevenueDTO.java` (NEW)
- `backend/auth-service/…/controller/AuthController.java`
- `backend/auth-service/…/service/UserService.java`
- `backend/auth-service/…/dto/UpdateProfileRequest.java` (NEW)
- `mobile/services/customers.ts`
- `mobile/services/sales.ts`
- `mobile/services/auth.ts`
- `mobile/contexts/AuthContext.tsx`
- `mobile/app/(tabs)/customers.tsx`
- `mobile/app/(tabs)/sales.tsx`
- `mobile/app/(tabs)/index.tsx`
- `mobile/app/(tabs)/settings.tsx`

### Session 3
- `backend/inventory-service/…/db/migration/V2__Add_Suppliers.sql` (NEW)
- `backend/inventory-service/…/model/Supplier.java` (NEW)
- `backend/inventory-service/…/dto/SupplierDTO.java` (NEW)
- `backend/inventory-service/…/dto/UpdateSupplierRequest.java` (NEW)
- `backend/inventory-service/…/repository/SupplierRepository.java` (NEW)
- `backend/inventory-service/…/service/SupplierService.java` (NEW)
- `backend/inventory-service/…/controller/SupplierController.java` (NEW)
- `backend/inventory-service/…/service/ProductService.java`
- `mobile/services/inventory.ts`
- `mobile/services/suppliers.ts` (NEW)
- `mobile/app/add-product.tsx`
- `mobile/app/(tabs)/inventory.tsx`
- `mobile/app/(tabs)/suppliers.tsx` (NEW)
- `mobile/app/(tabs)/_layout.tsx`
- `frontend/web/src/components/AddProductModal.tsx`
- `frontend/web/src/components/EditSupplierModal.tsx` (NEW)
- `frontend/web/src/app/dashboard/inventory/page.tsx`
- `frontend/web/src/app/dashboard/inventory/InventoryClient.tsx` (NEW)
- `frontend/web/src/app/dashboard/suppliers/page.tsx` (NEW)
- `frontend/web/src/app/api/products/[id]/route.ts` (NEW)
- `frontend/web/src/app/api/suppliers/route.ts` (NEW)
- `frontend/web/src/app/api/suppliers/[id]/route.ts` (NEW)
- `frontend/web/src/components/Sidebar.tsx`

### Session 4
- `backend/crm-service/…/db/migration/V3__Create_Leads_Table.sql` (NEW)
- `backend/crm-service/…/model/Lead.java` (NEW)
- `backend/crm-service/…/dto/LeadDTO.java` (NEW)
- `backend/crm-service/…/dto/CreateLeadRequest.java` (NEW)
- `backend/crm-service/…/dto/UpdateLeadRequest.java` (NEW)
- `backend/crm-service/…/repository/LeadRepository.java` (NEW)
- `backend/crm-service/…/service/LeadService.java` (NEW)
- `backend/crm-service/…/controller/LeadController.java` (NEW)
- `backend/crm-service/…/exception/LeadNotFoundException.java` (NEW)
- `backend/crm-service/…/exception/GlobalExceptionHandler.java`
- `backend/crm-service/…/config/SecurityConfig.java`
- `backend/crm-service/src/main/resources/application.yml`
- `backend/api-gateway/src/main/resources/application.yml`
- `mobile/services/leads.ts` (NEW)
- `mobile/app/(tabs)/leads.tsx` (NEW)
- `mobile/app/(tabs)/customers.tsx` (redesigned — expandable cards + history modal)
- `mobile/app/(tabs)/_layout.tsx`
- `mobile/components/ui/InputField.tsx`

### Sessions 5–7
- `backend/ai-service/Dockerfile` (NEW)
- `backend/ai-service/src/main/resources/application.yml`
- `backend/ai-service/src/main/java/com/smartbiz/ai/dto/AiQueryRequest.java`
- `backend/ai-service/src/main/java/com/smartbiz/ai/dto/ParsedProduct.java` (NEW)
- `backend/ai-service/src/main/java/com/smartbiz/ai/dto/ParsedLead.java` (NEW)
- `backend/ai-service/src/main/java/com/smartbiz/ai/service/AiService.java`
- `backend/ai-service/src/main/java/com/smartbiz/ai/controller/AiController.java`
- `docker-compose.yml`
- `mobile/services/ai.ts`
- `mobile/app/(tabs)/ai.tsx`
- `mobile/app/(tabs)/index.tsx`
- `mobile/components/ui/VoiceButton.tsx` (NEW)
- `mobile/components/ui/InvoiceScanModal.tsx` (NEW)
- `mobile/app/app.json`

### Session 8
- `frontend/web/src/app/dashboard/ai/page.tsx` (NEW)
- `frontend/web/src/app/dashboard/leads/page.tsx` (NEW)
- `frontend/web/src/app/dashboard/settings/page.tsx` (NEW)
- `frontend/web/src/components/CustomersClient.tsx` (NEW)
- `frontend/web/src/components/LeadsClient.tsx` (NEW)
- `frontend/web/src/components/AddLeadModal.tsx` (NEW)
- `frontend/web/src/components/AddSaleModal.tsx`
- `frontend/web/src/app/dashboard/customers/page.tsx`
- `frontend/web/src/app/dashboard/sales/page.tsx`
- `frontend/web/src/app/api/ai/query/route.ts` (NEW)
- `frontend/web/src/app/api/leads/route.ts` (NEW)
- `frontend/web/src/app/api/leads/[id]/route.ts` (NEW)
- `frontend/web/src/app/api/leads/[id]/convert/route.ts` (NEW)
- `frontend/web/src/app/api/customers/[id]/route.ts` (NEW)
- `frontend/web/src/app/api/products/route.ts`
- `frontend/web/src/app/api/products/[id]/stock/route.ts` (NEW)
- `frontend/web/src/app/api/auth/profile/route.ts` (NEW)
- `frontend/web/src/app/api/auth/me/route.ts` (NEW)
- `frontend/web/src/components/Sidebar.tsx`

### Session 9
- `backend/ai-service/src/main/resources/application.yml`
- `backend/ai-service/src/main/java/com/smartbiz/ai/dto/AiQueryRequest.java`
- `backend/ai-service/src/main/java/com/smartbiz/ai/dto/AiQueryResponse.java`
- `backend/ai-service/src/main/java/com/smartbiz/ai/controller/AiController.java`
- `backend/ai-service/src/main/java/com/smartbiz/ai/service/AiService.java`
- `mobile/services/ai.ts`
- `mobile/app/(tabs)/ai.tsx` (rewritten)
- `frontend/web/src/app/dashboard/ai/page.tsx` (rewritten)

### Session 10
- `backend/ai-service/src/main/java/com/smartbiz/ai/dto/ParsedProduct.java`
- `backend/ai-service/src/main/java/com/smartbiz/ai/service/AiService.java`
- `mobile/services/ai.ts`
- `mobile/components/ui/InvoiceScanModal.tsx`
- `frontend/web/src/app/dashboard/ai/page.tsx`

### Session 11
- `backend/inventory-service/pom.xml`
- `backend/inventory-service/src/main/resources/application.yml`
- `backend/inventory-service/src/main/java/com/smartbiz/inventory/config/CacheConfig.java` (NEW → updated with `CachingConfigurer` + lenient error handler)
- `backend/inventory-service/src/main/java/com/smartbiz/inventory/dto/PagedResponse.java` (NEW)
- `backend/inventory-service/src/main/java/com/smartbiz/inventory/repository/ProductRepository.java`
- `backend/inventory-service/src/main/java/com/smartbiz/inventory/repository/SupplierRepository.java`
- `backend/inventory-service/src/main/java/com/smartbiz/inventory/service/ProductService.java`
- `backend/inventory-service/src/main/java/com/smartbiz/inventory/service/SupplierService.java`
- `backend/inventory-service/src/main/java/com/smartbiz/inventory/controller/ProductController.java`
- `backend/inventory-service/src/main/java/com/smartbiz/inventory/controller/SupplierController.java`
- `backend/inventory-service/src/test/java/com/smartbiz/inventory/service/ProductServiceTest.java`
- `backend/crm-service/pom.xml`
- `backend/crm-service/src/main/resources/application.yml`
- `backend/crm-service/src/main/java/com/smartbiz/crm/config/CacheConfig.java` (NEW → updated with `CachingConfigurer` + lenient error handler)
- `backend/crm-service/src/main/java/com/smartbiz/crm/dto/PagedResponse.java` (NEW)
- `backend/crm-service/src/main/java/com/smartbiz/crm/repository/CustomerRepository.java`
- `backend/crm-service/src/main/java/com/smartbiz/crm/repository/LeadRepository.java`
- `backend/crm-service/src/main/java/com/smartbiz/crm/service/CrmService.java`
- `backend/crm-service/src/main/java/com/smartbiz/crm/service/LeadService.java`
- `backend/crm-service/src/main/java/com/smartbiz/crm/controller/CustomerController.java`
- `backend/crm-service/src/main/java/com/smartbiz/crm/controller/LeadController.java`
- `docker-compose.yml`
- `mobile/services/inventory.ts`
- `mobile/services/suppliers.ts`
- `mobile/services/customers.ts`
- `mobile/services/leads.ts`
- `mobile/app/(tabs)/inventory.tsx`
- `mobile/app/(tabs)/suppliers.tsx`
- `mobile/app/(tabs)/customers.tsx`
- `mobile/app/(tabs)/leads.tsx`
- `frontend/web/src/components/Pagination.tsx` (NEW)
- `frontend/web/src/app/dashboard/inventory/page.tsx`
- `frontend/web/src/app/dashboard/inventory/InventoryClient.tsx`
- `frontend/web/src/app/dashboard/suppliers/page.tsx`
- `frontend/web/src/app/dashboard/customers/page.tsx`
- `frontend/web/src/app/dashboard/customers/CustomersClient.tsx`
- `frontend/web/src/app/dashboard/leads/page.tsx`
- `frontend/web/src/app/dashboard/leads/LeadsClient.tsx`
- `frontend/web/src/app/dashboard/sales/page.tsx`
