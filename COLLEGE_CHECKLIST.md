# College Demo Checklist

This file tracks the feature-first roadmap for SmartBiz before launch work.

## Priority Order

1. Barcode scanning
2. Refresh token flow
3. Change password
4. Push notifications
5. Nepali language support
6. Messaging / Unified Inbox

## Recommended Cutoff

If time gets tight, stop after these three:

1. Barcode scanning
2. Refresh token flow
3. Change password

That gives the strongest college-demo version with visible functionality plus core auth polish.

## Feature Checklist

### 1. Barcode scanning

- Add camera-based barcode scan in the mobile inventory flow
- Connect scan result to existing barcode product lookup
- Handle both cases: product found and product not found
- Add quick add or update stock flow after scan
- Test on a real phone

### 2. Refresh token flow

- Add refresh endpoint in auth service if still missing
- Refresh access token automatically in the mobile app
- Retry failed authenticated requests once after refresh
- Log the user out only if refresh also fails
- Test token expiry flow manually

### 3. Change password

- Add backend endpoint
- Add current password and new password UI in settings
- Validate password length and mismatch cases
- Show clear success and error messages
- Test wrong current password and success path

### 4. Push notifications

- Decide first version: low stock alerts or follow-up reminders
- Add Firebase setup
- Save device token
- Trigger one simple notification type end-to-end
- Test on a physical Android device

### 5. Nepali language support

- Pick key screens for first pass: login, inventory, sales, customers
- Extract text strings instead of hardcoding them
- Add English and Nepali toggle
- Check layout for longer labels
- Demo both languages cleanly

### 6. Messaging / Unified Inbox

- Keep this last unless the college specifically expects it
- If needed, build only a small prototype first instead of full platform integration

## Suggested Timeline

### Week 1

- Barcode scanning
- Change password

### Week 2

- Refresh token flow
- Bug fixing
- Demo polish

### If extra time remains

- Push notifications
- Nepali language support

## After College Review

Once the college demo is done, switch to a separate launch checklist for:

- Production deployment
- Security hardening
- Backups
- Monitoring
- Reliability testing
