# SmartBiz Fix Progress

## Status Legend
- ✅ Done
- 🔄 In Progress
- ⬜ Not Started

---

## Batch 1 — Critical Backend Fixes (Gateway Broken)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | Add `GatewaySecurityConfig.java` to API Gateway | ✅ | NEW FILE: permits all exchanges, disables Spring Security defaults |
| 2 | Exclude `spring-boot-starter-web` from API Gateway pom.xml | ✅ | Added exclusions for tomcat + webmvc |
| 3 | Add `SessionCreationPolicy.STATELESS` to Auth Service SecurityConfig | ✅ | Added import + config |
| 4 | Fix CRM `updatePurchaseTotal` — add X-User-Id + user ownership check | ✅ | Controller + Service updated with user scoping |

## Batch 2 — API Gateway CORS

| # | Task | Status | Notes |
|---|------|--------|-------|
| 5 | Add CORS `globalcors` block to API Gateway application.yml | ✅ | Added spring.cloud.gateway.globalcors config |

## Batch 3 — Mobile Missing Screens (MVP Completion)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 6 | Add Customers tab to mobile app | ✅ | NEW FILE: customers.tsx with list + create modal |
| 7 | Add Edit + Delete product to Inventory screen | ✅ | Added modal, edit/delete buttons, handlers |
| 8 | Add Sales History section | ✅ | Added POS/History tabs, history card list |

## Batch 4 — Infrastructure

| # | Task | Status | Notes |
|---|------|--------|-------|
| 9 | Dockerize all Spring Boot services in docker-compose.yml | ✅ | Created docker-compose.yml + 6 Dockerfiles (multi-stage builds) |

## Batch 5 — Backend Completion + Frontend Polish

| # | Task | Status | Notes |
|---|------|--------|-------|
| 10 | Add `DELETE /customers/{id}` to CRM service | ✅ | CustomerController + CrmService.deleteCustomer() |
| 11 | Add `GET /sales/analytics/weekly` to Sales service | ✅ | SalesController + SalesService.getWeeklySummary() + DailyRevenueDTO |
| 12 | Add `PUT /auth/profile` to Auth service | ✅ | AuthController + UserService.updateProfile() + UpdateProfileRequest DTO |
| 13 | Customers screen: search + edit + delete | ✅ | Search bar, edit modal, delete with confirm, pull-to-refresh |
| 14 | Customers service: updateCustomer + deleteCustomer | ✅ | Added PUT /customers/{id} and DELETE /customers/{id} calls |
| 15 | Sales POS: payment method selector (CASH/CARD/DIGITAL) | ✅ | Toggle buttons in cart, passed to createSale API |
| 16 | Home: replace hardcoded weekly chart with real API data | ✅ | Calls /sales/analytics/weekly, proportional bar heights, real day labels |
| 17 | Sales service: getWeeklySummary() + DailyRevenue type | ✅ | Added to mobile/services/sales.ts |
| 18 | Settings: Edit Profile modal wired to PUT /auth/profile | ✅ | Modal with fullName/phone fields, updates AuthContext on save |
| 19 | Auth service: updateProfile() | ✅ | Added to mobile/services/auth.ts |
| 20 | AuthContext: expose updateUser() | ✅ | Updates SecureStore + in-memory user state |
| 21 | Sales History: pull-to-refresh | ✅ | RefreshControl on FlatList in History tab |

## Batch 7 — Supplier Management + Product Edit/Search

| # | Task | Status | Notes |
|---|------|--------|-------|
| 27 | Backend: Flyway V2 migration — `suppliers` table | ✅ | `V2__Add_Suppliers.sql` |
| 28 | Backend: Supplier entity, DTO, repository | ✅ | `Supplier.java`, `SupplierDTO.java`, `SupplierRepository.java` |
| 29 | Backend: SupplierService with findOrCreate + update | ✅ | Auto-creates supplier on product create/edit |
| 30 | Backend: SupplierController (`GET /inventory/suppliers`, `PUT /inventory/suppliers/{id}`) | ✅ | User-scoped |
| 31 | Backend: Hook supplier auto-create into ProductService | ✅ | createProduct + updateProduct both call findOrCreate |
| 32 | Mobile: Add `supplier` field to Product type and CreateProductPayload | ✅ | `mobile/services/inventory.ts` |
| 33 | Mobile: Add supplier input to Add Product screen | ✅ | `mobile/app/add-product.tsx` |
| 34 | Mobile: Add supplier field to inventory edit modal | ✅ | `mobile/app/(tabs)/inventory.tsx` |
| 35 | Mobile: New Suppliers tab screen with search + edit modal | ✅ | `mobile/app/(tabs)/suppliers.tsx` |
| 36 | Mobile: Add Suppliers tab to tab layout | ✅ | `mobile/app/(tabs)/_layout.tsx` |
| 37 | Web: AddProductModal supports edit mode (PUT /api/products/{id}) | ✅ | `frontend/web/src/components/AddProductModal.tsx` |
| 38 | Web: Inventory page — edit/delete per row + client-side search | ✅ | `InventoryClient.tsx` + updated `page.tsx` |
| 39 | Web: New API routes — PUT/DELETE `/api/products/[id]` | ✅ | `frontend/web/src/app/api/products/[id]/route.ts` |
| 40 | Web: New Suppliers page with balance summary | ✅ | `frontend/web/src/app/dashboard/suppliers/page.tsx` |
| 41 | Web: EditSupplierModal component | ✅ | `frontend/web/src/components/EditSupplierModal.tsx` |
| 42 | Web: New API routes — GET/PUT `/api/suppliers` | ✅ | `frontend/web/src/app/api/suppliers/route.ts` + `[id]/route.ts` |
| 43 | Web: Add Suppliers nav item to Sidebar | ✅ | `frontend/web/src/components/Sidebar.tsx` |

