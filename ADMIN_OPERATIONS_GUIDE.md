# Admin Operations Guide - Edit, Delete & Cleanup

## Issue: Dropdowns Showing "No drivers available" / "No vehicles available"

### Problem
The RTO Agreement creation modal is not pulling driver and vehicle data from Supabase.

### Root Cause
The frontend form needs to call the API endpoints to populate the dropdowns:
- `/api/rent-to-own/available-drivers` 
- `/api/rent-to-own/available-vehicles`

### Fix: Frontend Code Update Needed in erp.html

The modal needs to load drivers and vehicles when it opens. Look for code that opens the modal and add this:

```javascript
function openRTOModal() {
  // Load drivers
  fetch(baseUrl + '/api/rent-to-own/available-drivers', { headers })
    .then(r => r.json())
    .then(result => {
      const driverSelect = document.getElementById('rto-driver-select');
      driverSelect.innerHTML = '<option value="">Select Driver...</option>';
      if (result.data && result.data.length > 0) {
        result.data.forEach(driver => {
          const option = document.createElement('option');
          option.value = driver.id;
          option.textContent = driver.name;
          driverSelect.appendChild(option);
        });
      } else {
        driverSelect.innerHTML = '<option value="">No drivers available</option>';
      }
    })
    .catch(err => console.error('Error loading drivers:', err));

  // Load vehicles
  fetch(baseUrl + '/api/rent-to-own/available-vehicles', { headers })
    .then(r => r.json())
    .then(result => {
      const vehicleSelect = document.getElementById('rto-vehicle-select');
      vehicleSelect.innerHTML = '<option value="">Select Vehicle...</option>';
      if (result.data && result.data.length > 0) {
        result.data.forEach(vehicle => {
          const option = document.createElement('option');
          option.value = vehicle.id;
          option.textContent = `${vehicle.plate} (${vehicle.make_model})`;
          vehicleSelect.appendChild(option);
        });
      } else {
        vehicleSelect.innerHTML = '<option value="">No vehicles available</option>';
      }
    })
    .catch(err => console.error('Error loading vehicles:', err));

  // Show modal
  document.getElementById('rto-modal').style.display = 'block';
}
```

**Verify the API endpoints exist:**
```
GET /api/rent-to-own/available-drivers
  Returns: { data: [ {id, name}, ... ] }

GET /api/rent-to-own/available-vehicles
  Returns: { data: [ {id, plate, make_model}, ... ] }
```

---

## Edit & Delete Functionality

### 1. Edit Driver Submissions (Pending Only)

**Frontend Code:**
```javascript
async function editSubmission(submissionId, amount, week, month, notes) {
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` };
  
  const response = await fetch(`${baseUrl}/api/driver-submissions/${submissionId}`, {
    method: 'PATCH',
    headers: headers,
    body: JSON.stringify({ amount, week, month, notes })
  });

  if (response.ok) {
    alert('Submission updated successfully');
    loadDriverSubmissions(); // Refresh
  } else {
    alert('Error: Can only edit pending submissions');
  }
}

async function deleteSubmission(submissionId) {
  if (!confirm('Delete this submission?')) return;
  
  const headers = { 'Authorization': `Bearer ${authToken}` };
  
  const response = await fetch(`${baseUrl}/api/driver-submissions/${submissionId}`, {
    method: 'DELETE',
    headers: headers
  });

  if (response.ok) {
    alert('Submission deleted');
    loadDriverSubmissions(); // Refresh
  } else {
    alert('Error deleting submission');
  }
}
```

**API Endpoints:**
```
PATCH /api/driver-submissions/:id
  Body: { amount, week, month, notes }
  Response: { data: updated_submission }
  Note: Can only edit submissions with status = "Pending"

DELETE /api/driver-submissions/:id
  Response: { message: "Deleted successfully" }
