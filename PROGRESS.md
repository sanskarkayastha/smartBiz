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
