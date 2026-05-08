# Servios Manual Testing Guide

## Setup — Run the seed script first

This creates all test accounts and data in your Supabase project.

```bash
# From repo root
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
bun run packages/database/seeds/seed.ts
```

### Test accounts (password: `TestPass123!` for all)

| Role       | Email                          | Notes                                      |
|------------|--------------------------------|--------------------------------------------|
| Customer   | test.customer@servios.test     |                                            |
| Provider   | test.provider@servios.test     | Pete's Plumbing Co · verified · plumber    |
| Landlord   | test.landlord@servios.test     | Auto-approve threshold $150                |
| Tenant     | test.tenant@servios.test       | Linked to "Test Villa" property            |
| Admin      | test.admin@servios.test        |                                            |
| Multi-role | test.multirole@servios.test    | Has customer + provider roles              |

### Pre-seeded data
- **Test Villa** — Larry Landlord's property (Nassau, NP)
- **Tina Tenant** — linked to Test Villa
- **Pete's Plumbing Co** — preferred provider for Larry (10% commission)
- **TEST-BOOKING-001** — completed booking between Casey & Pete
- **TEST-BOOKING-002** — pending booking between Casey & Pete (tomorrow)
- **Compliance items** — Gas Safe (expiring in 25 days), EICR (ok), EPC (overdue)

---

## Flow 1 — Authentication

**Login routing**
1. Go to `/login`
2. Log in as each test account
3. Verify each lands on the correct dashboard:
   - Customer → `/` or `/customer/dashboard`
   - Provider → `/provider`
   - Landlord → `/landlord`
   - Tenant → `/tenant`
   - Admin → `/admin`

**Guards**
- While logged out, go to `/provider/dashboard` → should redirect to `/login`
- Enter wrong password → should show an error, stay on login page

**Sign out**
- Click "Sign out" → should return to login page

---

## Flow 2 — Customer: Book a service

Log in as `test.customer@servios.test`

1. **Search** — go to `/search`, type "plumbing", hit Enter
   - Verify Pete's Plumbing Co appears in results
   - Verify ratings and prices are shown in USD (not BSD)

2. **Provider profile** — click Pete's card
   - Verify services listed with prices
   - Verify star rating and review count visible
   - Verify "Book" button present

3. **Create booking** — click Book
   - Select a date (tomorrow or later)
   - Select a time slot
   - Add a note: "Leaking kitchen tap"
   - Submit
   - Verify booking appears in `/bookings` with status "Pending"

4. **View existing bookings** — go to `/bookings`
   - TEST-BOOKING-001 should show as "Completed"
   - TEST-BOOKING-002 should show as "Pending"

5. **Leave a review** — find TEST-BOOKING-001 (completed)
   - Click "Leave Review" or "Review"
   - Select 5 stars
   - Write a comment
   - Submit
   - Verify success message appears

---

## Flow 3 — Provider: Accept and complete a job

Log in as `test.provider@servios.test`

1. **Dashboard** — go to `/provider`
   - Verify "Hi, Pete" or similar greeting
   - Verify pending request count shows at least 1

2. **Accept a booking** — go to `/provider/bookings`
   - Find TEST-BOOKING-002 (status: Pending)
   - Click "Accept"
   - Verify status changes to "Accepted" / "Confirmed"

3. **Reject a booking** — find another pending booking (if any)
   - Click "Reject" / "Decline"
   - Verify status changes and booking disappears from active list

4. **Calendar** — go to `/provider/calendar`
   - Verify accepted booking appears on calendar

5. **Availability** — go to `/provider/availability`
   - Toggle a day off (e.g. Saturday)
   - Click "Save Changes"
   - Verify "Saved" confirmation appears
   - Toggle emergency availability on
   - Save again

6. **Complete a job** — go to `/provider/bookings`
   - Find an accepted booking
   - Click "Mark Complete" or "Complete Job"
   - Upload a before photo and an after photo (optional)
   - Tick "Allow Servios to use for marketing" checkbox
   - Confirm completion
   - Verify status changes to "Completed"

