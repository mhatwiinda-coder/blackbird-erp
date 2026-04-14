# ENDPOINT SCHEMA ALIGNMENT - Complete Fix

## CRITICAL ENDPOINTS & REQUIRED FIXES

### 1. driver-submissions.js - ✅ ALIGNED
**Status:** OK  
**GET /api/driver-submissions:**
- Queries: id, driver_id, submission_date, amount, week, month, notes, submission_status, approved_by_role, approval_date, rejection_reason, driver:drivers(id, name)
- Schema columns: ✅ ALL EXIST

**POST /api/driver-submissions:**
- Inserts: driver_id, submission_date, amount, week, month, notes, submission_type, agreement_id, submission_status, created_at
- Schema columns: ✅ ALL EXIST

**POST /api/driver-submissions/:id/approve:**
- Updates: submission_status = 'Approved', approved_by_role, approval_date
- Creates: payments table entry
- Schema columns: ✅ ALL EXIST

---

### 2. rent-to-own.js - ✅ FIXED
**Status:** FIXED (commit 2575ba6)  
**GET /api/rent-to-own/approvals/pending:**
- Queries: id, amount, payment_method, payment_date, approval_status, approved_at, driver_name, vehicle_plate, created_at, agreement_id
- Schema columns: ✅ ALL EXIST NOW (added approval_status, approved_at, driver_name, vehicle_plate to flattened response)

**POST /api/rent-to-own/:id/approve-payment/:payment_id:**
- Updates: approval_status = 'approved', approved_at = now()
- Schema columns: ✅ ALL EXIST

---

### 3. payments.js - ⚠️ NEEDS FIX
**Issue:** Trying to join `driver:drivers` but payments table has NO driver_id FK
**Current (BROKEN):**
```javascript
.select(`*, driver:drivers(name, phone)`)
```

**Fixed Should Be:**
```javascript
.select(`*`)
// Don't join drivers - use payer_name instead
```

**Action:** Remove driver join from payments.js

---

### 4. dashboard.js - ✅ ALIGNED
**Status:** OK
- All queries use correct columns that exist in schema
- No FK joins that don't exist

---

### 5. drivers.js - ⚠️ REVIEW NEEDED
**Check:** Does it try to join to non-existent tables?

---

### 6. quotations.js - ⚠️ REVIEW NEEDED
**Check:** Does it try to join to non-existent tables?

---

### 7. deliveries.js - ⚠️ REVIEW NEEDED
**Check:** Does it try to join rider to drivers?

---

### 8. jobs.js - ⚠️ REVIEW NEEDED
**Check:** Does it try to join driver_id correctly?

---

## SCHEMA REFERENCE

### driver_submissions
- id, driver_id, submission_date, amount, week, month, notes, submission_type, agreement_id, submission_status, approved_by_staff_id, approved_by_role, approval_date, rejection_reason, created_at, updated_at

### rent_to_own_agreements
- id, driver_id, vehicle_id, quotation_id, total_price, paid_amount, remaining_balance, agreement_status, agreement_date, ownership_transferred, ownership_transferred_date, created_at, updated_at

### rent_to_own_payments
- id, agreement_id, amount, payment_date, payment_method, approval_status, approved_at, driver_name, vehicle_plate, notes, created_at, updated_at

### payments
- id, payment_date, payer_name, payment_type, description, amount, week, month, payment_status, created_at, updated_at
- **NO driver_id FK** - uses payer_name (TEXT)

### drivers
- id, name, phone, plate, type, assigned_date, national_id, license_number, status, created_at, updated_at

### vehicles
- id, plate, type, make_model, assigned_driver_id, vehicle_condition, road_tax_due, insurance_due, service_due_km, created_at, updated_at

---

## FIXES NEEDED

### FIX 1: payments.js
**Line:** ~20
**Change:**
```javascript
// BEFORE (BROKEN):
.select(`*, driver:drivers(name, phone)`)

// AFTER (FIXED):
.select(`*`)
```

### FIX 2: Review all other endpoints for similar issues
- Check each endpoint's .select() matches actual table columns
- Remove any joins to non-existent FKs
- Verify filter operations use correct column names

---

## TESTING CHECKLIST

After all fixes deployed:

1. ✅ GET /api/driver-submissions → returns list with submission_status
2. ✅ GET /api/rent-to-own/approvals/pending → returns list with approval_status
3. ✅ POST /api/driver-submissions/:id/approve → updates approval_status to 'approved'
4. ✅ GET /api/payments → returns all payments with payer_name (no driver join)
5. ✅ GET /api/dashboard/stats → returns stats without errors
6. ✅ Frontend filtering works: approval_status === 'approved' filters correctly
7. ✅ Frontend filtering works: approval_status === 'pending' filters correctly
