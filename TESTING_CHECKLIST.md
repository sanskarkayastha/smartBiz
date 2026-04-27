# SmartBiz Testing Checklist

**Date:** 2026-04-27  
**Purpose:** Verify all 9 fixes work end-to-end before declaring MVP ready

---

## Pre-Test Setup

- [ ] All code changes committed and pushed
- [ ] Docker installed and running
- [ ] No services running on ports 5432, 8080, 8761, 8081-8084
- [ ] Read FIXES_SUMMARY.md for architectural overview

---

## Batch 1: Backend Critical Fixes

### Fix #1-2: API Gateway Works
```
Test: curl -X POST http://localhost:8080/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test1@test.com","password":"Qwerty123!","fullName":"Alice"}'
```
- [ ] Response includes `access_token` (not 401 Unauthorized)
- [ ] Response includes `userId` and `refresh_token`
- [ ] Confirms GatewaySecurityConfig permits auth routes
- [ ] Confirms JWT filter is reachable

### Fix #3: Auth Service Stateless
```
Test: Check auth service logs (docker-compose logs auth-service) during login
```
- [ ] No WARNING about "cannot map HttpRequest to Principal"
- [ ] No session-related debug logs
- [ ] Startup completes cleanly

### Fix #4: CRM User Scoping
```
# First, get a valid token from signup above
TOKEN="eyJ..."
USERID=1

# Try to update customer belonging to another user (should fail)
curl -X PUT http://localhost:8080/customers/999/purchase \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '1000'
```
- [ ] Returns 404 or permission error (not 200)
- [ ] Confirms user isolation is enforced
- [ ] X-User-Id header is validated

---

## Batch 2: CORS

### Fix #5: API Gateway CORS
```
Test: (Browser console, or curl)
curl -i -X OPTIONS http://localhost:8080/inventory/products \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET"
```
- [ ] Response includes `Access-Control-Allow-Origin: *`
- [ ] Response includes `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
- [ ] Response includes `Access-Control-Allow-Headers: Authorization, X-User-Id, Content-Type`

---

## Batch 3: Mobile Screens

### Fix #6: Customers Tab
- [ ] `mobile/app/(tabs)/customers.tsx` exists and compiles
- [ ] Tab labeled "Customers" appears in bottom navigation (between Sales and Settings)
- [ ] Open Customers tab → shows empty state ("No customers yet")
- [ ] Click "Add" button → modal appears
- [ ] Fill form: name="John", phone="98XXXXX", email="john@test.com"
- [ ] Click "Save Customer" → API call succeeds
- [ ] Customer card appears in list with avatar (JO), name, phone

### Fix #7: Inventory Edit/Delete
- [ ] `mobile/app/(tabs)/inventory.tsx` shows product cards with delete button (trash icon)
- [ ] Tap product card → edit modal opens (not just a detail view)
- [ ] Modal shows form with: name, sku, category, price, quantity, reorder level
- [ ] Edit a product (e.g., change price) → save → list updates
- [ ] Tap trash icon → confirm dialog → delete → list updates

### Fix #8: Sales History Tab
- [ ] `mobile/app/(tabs)/sales.tsx` has two tabs: "POS" and "History"
- [ ] **POS tab:** Shows product picker grid (unchanged from before)
- [ ] **History tab:** Loads and shows past sales (or "No sales recorded yet" if empty)
- [ ] Complete a sale on POS tab
- [ ] Switch to History tab → new sale appears with date, time, total, items
- [ ] Swipe/tap on history card → shows items breakdown

---

## Batch 4: Docker Infrastructure

### Fix #9: Full Stack Startup
```bash
docker-compose up -d
sleep 5
docker-compose ps
```
- [ ] All 6 containers show "Up" status (postgres, eureka, gateway, auth, inventory, crm, sales)
- [ ] postgres health check passes
- [ ] eureka health check passes (curl http://localhost:8761/eureka/status → 200 OK)

### Service Discovery
```bash
curl http://localhost:8761/eureka/apps
```
- [ ] Response shows 5 services: AUTH-SERVICE, INVENTORY-SERVICE, CRM-SERVICE, SALES-SERVICE, API-GATEWAY
- [ ] Each service has at least one instance with status "UP"

### Inter-Service Communication
```bash
TOKEN="eyJ..."
USERID=1

# Create a product
curl -X POST http://localhost:8080/inventory/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-User-Id: $USERID" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rice",
    "sku": "RICE-001",
    "price": 100,
    "quantity": 50,
    "reorderLevel": 10
  }'

