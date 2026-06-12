# MediGuard — Demo Script

**Duration:** ~8 minutes  
**Platform:** Android APK (side-loaded via EAS internal distribution)  
**Account:** Use pre-seeded test patient account for smooth flow

---

## 1. App Launch & Authentication (45 sec)

- Open MediGuard APK on Android device
- **Splash screen** with logo loads
- Show **Login screen** → enter test credentials → tap Sign In
- Land on **Patient Dashboard** — overview cards visible (medicines, upcoming doses, wellness)

---

## 2. Medicine Inventory + AI Scanner (90 sec)

- Tap **Inventory** in bottom nav
- Show medicine list with expiry colour coding (green/yellow/red)
- Tap **"+" Add Medicine**
- Tap **Scan Label** — camera opens
- Point at a medicine box/strip
- Watch the AI (Gemini via backend) parse name, dosage, expiry
- Fields auto-fill → tap **Save**
- Medicine appears in list immediately

---

## 3. Expiry Alerts (45 sec)

- Tap the **Expiry Alerts** tab (bell-triangle icon in drawer)
- Show colour-coded cards:
  - Red = expired today or already expired
  - Orange = expiring within 7 days
  - Yellow = expiring within 30 days
- Tap **Edit** on a near-expiry medicine → goes to edit form
- Show **Summary strip** at top: "2 expired · 3 expiring · 1 low stock"
- Use filter tabs: All / Expired / Expiring / Low Stock

---

## 4. Dose Reminders & Notifications (60 sec)

- Open **Notifications** (bell icon in header)
- Show unread dose/expiry/wellness notifications with colour-coded dots
- Tap a dose notification → navigates to **Missed Dose** screen
- Show **Mark All Read** → notifications fade out (disappear after 30 seconds)
- Show OS-level notification (if device received one):
  - "✅ Mark as Taken" action button visible without opening app
  - Tapping it navigates directly to Missed Dose log

---

## 5. Daily Log & Wellness (60 sec)

- Tap **Daily Log** in drawer
- Show vitals entry: Blood Pressure, Blood Sugar, Heart Rate, Weight
- Fill in values → tap **Save Log**
- Tap **Wellness Progress** — chart view of past readings
- Show wellness notification reminder scheduled at 8 PM daily

---

## 6. Care Guardian Flow (60 sec)

- Log out → log in as **Care Guardian** account
- Land on Care Guardian dashboard
- Show **patient link** — linked patient's medicine schedule visible
- Tap **SOS Alert** — show emergency contact trigger screen
- Back to dashboard → show notification received when patient misses a dose

---

## 7. Export Health Data (30 sec)

- In patient account → **Profile → Export Health Data**
- Tap **Generate PDF**
- PDF downloads with: medicines list, recent vitals, dose logs, side effects
- Share via system share sheet

---

## 8. Wrap-Up Talking Points

- **Offline-first**: medicines cached locally, UI stays responsive on flaky networks
- **Privacy**: all data scoped to authenticated user ID via Firestore security rules
- **Extensibility**: modular monorepo (shared packages, separate mobile/web/backend apps)
- **Backend AI**: OCR runs through Express backend (not direct from device), keeping API keys secure

---

## Pre-Demo Checklist

- [ ] Device on same Wi-Fi as backend machine (`10.47.71.229:4000`)
- [ ] Backend running: `pnpm --filter backend dev`
- [ ] Firebase Firestore rules published (latest `firestore.rules`)
- [ ] Test patient account has 3+ medicines with varied expiry dates
- [ ] At least 1 medicine expiring within 7 days (triggers expiry alert)
- [ ] APK installed via EAS link or `adb install`
- [ ] Brightness set to max, font size normal
- [ ] Do-Not-Disturb OFF (so OS notifications show during demo)