## Batch 6 — Nice-to-Have (Post-MVP)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 22 | Externalize JWT secret to env variable | ⬜ | docker-compose.yml has env var, but services still need application-docker.yml |
| 23 | Implement refresh token flow in mobile | ⬜ | Out of scope for now |
| 24 | Change Password flow (backend + mobile) | ⬜ | Needs PUT /auth/password endpoint + mobile modal |
| 25 | Language support (i18n) | ⬜ | Phase 2 |
| 26 | Push notifications | ⬜ | Phase 2 — Firebase integration |

---

## Session Log

### Session 1 — 2026-04-27
- **Arch Review:** Analyzed mobile app, backend microservices, API Gateway
- **Root Cause Found:** API Gateway missing Spring Security config — Spring Boot default requires HTTP Basic auth on ALL routes before JWT GlobalFilter runs
- **Status:** Completed Batch 1-4 (9 of 11 fixes):
  - ✅ Gateway security config (GatewaySecurityConfig.java)
  - ✅ Api-gateway pom exclusions
  - ✅ Auth service stateless session
  - ✅ CRM user scoping
  - ✅ CORS config
  - ✅ Customers mobile screen (new tab)
  - ✅ Inventory edit/delete UI
  - ✅ Sales history tab
  - ✅ Docker infrastructure (compose + 6 Dockerfiles)

### Session 3 — 2026-05-12
- **Supplier management:** Built end-to-end — backend entity/service/controller, mobile tab, web page
- **Auto-create flow:** Creating/editing a product with a supplier name auto-creates supplier record
- **Mobile:** New Suppliers tab (search, balance badge, edit modal); supplier field added to add-product + edit modal
- **Web:** Inventory page refactored to client component — search, edit (reuses AddProductModal in edit mode), delete; new Suppliers page with total-owed summary; Sidebar updated
- **Search note:** Mobile inventory search was already working; added search to web inventory page

