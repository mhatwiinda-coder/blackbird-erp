# Deployment Checklist - Driver Submissions Fix

Use this checklist to track your deployment progress.

---

## Pre-Deployment Verification

### Code Changes
- [ ] Read `DEPLOY_NOW.md` to understand what's being deployed
- [ ] Verify `netlify/functions/driver-submissions.js` exists and is updated
- [ ] Verify `INSERT_TEST_VEHICLES.sql` exists in project root

### System State
- [ ] You have git access configured
- [ ] You can access Supabase dashboard
- [ ] You can access Netlify dashboard
- [ ] You have at least 11 free Netlify builds remaining (check: 11/12)

---

## STEP 1: Add Test Vehicles to Supabase

**Estimated Time: 2 minutes**

### Preparation
- [ ] Open Supabase dashboard: https://app.supabase.com
- [ ] Select your BLACK BIRD project
- [ ] Navigate to SQL Editor

### Execution
- [ ] Click: "New Query" button
- [ ] Open file: `INSERT_TEST_VEHICLES.sql`
- [ ] Copy entire contents of the file
- [ ] Paste into Supabase SQL Editor
- [ ] Click: "Run" button

### Verification
- [ ] You see message: "10 rows inserted" ✓
- [ ] No error messages appear

### Verify Data Inserted
Run in Supabase SQL Editor:
```
SELECT COUNT(*) FROM vehicles;  -- Should return 10
SELECT plate FROM vehicles LIMIT 3;  -- Should show ZM-01-AAA, etc
```

---

## STEP 2: Deploy Code Changes

**Estimated Time: 30 seconds work + 2 minutes auto-deploy**

Run these commands:
```bash
cd "D:\mainza\BLACK BIRD"
git add netlify/functions/driver-submissions.js
git commit -m "Fix driver submissions API and add approval endpoints"
git push origin main
```

Monitor at: https://app.netlify.com → Your Project → Deploys
- [ ] New deploy appears and starts building
- [ ] Status changes to "Published" (green checkmark)
- [ ] No error messages in logs

---

## STEP 3: Test Deployment

### Test A: Vehicles Dropdown
- [ ] ERP → Finance → Rent-to-Own → New Agreement
- [ ] Drivers dropdown shows all 51 drivers
- [ ] Vehicles dropdown shows 10 vehicles (ZM-01-AAA, etc.)
- [ ] Can successfully create an agreement

### Test B: Driver Submissions Display  
- [ ] ERP → Payments & Submissions → Driver Submissions tab
- [ ] Click Refresh
- [ ] Dates display properly (not "Invalid Date")
- [ ] All columns populated with data (not empty)

### Test C: Driver Submission Workflow (Optional)
- [ ] Driver portal (driver-login.html) → Log in with any driver
- [ ] Submit a payment (amount=5000, week=1)
- [ ] Go back to ERP
- [ ] Submission appears as "Pending"
- [ ] Click Approve → Status changes to "Approved"

---

## Success Checklist

✓ 10 vehicles inserted into Supabase
✓ Code deployed to Netlify (Published status)
✓ Vehicles dropdown populated in RTO
✓ Driver submissions display with valid dates
✓ Approval workflow functioning
✓ No error messages in browser console
✓ No error messages in Netlify logs

---

## Quick Help

If something fails:
1. Check DEPLOY_NOW.md for detailed troubleshooting
2. Check browser console: F12 → Console tab
3. Check Netlify logs: https://app.netlify.com → Deploys → View logs
4. Clear browser cache: Ctrl+Shift+Delete
5. Hard refresh: Ctrl+F5

---

Deployment Date: ____________
Status: ✓ COMPLETE / ○ IN PROGRESS / ✗ FAILED
