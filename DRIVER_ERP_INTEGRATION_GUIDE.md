# Driver Portal ↔ Main ERP Integration Guide

## System Architecture

### Data Flow: Driver → ERP

```
┌─────────────────────────────────────────────────────────────────┐
│                     DRIVER PORTAL (driver.html)                 │
│  • Driver logs in with ID + Password                            │
│  • Submits weekly earnings OR RTO payment                       │
│  • Views submission history and status                          │
└──────────────────────────────────────────┬──────────────────────┘
                                          │
                    POST /api/driver-submissions
                    POST /api/rent-to-own/:id/record-payment
                                          │
                                          ▼
        ┌──────────────────────────────────────────────────┐
        │           SUPABASE (Cloud Database)              │
        │  • driver_submissions table (weekly earnings)    │
        │  • rent_to_own_agreements & payments             │
        │  • notifications table (for alerts)              │
        └──────────────────────────────────────────────────┘
                                          │
                                          ▼
        ┌──────────────────────────────────────────────────┐
        │  NOTIFICATION FUNCTION (/api/notifications)     │
        │  • Creates alerts for new submissions            │
        │  • Notifies HR/Secretary of pending items        │
        └──────────────────────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MAIN ERP PORTAL (erp.html)                   │
│  • Secretary/HR sees dashboard alerts                           │
│  • Views pending driver submissions                             │
│  • Approves/Rejects with one click                             │
│  • Sees RTO payment updates in real-time                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints: Complete Integration Map

### DRIVER PORTAL ENDPOINTS

#### 1. Authentication
```
POST /api/auth/driver-login
  Body: { driverId: "1", password: "John@123" }
  Response: { token, driverId, driverName }
  Purpose: Driver logs in to access portal
```

#### 2. Weekly Earnings Submission
```
POST /api/driver-submissions
  Body: { 
    driver_id: 1,
    amount: 5000,
    week: 2,
    month: 4,
    notes: "Weekly cashing"
  }
  Response: { data: submission_record }
  Purpose: Driver submits weekly earnings
  Auto-triggers: Notification to HR/Secretary
```

#### 3. View Own Submissions
```
GET /api/driver-submissions
  Query: ?status=pending&limit=20
  Response: { data: [ submissions ], count: N }
  Purpose: Driver views their submission history
  Shows: Pending, Approved, Rejected statuses
```

#### 4. RTO Payment Submission
```
POST /api/rent-to-own/:id/record-payment
  Body: { amount: 25000, payment_method: "Weekly Cashing" }
  Response: { data: payment_record, message }
  Purpose: Driver makes payment on RTO agreement
  Auto-triggers: 
    - Updates remaining balance
    - Creates RTO payment record
    - Notifies HR/Secretary
    - Auto-completes agreement if balance = 0
```

#### 5. View RTO Agreements
```
GET /api/rent-to-own?driver_id=1
  Response: { data: [ agreements ], count: N }
  Purpose: Driver views their RTO agreements
  Shows: Active/Completed status, payment progress
```

---

### MAIN ERP ENDPOINTS

#### 1. View Pending Submissions
```
GET /api/driver-submissions
  Response: { data: [ pending_submissions ], count: N }
  Purpose: Secretary/HR sees all pending submissions
  Shows: Driver name, amount, submission date, status
```

#### 2. Approve Submission
```
POST /api/driver-submissions/:id/approve
  Response: { message: "approved", payment_created: true }
  Purpose: Secretary/HR approves earnings submission
  Auto-triggers:
    - Updates submission_status = 'Approved'
    - Creates entry in payments table (official record)
    - Sends notification to dashboard
```

#### 3. Reject Submission
```
POST /api/driver-submissions/:id/reject
  Body: { rejectionReason: "Missing receipts" }
  Response: { message: "rejected" }
  Purpose: Secretary/HR rejects submission with reason
  Auto-triggers: Driver sees rejection reason in portal
```

#### 4. View RTO Agreements
```
GET /api/rent-to-own
  Query: ?status=Active&driver_id=X
  Response: { data: [ agreements ], count: N }
  Purpose: ERP views all RTO agreements
  Shows: Driver, vehicle, payment progress, remaining balance
```

#### 5. View RTO Payments
```
GET /api/rent-to-own/approvals/pending
  Response: { data: [ recent_payments ], count: N }
  Purpose: View recent RTO payment activity
  Shows: Which drivers paid, amounts, remaining balances
