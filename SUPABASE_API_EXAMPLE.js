// ============================================
// SUPABASE CLIENT INITIALIZATION
// File: server/lib/supabase.js
// ============================================

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials in .env file');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;

// ============================================
// EXAMPLE 1: DRIVERS ROUTES
// File: server/routes/drivers.js (UPDATED)
// ============================================

const express = require('express');
const supabase = require('../lib/supabase');
const router = express.Router();

// GET all drivers with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const { search, status, type, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('drivers')
      .select('*');

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,plate_number.ilike.%${search}%`);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (type) {
      query = query.eq('vehicle_type', type);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) throw error;

    res.json({
      data,
      pagination: { total: count, limit, offset }
    });
  } catch (err) {
    console.error('Error fetching drivers:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET single driver
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Driver not found' });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE driver
router.post('/', async (req, res) => {
  try {
    const { name, phone, national_id, license_number, vehicle_type, status } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }

    const { data, error } = await supabase
      .from('drivers')
      .insert([{
        name,
        phone,
        national_id,
        license_number,
        vehicle_type,
        status: status || 'Active',
        assigned_date: new Date().toISOString().split('T')[0]
      }])
      .select();

    if (error) throw error;

    res.status(201).json(data[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Phone number already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// UPDATE driver
router.put('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('drivers')
      .update(req.body)
      .eq('id', req.params.id)
      .select();

    if (error) throw error;
    if (data.length === 0) return res.status(404).json({ error: 'Driver not found' });

    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE driver
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('drivers')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true, message: 'Driver deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

// ============================================
// EXAMPLE 2: VEHICLES ROUTES
// File: server/routes/vehicles.js (UPDATED)
// ============================================

const express = require('express');
const supabase = require('../lib/supabase');
const router = express.Router();

// GET all vehicles
router.get('/', async (req, res) => {
  try {
    const { search, status, type } = req.query;

    let query = supabase
      .from('vehicles')
      .select(`
        *,
        driver:assigned_driver_id(id, name, phone)
      `);

    if (search) {
      query = query.or(`plate_number.ilike.%${search}%`);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (type) {
      query = query.eq('vehicle_type', type);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE vehicle
router.post('/', async (req, res) => {
  try {
    const { plate_number, vehicle_type, make_model, assigned_driver_id } = req.body;

    if (!plate_number || !vehicle_type) {
      return res.status(400).json({ error: 'Plate number and vehicle type are required' });
    }

    const { data, error } = await supabase
      .from('vehicles')
      .insert([{
        plate_number,
        vehicle_type,
        make_model,
        assigned_driver_id,
        vehicle_condition: 'Good',
        status: 'Active'
      }])
      .select();

    if (error) throw error;

    res.status(201).json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

// ============================================
// EXAMPLE 3: DRIVER SUBMISSIONS (PAYMENTS)
// File: server/routes/driver-submissions.js (UPDATED)
// ============================================

const express = require('express');
const supabase = require('../lib/supabase');
const router = express.Router();

// GET all submissions (admin only)
router.get('/', async (req, res) => {
  try {
    const { driver_id, status } = req.query;

    let query = supabase
      .from('driver_submissions')
      .select(`
        *,
        driver:driver_id(id, name, phone)
      `);

    if (driver_id) {
      query = query.eq('driver_id', driver_id);
    }
    if (status) {
      query = query.eq('approval_status', status);
    }

    const { data, error } = await query.order('submission_date', { ascending: false });

    if (error) throw error;

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE submission (driver submits payment)
router.post('/', async (req, res) => {
  try {
    const { driver_id, amount, submission_date } = req.body;

    if (!driver_id || !amount) {
      return res.status(400).json({ error: 'Driver ID and amount are required' });
    }

    const { data, error } = await supabase
      .from('driver_submissions')
      .insert([{
        driver_id,
        amount,
        submission_date: submission_date || new Date().toISOString().split('T')[0],
        approval_status: 'Pending'
      }])
      .select();

    if (error) throw error;

    res.status(201).json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// APPROVE submission
router.post('/:id/approve', async (req, res) => {
  try {
    const { staff_id } = req.body;

    // Update submission
    const { data: submissionData, error: updateError } = await supabase
      .from('driver_submissions')
      .update({
        approval_status: 'Approved',
        approved_by_staff_id: staff_id,
        approval_date: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select();

    if (updateError) throw updateError;

    const submission = submissionData[0];

    // Create payment record
    const { data: paymentData, error: paymentError } = await supabase
      .from('payments')
      .insert([{
        driver_id: submission.driver_id,
        submission_id: submission.id,
        amount: submission.amount,
        payment_date: new Date().toISOString().split('T')[0],
        status: 'Completed'
      }])
      .select();

    if (paymentError) throw paymentError;

    res.json({ submission: submissionData[0], payment: paymentData[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// REJECT submission
router.post('/:id/reject', async (req, res) => {
  try {
    const { rejection_reason, staff_id } = req.body;

    const { data, error } = await supabase
      .from('driver_submissions')
      .update({
        approval_status: 'Rejected',
        rejection_reason,
        approved_by_staff_id: staff_id
      })
      .eq('id', req.params.id)
      .select();

    if (error) throw error;

    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

// ============================================
// EXAMPLE 4: AUTHENTICATION ROUTES
// File: server/routes/auth.js (UPDATED)
// ============================================

const express = require('express');
const supabase = require('../lib/supabase');
const router = express.Router();
const jwt = require('jsonwebtoken');

// STAFF LOGIN
router.post('/staff-login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) throw authError;

    // Get staff info
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('id, name, role, email')
      .eq('auth_user_id', authData.user.id)
      .single();

    if (staffError) throw staffError;

    // Create JWT token for API
    const token = jwt.sign(
      { userId: authData.user.id, role: staffData.role, type: 'staff' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      staffId: staffData.id,
      name: staffData.name,
      role: staffData.role,
      email: staffData.email
    });
  } catch (err) {
    console.error('Staff login error:', err);
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// DRIVER LOGIN
router.post('/driver-login', async (req, res) => {
  try {
    const { driverId, password } = req.body;

    if (!driverId || !password) {
      return res.status(400).json({ error: 'Driver ID and password required' });
    }

    // Get driver account
    const { data: accountData, error: accountError } = await supabase
      .from('driver_accounts')
      .select('*')
      .eq('driver_id', driverId)
      .single();

    if (accountError || !accountData) {
      return res.status(401).json({ error: 'Invalid driver ID or password' });
    }

    // Verify password (in production, use bcrypt)
    // For now, authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: accountData.email,
      password
    });

    if (authError) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Get driver info
    const { data: driverData } = await supabase
      .from('drivers')
      .select('id, name, phone')
      .eq('id', driverId)
      .single();

    // Create JWT token
    const token = jwt.sign(
      { userId: authData.user.id, driverId, type: 'driver' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      driverId: driverData.id,
      driverName: driverData.name,
      phone: driverData.phone
    });
  } catch (err) {
    console.error('Driver login error:', err);
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

module.exports = router;

// ============================================
// EXAMPLE 5: RENT-TO-OWN ROUTES
// File: server/routes/rent-to-own.js (UPDATED)
// ============================================

const express = require('express');
const supabase = require('../lib/supabase');
const router = express.Router();

// GET all rent-to-own agreements
router.get('/', async (req, res) => {
  try {
    const { driver_id, status } = req.query;

    let query = supabase
      .from('rent_to_own_agreements')
      .select(`
        *,
        driver:driver_id(id, name, phone),
        vehicle:vehicle_id(plate_number, vehicle_type)
      `);

    if (driver_id) {
      query = query.eq('driver_id', driver_id);
    }
    if (status) {
      query = query.eq('agreement_status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE rent-to-own agreement
router.post('/', async (req, res) => {
  try {
    const { driver_id, vehicle_id, total_price } = req.body;

    if (!driver_id || !vehicle_id || !total_price) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data, error } = await supabase
      .from('rent_to_own_agreements')
      .insert([{
        driver_id,
        vehicle_id,
        total_price,
        paid_amount: 0,
        remaining_balance: total_price,
        agreement_status: 'Active',
        agreement_date: new Date().toISOString().split('T')[0],
        ownership_transferred: false
      }])
      .select();

    if (error) throw error;

    res.status(201).json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// RECORD payment for rent-to-own
router.post('/:id/record-payment', async (req, res) => {
  try {
    const { amount, payment_method } = req.body;
    const agreementId = req.params.id;

    if (!amount) {
      return res.status(400).json({ error: 'Amount is required' });
    }

    // Get current agreement
    const { data: agreement, error: getError } = await supabase
      .from('rent_to_own_agreements')
      .select('*')
      .eq('id', agreementId)
      .single();

    if (getError) throw getError;

    // Calculate new balance
    const newPaidAmount = agreement.paid_amount + amount;
    const newBalance = agreement.remaining_balance - amount;
    const isCompleted = newBalance <= 0;

    // Record payment
    const { data: paymentData, error: paymentError } = await supabase
      .from('rent_to_own_payments')
      .insert([{
        agreement_id: agreementId,
        amount,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method
      }])
      .select();

    if (paymentError) throw paymentError;

    // Update agreement
    const updatePayload = {
      paid_amount: newPaidAmount,
      remaining_balance: Math.max(0, newBalance)
    };

    if (isCompleted) {
      updatePayload.agreement_status = 'Completed';
      updatePayload.ownership_transferred = true;
      updatePayload.ownership_transferred_date = new Date().toISOString();
    }

    const { data: updatedAgreement, error: updateError } = await supabase
      .from('rent_to_own_agreements')
      .update(updatePayload)
      .eq('id', agreementId)
      .select();

    if (updateError) throw updateError;

    res.json({
      payment: paymentData[0],
      agreement: updatedAgreement[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
