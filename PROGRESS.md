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

## Batch 5 — Nice-to-Have (Post-MVP)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 10 | Externalize JWT secret to env variable | ⬜ | docker-compose.yml has env var, but services still need application-docker.yml |
| 11 | Implement refresh token flow in mobile | ⬜ | Out of scope for now |

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

## Next Steps (if continuing)

1. **Test Gateway:** `docker-compose up -d` → test with `curl -X POST http://localhost:8080/auth/signup ...`
2. **Fix #10 (Optional):** Create `application-docker.yml` per service to read JWT_SECRET from env
3. **Fix #11 (Post-MVP):** Add refresh token rotation to mobile auth flow
4. **Run Mobile Tests:** Connect to gateway via `http://<local-ip>:8080` from phone

## Files Changed

**Backend**
- ✅ `backend/api-gateway/src/main/java/com/smartbiz/gateway/config/GatewaySecurityConfig.java` (NEW)
- ✅ `backend/api-gateway/pom.xml` (exclusions)
- ✅ `backend/api-gateway/src/main/resources/application.yml` (CORS)
- ✅ `backend/auth-service/src/main/java/com/smartbiz/auth/config/SecurityConfig.java` (stateless)
- ✅ `backend/crm-service/src/main/java/com/smartbiz/crm/controller/CustomerController.java` (user scoping)
- ✅ `backend/crm-service/src/main/java/com/smartbiz/crm/service/CrmService.java` (user scoping)
- ✅ `docker-compose.yml` (expanded)
- ✅ 6× Dockerfiles (eureka, gateway, auth, inventory, crm, sales)

**Mobile**
- ✅ `mobile/app/(tabs)/customers.tsx` (NEW)
- ✅ `mobile/app/(tabs)/_layout.tsx` (added customers tab)
- ✅ `mobile/app/(tabs)/inventory.tsx` (edit/delete UI)
- ✅ `mobile/app/(tabs)/sales.tsx` (history tab)