```

---

## Notification System

### How Notifications Work

#### When Driver Submits Weekly Earnings:
```
Driver submits → POST /api/driver-submissions
                   ↓
            Create notification
                   ↓
      ERP Dashboard shows alert badge
                   ↓
    Secretary/HR click to view pending items
                   ↓
          Approve/Reject + Comment
```

#### When Driver Makes RTO Payment:
```
Driver submits → POST /api/rent-to-own/:id/record-payment
                   ↓
         Calculate new remaining balance
                   ↓
           Create notification
                   ↓
    ERP shows "Payment Received from [Driver]"
                   ↓
       Auto-notify if balance reaches 0
```

### Notification Endpoints

```
GET /api/notifications
  Purpose: Fetch all pending notifications
  Response: { data: [ notifications ] }

GET /api/notifications/pending-count
  Purpose: Get count of pending items for badge
  Response: { pending_submissions: N, recent_rto_payments: M }

POST /api/notifications/:id/mark-read
  Purpose: Mark notification as read
```

---

## Data Flow Examples

### Example 1: Weekly Earnings Submission

**Step 1: Driver Submits**
```
Time: 2026-04-12 14:30
Driver: Aaron Nyoni (ID: 41)
Amount: K5,000
Week: 2
```

**Step 2: Data Saved**
- driver_submissions table: status = "Pending"
- notification created: "New submission from Aaron Nyoni"

**Step 3: ERP Staff Sees It**
- Dashboard alert: "1 pending submission"
- Payments & Submissions tab shows entry
- Status badge: "Pending" (orange)

**Step 4: Secretary Approves**
- Click "Approve" button
- System:
  - Updates submission_status = "Approved"
  - Creates payment record (official)
  - Driver sees "Approved" in portal
  - Notification: "Aaron's submission approved"

**Step 5: Driver Sees Result**
- Opens driver portal
- Submission history shows "Approved" status
- Amount moved to their account

---

### Example 2: RTO Payment

**Step 1: Driver Makes Payment**
```
Time: 2026-04-12 15:00
Driver: Aaron Nyoni
Agreement: Vehicle AAA1234
Payment: K25,000
Remaining: K225,000 (of K300,000 total)
```

**Step 2: Data Updated**
- rent_to_own_payments table: new record created
- rent_to_own_agreements table: remaining_balance decreased
- notification: "RTO Payment received: K25,000"

**Step 3: ERP Staff Sees Update**
- Dashboard: "Recent RTO Activity" section updated
- Agreement progress bar moves forward
- Notification shows which driver paid

**Step 4: Real-time Sync**
- If balance reaches K0, auto-triggers:
  - agreement_status = "Completed"
  - ownership_transferred = true
  - notification: "Agreement complete - ownership transferred"

---

## Testing Workflow: Weekly + RTO Payments

### Test Setup

**Pre-requisites:**
✓ Vehicles migrated (41 real vehicles)
✓ Drivers in system (51 active drivers)
✓ Test RTO agreements created
✓ Test driver submissions created

### Test Scenario 1: Weekly Earnings Submission

**1. Driver Portal:**
```
URL: https://your-domain.netlify.app/driver-login.html
Driver ID: 41 (Aaron Nyoni)
Password: Aaron@123
```

**2. Submit Payment:**
- Click: "Submit Weekly Earnings"
- Enter:
  - Amount: 7,500
  - Week: 2
  - Month: 4
  - Notes: "Good week, all routes completed"
- Click: "Submit" 
- Expected: Success message + appears in history as "Pending"

**3. Check ERP Dashboard:**
- URL: https://your-domain.netlify.app/erp.html
- Login as: Secretary or HR
- Go to: Payments & Submissions → Driver Submissions
- Expected: New entry for Aaron Nyoni showing:
  - Status: "Pending" (orange badge)
  - Amount: 7,500
  - Week: 2
  - Submitted: today's date

**4. Approve in ERP:**
- Click: "Approve" button on Aaron's submission
- Expected:
  - Status changes to "Approved" (green)
  - Payment record created
  - Notification appears

**5. Verify Driver Portal:**
- Refresh driver portal
- Expected: Submission shows "Approved" status
- Amount recorded in history

---

### Test Scenario 2: RTO Payment

**1. View Agreement:**
- Driver Portal
- Section: "Your RTO Agreements"
- Should show: List of active RTO agreements
- Example: Vehicle AAA1234, Remaining K250,000

**2. Make Payment:**
- Click: Vehicle AAA1234
- Amount field: 25,000
- Click: "Record Payment"
- Expected: Success + remaining updated to K225,000

**3. Check Dashboard Update:**
- Switch to ERP (Payments & Submissions tab)
- Go to: Financial Payments → RTO section
- Expected: New payment appears
  - Driver: Aaron Nyoni
  - Amount: K25,000
  - Vehicle: AAA1234
  - Date: Today

**4. Check Progress:**
- Go to: Finance → Rent-to-Own
- Find agreement: AAA1234
- Progress bar: Should show payment progress
- Remaining balance: Should update to K225,000

**5. Auto-Completion Test (Optional):**
- Continue making payments until balance = 0
- Expected:
  - Agreement status: "Completed"
  - Ownership transferred: Automatic
  - Badge: "Ownership Transferred"
  - Notification: "Agreement completed"

---

## Integration Verification Checklist

### Driver Portal Functions:
- [ ] Driver login works (no timeouts)
- [ ] Weekly earnings submission successful
- [ ] RTO payment recording successful
- [ ] View submission history works
- [ ] View RTO agreements works
- [ ] Real-time status updates display correctly

### ERP Functions:
- [ ] Pending submissions appear in dashboard
- [ ] Approve button works
- [ ] Reject button works with reason
- [ ] RTO agreements display with progress bars
- [ ] Payment history shows correctly
- [ ] Notifications display for alerts

### Data Sync:
- [ ] Driver submission → appears in ERP within 2 seconds
- [ ] ERP approval → driver sees status change within 2 seconds
- [ ] RTO payment → reflected in agreement balance immediately
- [ ] Auto-completion → triggers when balance = 0

### Notifications:
- [ ] New submission alert appears
- [ ] Approval notification shows
- [ ] RTO payment notifications display
- [ ] Badge shows correct pending count
- [ ] Notifications can be marked as read

---

## Troubleshooting

### Driver Can't Submit
- Check: Is browser showing port 8000 in URL bar?
- Fix: Should be https://your-domain.netlify.app (no port)
- Check: Driver authentication working (test login first)

### ERP Not Showing Submissions
- Check: Are you logged in as Secretary/HR?
- Fix: Only these roles can see submissions
- Check: F12 → Network → See if /api/driver-submissions returns data

### Real-time Updates Not Working
- Check: Browser console for errors
- Fix: Clear localStorage (F12 → Application → localStorage → Clear All)
- Check: Refresh page to see latest data

### RTO Balance Not Updating
- Check: Did payment POST succeed? (check response)
- Fix: Page refresh shows updated balance
- Check: Supabase → rent_to_own_agreements → check remaining_balance column

---

## API Response Examples

### Driver Submits Weekly Earnings (Success)
```json
{
  "statusCode": 201,
  "body": {
    "data": {
      "id": 5,
      "driver_id": 41,
      "submission_date": "2026-04-12",
      "amount": 7500,
      "week": 2,
      "month": 4,
      "notes": "Good week",
      "submission_status": "Pending",
      "created_at": "2026-04-12T14:30:00Z"
    }
  }
}
```

### Secretary Approves Submission (Success)
```json
{
  "statusCode": 200,
  "body": {
    "message": "Submission approved and payment recorded",
    "paymentCreated": true,
    "submissionId": 5,
    "paymentId": 123
  }
}
```

### Driver Records RTO Payment (Success)
```json
{
  "statusCode": 200,
  "body": {
    "data": {
      "id": 2,
      "paid_amount": 175000,
      "remaining_balance": 225000,
      "agreement_status": "Active"
    },
    "payment": {
      "id": 45,
      "amount": 25000,
      "payment_date": "2026-04-12"
    }
  }
}
```

---

## Summary

**Your system now has complete integration:**
✅ Driver portal accepts weekly and RTO payments
✅ Main ERP receives and displays submissions
✅ Notifications alert staff of pending items
✅ Approvals flow back to driver portal
✅ Real-time balance updates for RTO agreements
✅ Complete audit trail of all transactions

**Ready to test the complete workflow!**
