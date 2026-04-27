# Mobile Signup Failing — Diagnostic Guide

**Last Updated:** 2026-04-27

---

## Step 1: Verify Backend is Running

### Check if docker-compose is up
```bash
docker-compose ps
```

**Expected output:**
```
CONTAINER ID   IMAGE                          COMMAND                 STATUS
xxx            smartbiz-postgres              "docker-entrypoint..."  Up (healthy)
xxx            smartbiz-eureka                "java -jar app.jar"     Up (healthy)
xxx            smartbiz-gateway               "java -jar app.jar"     Up
xxx            smartbiz-auth                  "java -jar app.jar"     Up
xxx            smartbiz-inventory             "java -jar app.jar"     Up
xxx            smartbiz-crm                   "java -jar app.jar"     Up
xxx            smartbiz-sales                 "java -jar app.jar"     Up
```

❌ **If containers are not running:**
```bash
docker-compose up -d
docker-compose logs -f postgres  # Wait for "database system is ready"
sleep 30
```

### Check if Gateway is responding
```bash
curl http://localhost:8080/auth/signup \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123","fullName":"Test"}'
```

**Expected response:** (should have access_token, not 401)
```json
{
  "access_token": "eyJhbGc...",
  "refresh_token": "...",
  "userId": 1,
  "email": "test@test.com",
  "fullName": "Test"
}
```

❌ **If you get 401:**
- Gateway security config issue
- Check: `docker-compose logs api-gateway | grep -i "security\|filter\|auth"`
- Restart gateway: `docker-compose restart api-gateway`

❌ **If you get connection refused:**
- Gateway not running
- Check: `docker-compose logs api-gateway`
- Restart all: `docker-compose down && docker-compose up -d`

---

## Step 2: Check Mobile API Configuration

### Verify `.env` file
**File:** `mobile/.env`

Should contain:
```
EXPO_PUBLIC_API_URL=http://10.0.2.2:8080
```

- `10.0.2.2` = Android emulator's alias for host `localhost`
- For **physical device**, replace with your machine's **LAN IP** (e.g., `192.168.1.100:8080`)

**Get your machine's LAN IP:**
```bash
# macOS/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows PowerShell
ipconfig | findstr /i "ipv4"
```

### Verify Expo App Has Latest Config
After changing `.env`, restart Expo:
```bash
cd mobile
npx expo start --clear
```

Then press `a` for Android or `i` for iOS.

---

## Step 3: Check Mobile Network Connectivity

### Android Emulator Testing

**From Android emulator terminal:**
```bash
adb shell
ping 10.0.2.2
# Should respond: "64 bytes from 10.0.2.2"
```

**If ping fails:**
- Restart emulator: close and re-open in Android Studio
- Check firewall: Windows Defender may block port 8080
  - Open Windows Defender → Firewall → Allow an app through
  - Add Java (for spring-boot service) or port 8080

### Physical Device Testing

**If on same WiFi as your dev machine:**
```bash
# From phone browser, try
http://{your-machine-ip}:8080/auth/signup

# You should get a JSON response or CORS preflight OK
```

**If that works but Expo app still fails:**
- Change `.env` to use your machine's IP
- Restart Expo app (`npx expo start --clear`)

---

## Step 4: Debug Mobile App Logs

### See Detailed Error

Open Expo app on phone → Shake device → "View logs"

Or from terminal:
```bash
cd mobile
npx expo start
# Press 'j' for logs (if on Android)
```

**Look for error messages like:**
- `Network error: ...` → Backend not reachable
- `401 Unauthorized` → JWT filter blocking (gateway security issue)
- `Connection refused` → Backend not running
- `CORS error` → Gateway CORS not configured (but should be fixed now)

### Intercept Network Requests (iOS)

Use Expo CLI built-in debugging:
```bash
npx expo start
# In browser: go to http://localhost:19000
# Under "Published projects" → your app → click to expand
# See logs in real-time
```