# Record a sale (Sales Service calls Inventory to deduct stock)
curl -X POST http://localhost:8080/sales \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-User-Id: $USERID" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"productId": 1, "quantity": 5}
    ],
    "paymentMethod": "CASH"
  }'
```
- [ ] Sale is recorded (returns SaleDTO with id, items, totalAmount)
- [ ] Product quantity decreases (verify with GET /inventory/products)
- [ ] No errors in sales-service logs about inventory calls

---

## Integration Test: Full Mobile Flow

### Scenario: New Business Owner Signs Up & Records Sale

**Step 1: Signup**
- [ ] Open mobile app
- [ ] See onboarding screen
- [ ] Tap "Sign Up"
- [ ] Fill: email="owner@test.com", password="Test123!", fullName="Owner"
- [ ] Tap "Create Account"
- [ ] App navigates to Home screen (not stuck on login)

**Step 2: Home Screen**
- [ ] See "Welcome back, Owner"
- [ ] See "Total Sales Today: —" (no sales yet)
- [ ] See "Low Stock Alert" section (if you added products)

**Step 3: Add Product**
- [ ] Tap "Add Product" quick action
- [ ] Fill form: name="Notebook", price=50, quantity=100
- [ ] Submit → success toast or modal close
- [ ] Home screen loads low-stock alert (verify no errors)

**Step 4: Add Customer**
- [ ] Tap "Customers" tab
- [ ] Tap "Add" button
- [ ] Fill: name="Customer 1", phone="9841234567"
- [ ] Submit → customer appears in list

**Step 5: Record Sale**
- [ ] Tap "Sales" tab (should be on POS tab by default)
- [ ] Search for "Notebook" → find product card
- [ ] Tap + button to add to cart (qty should increase to 1)
- [ ] Tap + again (qty = 2)
- [ ] See cart section showing "2× Notebook"
- [ ] Tap "Complete Sale" → success alert
- [ ] Cart clears

**Step 6: View Sales History**
- [ ] Still on Sales tab, tap "History" tab
- [ ] See the sale you just recorded with date, total, item count
- [ ] Tap on sale card (if expandable) → shows items

**Step 7: Logout & Relogin**
- [ ] Tap "Settings" tab
- [ ] Tap "Logout" button
- [ ] Redirected to login screen
- [ ] Login with same email/password
- [ ] All data persists (products, customers, sales)

---

## Performance & Error Handling

- [ ] Switching tabs is responsive (no 2+ second freezes)
- [ ] Network errors show graceful error messages (not crashes)
- [ ] Refreshing API data (pull-to-refresh) works
- [ ] No console errors (check expo logs)

---

## Final Checklist

- [ ] All 4 Batch 1 fixes verified
- [ ] CORS working (Fix #5)
- [ ] All 3 mobile screens functional (Fixes #6-8)
- [ ] Docker stack healthy (Fix #9)
- [ ] End-to-end mobile flow works (signup → product → sale → history)
- [ ] No errors in service logs
- [ ] Eureka showing all services UP

**If all checked:** 🎉 **MVP is ready for release**

---

## Troubleshooting

### Gateway returns 401 on /auth/signup
- **Cause:** GatewaySecurityConfig not loaded or JWT filter still blocking
- **Fix:** Verify file exists at `backend/api-gateway/src/main/java/com/smartbiz/gateway/config/GatewaySecurityConfig.java`
- **Check:** `docker-compose logs api-gateway | grep SecurityConfig`

### Services can't find Eureka
- **Cause:** Eureka not running or DNS/networking issue
- **Fix:** `docker-compose logs eureka-server` → should show health check passing
- **Check:** `curl http://localhost:8761/eureka/status`

### CRM customer can't be updated
- **Cause:** X-User-Id header not injected by gateway
- **Fix:** Verify JWT token is valid and subject claim is numeric
- **Check:** `curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/customers` → should show user's customers

### Mobile can't connect to backend
- **Cause (Android):** Using wrong IP (need 10.0.2.2, not localhost)
- **Cause (Physical device):** Phone not on same network or firewall blocking
- **Fix:** Check `.env` file has correct `EXPO_PUBLIC_API_URL`

### Database connection errors
- **Cause:** postgres not running or migrations failed
- **Fix:** `docker-compose logs postgres`
- **Check:** `docker exec smartbiz-postgres psql -U postgres -l` → should list auth_db, inventory_db, crm_db, sales_db

---

## Sign-Off

Tested by: ________________  
Date: ________________  
Result: ☐ PASS ☐ FAIL  
Notes: ________________________________________________