```

---

### 2. Edit Payments

**Frontend Code:**
```javascript
async function editPayment(paymentId, amount, payer_name, description) {
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` };
  
  const response = await fetch(`${baseUrl}/api/payments/${paymentId}`, {
    method: 'PUT',
    headers: headers,
    body: JSON.stringify({ amount, payer_name, description })
  });

  if (response.ok) {
    alert('Payment updated');
    loadPayments(); // Refresh
  } else {
    alert('Error updating payment');
  }
}

async function deletePayment(paymentId) {
  if (!confirm('Delete this payment? This cannot be undone.')) return;
  
  const headers = { 'Authorization': `Bearer ${authToken}` };
  
  const response = await fetch(`${baseUrl}/api/payments/${paymentId}`, {
    method: 'DELETE',
    headers: headers
  });

  if (response.ok) {
    alert('Payment deleted');
    loadPayments(); // Refresh
  } else {
    alert('Error deleting payment');
  }
}
```

**API Endpoints:**
```
PUT /api/payments/:id
  Body: { amount, payer_name, description, payment_date, etc. }
  Response: { data: updated_payment }

DELETE /api/payments/:id
  Response: { message: "Deleted successfully" }
```

---

### 3. Delete RTO Agreements

**Frontend Code:**
```javascript
async function deleteRTOAgreement(agreementId) {
  if (!confirm('Delete this RTO agreement AND all associated payments?')) return;
  
  const headers = { 'Authorization': `Bearer ${authToken}` };
  
  const response = await fetch(`${baseUrl}/api/admin-cleanup/delete-rto/${agreementId}`, {
    method: 'POST',
    headers: headers
  });

  if (response.ok) {
    alert('RTO agreement and payments deleted');
    renderRentToOwn(); // Refresh
  } else {
    alert('Error deleting RTO agreement');
  }
}
```

**API Endpoint:**
```
POST /api/admin-cleanup/delete-rto/:id
  Response: { message: "RTO agreement and associated payments deleted" }
  Note: Automatically deletes all associated rent_to_own_payments
```

---

## Cleanup Test Data

### After Testing, Delete Everything Created

**Option 1: Delete All Test Data at Once**
```javascript
async function deleteAllTestData() {
  if (!confirm('DELETE ALL TEST DATA? This cannot be undone!')) return;
  
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` };
  
  // Delete RTO data
  let response = await fetch(`${baseUrl}/api/admin-cleanup/delete-test-data`, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({ dataType: 'rto_agreements' })
  });
  
  if (response.ok) {
    const result = await response.json();
    console.log(`Deleted ${result.deletedCount} RTO records`);
  }

  // Delete driver submissions
  response = await fetch(`${baseUrl}/api/admin-cleanup/delete-test-data`, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({ dataType: 'driver_submissions' })
  });
  
  if (response.ok) {
    const result = await response.json();
    console.log(`Deleted ${result.deletedCount} submissions`);
  }

  // Delete test payments
  response = await fetch(`${baseUrl}/api/admin-cleanup/delete-test-data`, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({ dataType: 'payments' })
  });
  
  if (response.ok) {
    const result = await response.json();
    console.log(`Deleted ${result.deletedCount} payments`);
  }

  alert('All test data has been deleted');
  location.reload(); // Reload page
}
```

**Option 2: Delete Specific Data Type**
```javascript
async function deleteTestDataByType(dataType) {
  // dataType: 'rto_agreements', 'driver_submissions', 'payments', or 'all'
  
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` };
  
  const response = await fetch(`${baseUrl}/api/admin-cleanup/delete-test-data`, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({ dataType: dataType })
  });

  if (response.ok) {
    const result = await response.json();
    alert(`${result.message}`);
    location.reload();
  }
}
```

**API Endpoint:**
```
POST /api/admin-cleanup/delete-test-data
  Body: { dataType: 'rto_agreements' | 'driver_submissions' | 'payments' | 'all' }
  Response: { message: "X records deleted", deletedCount: X }
  
  Note: Only deletes records created from 2026-04-01 onwards (test data)
```

---

## Admin Panel Operations (Add to ERP Dashboard)

### Add to erp.html Header:

```html
<div style="position: fixed; top: 10px; right: 10px; z-index: 1000;">
  <button onclick="openAdminPanel()" style="background: #c0392b; color: white; padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer;">
    Admin Tools
  </button>
</div>

<div id="admin-panel" style="display: none; position: fixed; top: 50px; right: 10px; background: white; border: 1px solid #ccc; border-radius: 8px; padding: 20px; z-index: 999; min-width: 300px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
  <h3>Admin Tools</h3>
  <hr>
  
  <h4>Cleanup Test Data</h4>
  <button onclick="deleteTestDataByType('rto_agreements')" style="display: block; width: 100%; padding: 10px; margin: 5px 0; background: #e74c3c; color: white; border: none; cursor: pointer; border-radius: 4px;">
    Delete Test RTO Agreements
  </button>
  
  <button onclick="deleteTestDataByType('driver_submissions')" style="display: block; width: 100%; padding: 10px; margin: 5px 0; background: #e74c3c; color: white; border: none; cursor: pointer; border-radius: 4px;">
    Delete Test Driver Submissions
  </button>
  
  <button onclick="deleteTestDataByType('payments')" style="display: block; width: 100%; padding: 10px; margin: 5px 0; background: #e74c3c; color: white; border: none; cursor: pointer; border-radius: 4px;">
    Delete Test Payments
  </button>
  
  <button onclick="deleteAllTestData()" style="display: block; width: 100%; padding: 10px; margin: 5px 0; background: #c0392b; color: white; border: none; cursor: pointer; border-radius: 4px; font-weight: bold;">
    DELETE ALL TEST DATA
  </button>
  
  <hr style="margin: 10px 0;">
  
  <h4>Quick Stats</h4>
  <p id="admin-stats" style="font-size: 12px; color: #666;">Loading...</p>
  
  <button onclick="closeAdminPanel()" style="display: block; width: 100%; padding: 10px; margin-top: 10px; background: #95a5a6; color: white; border: none; cursor: pointer; border-radius: 4px;">
    Close
  </button>
</div>
```

### JavaScript Functions:

```javascript
function openAdminPanel() {
  document.getElementById('admin-panel').style.display = 'block';
  loadAdminStats();
}

function closeAdminPanel() {
  document.getElementById('admin-panel').style.display = 'none';
}

async function loadAdminStats() {
  try {
    const statsText = `
    RTO Agreements: Loading...
    Submissions: Loading...
    Payments: Loading...
    `;
    document.getElementById('admin-stats').innerText = statsText;
    
    // Load actual stats from API if needed
  } catch (err) {
    console.error('Error loading stats:', err);
  }
}
```

---

## Complete Workflow After Testing

### 1. Test System Fully
- Create test RTO agreements ✓
- Create test submissions ✓
- Create test payments ✓
- Test approvals ✓
- Test auto-completion ✓

### 2. Verify Everything Works
- Drivers can submit ✓
- Staff can approve ✓
- Payments recorded correctly ✓
- Balances update correctly ✓

### 3. Delete All Test Data
```javascript
deleteAllTestData(); // Removes all test data
```

### 4. System is Clean
- Real vehicles only (41)
- Real drivers only (51)
- Real agreements/payments (any you manually created)
- Ready for production use

---

## Important Notes

⚠️ **Edit Restrictions:**
- Can only edit driver submissions that are "Pending"
- Approved/Rejected submissions cannot be edited
- Delete option available for all pending submissions

⚠️ **Delete Precautions:**
- Deleting RTO agreement automatically deletes all payments
- Test data deletion only removes records from April 2026
- Use admin cleanup function to remove only test data
- Verify you want to delete before confirming

✅ **Best Practices:**
1. Always test with test data first
2. Delete all test data before go-live
3. Keep real data separate from test data
4. Use admin panel for cleanup operations
5. Verify data before deleting critical records

---

## API Summary

| Operation | Endpoint | Method | Body | Purpose |
|-----------|----------|--------|------|---------|
| Edit submission | `/api/driver-submissions/:id` | PATCH | {amount, week, month, notes} | Edit pending submission |
| Delete submission | `/api/driver-submissions/:id` | DELETE | None | Remove submission |
| Edit payment | `/api/payments/:id` | PUT | {amount, description} | Edit payment record |
| Delete payment | `/api/payments/:id` | DELETE | None | Remove payment |
| Delete RTO | `/api/admin-cleanup/delete-rto/:id` | POST | None | Delete agreement + payments |
| Cleanup test data | `/api/admin-cleanup/delete-test-data` | POST | {dataType} | Bulk delete test records |

---

**Your system now has complete admin control for editing, deleting, and cleaning up data!**