---

## Step 5: Test Signup Endpoint Directly

### From Mobile (Using Expo)

Create a test file `mobile/debug-test.ts`:
```typescript
import { api } from '@/services/api';

export async function testSignup() {
  try {
    const response = await api.post('/auth/signup', {
      email: 'debug@test.com',
      password: 'Test123!',
      fullName: 'Debug User',
    });
    console.log('✅ Signup success:', response.data);
  } catch (error: any) {
    console.error('❌ Signup failed:', error.response?.status, error.response?.data, error.message);
  }
}
```

Then call from your signup screen to see raw error:
```typescript
import { testSignup } from '@/debug-test';

// In your button handler:
await testSignup();
```

---

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| **401 Unauthorized** | Gateway security config not loaded | Verify `GatewaySecurityConfig.java` exists at `backend/api-gateway/src/main/java/.../config/GatewaySecurityConfig.java`. Rebuild: `docker-compose down && docker-compose up -d` |
| **Connection refused** | Backend not running | `docker-compose up -d` and wait 30s |
| **Network error: No route to host** | Android emulator can't reach 10.0.2.2 | Restart emulator, check firewall allows port 8080 |
| **CORS error in browser** | CORS not configured | Should be fixed (api-gateway/application.yml has globalcors). Verify by curl preflight test above. |
| **Request timeout** | Services taking too long to start | Wait longer, or increase timeout in `mobile/services/api.ts` (currently 10000ms) |
| **400 Bad Request** | Invalid JSON payload | Check mobile form is sending correct fields: email, password, fullName (all required) |

---

## Full Diagnostic Script

Run this to test everything at once:

```bash
#!/bin/bash

echo "🔍 SmartBiz Signup Debug Checklist"
echo "===================================="
echo ""

echo "1️⃣  Checking Docker containers..."
docker-compose ps | grep -E "smartbiz-(postgres|eureka|gateway|auth)" || echo "❌ Containers not running"

echo ""
echo "2️⃣  Testing Gateway connectivity..."
curl -s http://localhost:8080/auth/signup \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123","fullName":"Test"}' | jq . || echo "❌ Gateway not responding"

echo ""
echo "3️⃣  Checking mobile .env..."
[ -f mobile/.env ] && cat mobile/.env || echo "❌ mobile/.env not found"

echo ""
echo "4️⃣  Checking GatewaySecurityConfig exists..."
[ -f backend/api-gateway/src/main/java/com/smartbiz/gateway/config/GatewaySecurityConfig.java ] && echo "✅ Found" || echo "❌ Missing"

echo ""
echo "5️⃣  Gateway logs (last 20 lines)..."
docker-compose logs api-gateway | tail -20 | grep -i "security\|filter\|error" || echo "✅ No errors found"

echo ""
echo "Done! Use output above to debug."
```

Save as `debug.sh` and run:
```bash
chmod +x debug.sh
./debug.sh
```

---

## If Still Failing After All Checks

### Capture Full Error

From mobile app:
1. Open signup screen
2. Enter email/password/name
3. Tap sign up
4. Look at Expo logs (see Step 4 above)
5. Copy **exact error message** and **HTTP status code**

Share that error + output of `docker-compose logs api-gateway` (last 50 lines).

---

## Quick Reference

| When | Do This |
|------|---------|
| Backend not starting | `docker-compose up -d && sleep 30 && docker-compose ps` |
| Gateway returning 401 | Rebuild gateway: `docker-compose down api-gateway && docker-compose up -d api-gateway` |
| Mobile can't reach backend | Verify `.env` API_URL matches your machine (10.0.2.2 for emulator, your IP for physical device) |
| Signup form looks broken | No code issues; check mobile/services/auth.ts and AuthContext.tsx are unmodified |
| Everything says it's working but signup still fails | Check phone console/logs for actual error (not app error message) |