7. **Earnings** — go to `/provider/earnings`
   - Verify amounts shown in USD
   - Verify commission breakdown (12% standard)
   - Find a job booked by Larry Landlord → should show 10% commission

8. **Analytics** — go to `/provider/analytics`
   - Verify KPI cards: Total Earned, Jobs Done, Avg Rating, Repeat Clients
   - Verify monthly bar chart renders

9. **Payouts** — go to `/provider/payouts`
   - Verify Stripe Connect setup prompt or payout history

---

## Flow 4 — Landlord

Log in as `test.landlord@servios.test`

### Properties
1. Go to `/landlord/properties`
   - Verify "Test Villa" appears
2. Click "Add Property"
   - Fill in: Name, Address, Type, Bedrooms
   - Save → verify it appears in the list

### Tenants
1. Go to `/landlord/tenants`
   - Verify Tina Tenant is listed under Test Villa
2. Click "Add Tenant"
   - Enter: name, email, phone, lease start date
   - Save → verify entry created
   - (In production: tenant receives email invite)

### Maintenance
1. Go to `/landlord/maintenance`
2. **Under auto-approve threshold:**
   - Click New Request
   - Title: "Dripping tap", Description: "Bathroom tap dripping"
   - Set estimated cost to **$120** (under $150 threshold)
   - Submit
   - Verify status is **automatically "Approved"** (no manual step needed)

3. **Over auto-approve threshold:**
   - Click New Request
   - Title: "Boiler replacement", estimated cost: **$500**
   - Submit
   - Verify status is **"Pending"** (requires landlord approval)
   - Click "Approve" on the request

4. **Emergency request:**
   - Click New Request, set priority to "Emergency"
   - Submit → verify provider receives a notification (check their notifications or `/provider/bookings`)

### Quotes
1. Go to `/landlord/quotes`
2. Click "New Quote Request"
   - Title: "Full roof inspection"
   - Description: "After recent storms"
   - Invite Pete's Plumbing (or any provider)
   - Submit
3. Log in as `test.provider@servios.test` → go to `/provider/quotes`
   - Verify the quote request appears
   - Submit a quote: e.g. $350, 2 days
4. Back as Landlord → go to `/landlord/quotes`
   - Open the quote request
   - Verify Pete's quote appears
   - Click "Accept" on Pete's quote
   - Verify a booking is created

### Emergency SOS
1. Go to `/landlord/emergency`
2. Verify 999 and emergency contact links are visible
3. Select "Test Villa" from property dropdown
4. Type issue: "Burst pipe flooding kitchen"
5. Select Pete's Plumbing from preferred providers
6. Click "Dispatch Emergency Provider"
7. Verify confirmation screen appears

### Compliance
1. Go to `/landlord/compliance`
2. Verify three items from seed:
   - Gas Safe Certificate → "Expiring Soon" (25 days) — should show warning
   - EICR → Compliant (2027)
   - EPC → **Overdue** — should be highlighted in red
3. Upload a new certificate:
   - Click "Add Certificate"
   - Type: Gas Safe, expiry: one year from now
   - Save → verify it appears

### Preferred providers
1. Go to `/landlord/providers`
2. Verify Pete's Plumbing Co is listed with **10% commission** (invited rate)
3. Click "Invite Provider"
   - Enter a new email address
   - Send invite → verify confirmation

### Auto-approve threshold
1. Go to `/landlord/settings`
2. Find auto-approve threshold field → should show $150
3. Change to $200 → Save → verify saved
4. Change back to $150 → Save

---

## Flow 5 — Tenant

Log in as `test.tenant@servios.test`

1. **Dashboard** — go to `/tenant`
   - Verify greeting and property summary