### Session 2 — 2026-05-03
- **Full audit:** All 6 MVP services + all mobile screens reviewed
- **Backend finding:** Route ordering in SalesController is NOT a bug (Spring MVC prefers literal paths over variables)
- **Status:** Completed Batch 5 (12 items, #10–21):
  - ✅ CRM DELETE endpoint
  - ✅ Sales weekly analytics endpoint + DTO
  - ✅ Auth profile update endpoint + DTO
  - ✅ Customers: search, edit, delete, pull-to-refresh
  - ✅ Sales POS: payment method selector + history pull-to-refresh
  - ✅ Home: real weekly chart data
  - ✅ Settings: Edit Profile modal

---

## Files Changed

**Backend — Session 1**
- ✅ `backend/api-gateway/src/main/java/com/smartbiz/gateway/config/GatewaySecurityConfig.java` (NEW)
- ✅ `backend/api-gateway/pom.xml` (exclusions)
- ✅ `backend/api-gateway/src/main/resources/application.yml` (CORS)
- ✅ `backend/auth-service/src/main/java/com/smartbiz/auth/config/SecurityConfig.java` (stateless)
- ✅ `backend/crm-service/src/main/java/com/smartbiz/crm/controller/CustomerController.java` (user scoping)
- ✅ `backend/crm-service/src/main/java/com/smartbiz/crm/service/CrmService.java` (user scoping)
- ✅ `docker-compose.yml` (expanded)
- ✅ 6× Dockerfiles (eureka, gateway, auth, inventory, crm, sales)

**Backend — Session 2**
- ✅ `backend/crm-service/src/main/java/com/smartbiz/crm/controller/CustomerController.java` (DELETE endpoint)
- ✅ `backend/crm-service/src/main/java/com/smartbiz/crm/service/CrmService.java` (deleteCustomer)
- ✅ `backend/sales-service/src/main/java/com/smartbiz/sales/controller/SalesController.java` (weekly analytics)
- ✅ `backend/sales-service/src/main/java/com/smartbiz/sales/service/SalesService.java` (getWeeklySummary)
- ✅ `backend/sales-service/src/main/java/com/smartbiz/sales/dto/DailyRevenueDTO.java` (NEW)
- ✅ `backend/auth-service/src/main/java/com/smartbiz/auth/controller/AuthController.java` (PUT /profile)
- ✅ `backend/auth-service/src/main/java/com/smartbiz/auth/service/UserService.java` (updateProfile)
- ✅ `backend/auth-service/src/main/java/com/smartbiz/auth/dto/UpdateProfileRequest.java` (NEW)

**Mobile — Session 1**
- ✅ `mobile/app/(tabs)/customers.tsx` (NEW)
- ✅ `mobile/app/(tabs)/_layout.tsx` (added customers tab)
- ✅ `mobile/app/(tabs)/inventory.tsx` (edit/delete UI)
- ✅ `mobile/app/(tabs)/sales.tsx` (history tab)

**Backend — Session 3**
- ✅ `backend/inventory-service/src/main/resources/db/migration/V2__Add_Suppliers.sql` (NEW)
- ✅ `backend/inventory-service/src/main/java/com/smartbiz/inventory/model/Supplier.java` (NEW)
- ✅ `backend/inventory-service/src/main/java/com/smartbiz/inventory/dto/SupplierDTO.java` (NEW)
- ✅ `backend/inventory-service/src/main/java/com/smartbiz/inventory/dto/UpdateSupplierRequest.java` (NEW)
- ✅ `backend/inventory-service/src/main/java/com/smartbiz/inventory/repository/SupplierRepository.java` (NEW)
- ✅ `backend/inventory-service/src/main/java/com/smartbiz/inventory/service/SupplierService.java` (NEW)
- ✅ `backend/inventory-service/src/main/java/com/smartbiz/inventory/controller/SupplierController.java` (NEW)
- ✅ `backend/inventory-service/src/main/java/com/smartbiz/inventory/service/ProductService.java` (supplier hook)

**Mobile — Session 3**
- ✅ `mobile/services/inventory.ts` (added supplier to Product + CreateProductPayload types)
- ✅ `mobile/services/suppliers.ts` (NEW)
- ✅ `mobile/app/add-product.tsx` (supplier input field)
- ✅ `mobile/app/(tabs)/inventory.tsx` (supplier field in edit modal)
- ✅ `mobile/app/(tabs)/suppliers.tsx` (NEW)
- ✅ `mobile/app/(tabs)/_layout.tsx` (Suppliers tab added)

**Web — Session 3**
- ✅ `frontend/web/src/components/AddProductModal.tsx` (edit mode support)
- ✅ `frontend/web/src/components/EditSupplierModal.tsx` (NEW)
- ✅ `frontend/web/src/app/dashboard/inventory/page.tsx` (delegates to InventoryClient)
- ✅ `frontend/web/src/app/dashboard/inventory/InventoryClient.tsx` (NEW — search, edit, delete)
- ✅ `frontend/web/src/app/dashboard/suppliers/page.tsx` (NEW)
- ✅ `frontend/web/src/app/api/products/[id]/route.ts` (NEW — PUT/DELETE)
- ✅ `frontend/web/src/app/api/suppliers/route.ts` (NEW — GET)
- ✅ `frontend/web/src/app/api/suppliers/[id]/route.ts` (NEW — PUT)
- ✅ `frontend/web/src/components/Sidebar.tsx` (Suppliers nav item)

**Mobile — Session 2**
- ✅ `mobile/services/customers.ts` (updateCustomer, deleteCustomer)
- ✅ `mobile/services/sales.ts` (getWeeklySummary, DailyRevenue type)
- ✅ `mobile/services/auth.ts` (updateProfile)
- ✅ `mobile/contexts/AuthContext.tsx` (updateUser)
- ✅ `mobile/app/(tabs)/customers.tsx` (search, edit, delete, pull-to-refresh)
- ✅ `mobile/app/(tabs)/sales.tsx` (payment method selector, history pull-to-refresh)
- ✅ `mobile/app/(tabs)/index.tsx` (real weekly chart)
- ✅ `mobile/app/(tabs)/settings.tsx` (Edit Profile modal)