2. **My Property** — go to `/tenant/property`
   - Verify "Test Villa" with Nassau address shows
   - Verify NO rent/cost figures are shown (tenant can't see cost)

3. **Report an issue** — go to `/tenant/maintenance`
   - Click "Report Issue"
   - Title: "Boiler making noise"
   - Description: "Loud banging every morning"
   - Submit → verify confirmation

4. **Service history** — go to `/tenant/maintenance`
   - Verify completed repairs show: date, what was done, provider name
   - Verify NO dollar amounts are visible

5. **Emergency** — go to `/tenant/emergency`
   - Verify emergency button is prominent
   - Describe issue: "Gas smell in kitchen"
   - Submit → verify "Alert sent to landlord" screen appears

6. **Chat** — go to `/tenant/chat`
   - Send a message: "The boiler is making noise again"
   - Verify message appears in chat

---

## Flow 6 — Multi-role

Log in as `test.multirole@servios.test`

1. **Role switcher** — verify dropdown appears in the header (user has 2 roles)
2. **Switch to Provider:**
   - Click role switcher → select "Provider"
   - Verify URL changes to `/provider`
   - Verify sidebar shows provider nav (Requests, Calendar, Availability, Earnings…)
3. **Switch back to Customer:**
   - Click role switcher → select "Customer"
   - Verify URL changes to `/` or `/customer/dashboard`
   - Verify sidebar shows customer nav

**Adding a role (single-role user):**
Log in as `test.customer@servios.test`
1. Go to `/settings`
2. Find "Add Role" section
3. Select "Provider"
4. Complete provider onboarding (trade → services → documents)
5. Verify "Provider" now appears in role switcher

---

## Flow 7 — Payments (Stripe test mode)

Use Stripe test card: `4242 4242 4242 4242` · Exp: `12/34` · CVC: `123`

Log in as `test.customer@servios.test`

1. Find an accepted booking in `/bookings`
2. Click "Pay" or "Complete Payment"
3. Enter the test card details above
4. Submit payment
5. Verify booking status changes to "Paid"
6. Log in as `test.provider@servios.test` → go to `/provider/earnings`
7. Verify the payment appears (minus 12% commission)

**Escrow / release:**
- Payment should be held in escrow until customer confirms job completion
- After confirmation, provider sees funds in earnings

---

## Flow 8 — Workmanship Guarantee

Log in as `test.customer@servios.test`

1. Go to `/bookings`
2. Open TEST-BOOKING-001 (completed)
3. Click "Report Issue" or "Workmanship Claim"
4. Describe the issue: "Tap is still leaking after repair"
5. Attach evidence (optional)
6. Submit
7. Verify claim confirmation appears

**Admin reviews the claim:**
Log in as `test.admin@servios.test`
1. Go to `/admin/claims`
2. Find the submitted claim
3. Change status to "Under Review"
4. Add resolution notes
5. Resolve: "Original provider dispatched for free fix"

---

## Flow 9 — Before/After Photos & Marketing Consent

Log in as `test.provider@servios.test`

1. Go to `/provider/bookings`
2. Find an accepted/in-progress booking
3. Click "Mark Complete"
4. Upload a before photo
5. Upload an after photo
6. **Tick** "Allow Servios to feature this work on social media"
7. Confirm completion

**Admin content queue:**
Log in as `test.admin@servios.test`
1. Go to `/admin/content`
2. Verify the photos with marketing consent appear in the queue
3. Approve or reject for use

---

## What to check across all flows

| Check                          | Expected                                  |
|-------------------------------|-------------------------------------------|
| Currency                      | Always shows USD, never BSD               |
| Emergency commission          | 15% shown for emergency jobs              |
| Landlord-invited commission   | 10% shown (vs 12% standard)              |
| Tenant sees costs             | Never — service history hides amounts     |
| Unverified provider           | Cannot receive bookings until admin verifies |
| Auto-approve                  | ≤ threshold → instant approval, no action needed |
| Push notifications (mobile)   | Provider gets alert when booking received |
| Emergency push                | Landlord gets immediate alert on tenant emergency |
