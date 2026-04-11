const express = require('express');
const db = require('../config');
const { supabase } = require('../supabase-config');
const router = express.Router();

// GET all rent-to-own agreements with filters
router.get('/', (req, res) => {
  const { status, driver_id, vehicle_id, search } = req.query;
  let query = `SELECT ra.*, d.name as driver_name, v.plate as vehicle_plate, v.make_model,
                      CASE
                        WHEN v.plate IS NOT NULL AND v.make_model IS NOT NULL THEN v.plate || ' · ' || v.make_model
                        WHEN v.plate IS NOT NULL THEN v.plate
                        WHEN v.make_model IS NOT NULL THEN v.make_model
                        ELSE 'Unknown Vehicle'
                      END as vehicle_name
              FROM rent_to_own_agreements ra
              LEFT JOIN drivers d ON ra.driver_id = d.id
              LEFT JOIN vehicles v ON ra.vehicle_id = v.id`;
  let params = [];

  const conditions = [];
  if (status) {
    conditions.push('ra.agreement_status = ?');
    params.push(status);
  }
  if (driver_id) {
    conditions.push('ra.driver_id = ?');
    params.push(driver_id);
  }
  if (vehicle_id) {
    conditions.push('ra.vehicle_id = ?');
    params.push(vehicle_id);
  }
  if (search) {
    conditions.push("(d.name LIKE ? OR v.plate LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY ra.created_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ data: rows || [] });
  });
});

// GET available drivers from SQLite (for RTO dropdown)
router.get('/available-drivers', (req, res) => {
  db.all('SELECT id, name, plate, type FROM drivers ORDER BY name', (err, rows) => {
    if (err) {
      console.error('Error fetching drivers:', err);
      return res.status(500).json({ error: 'Failed to fetch drivers' });
    }
    res.json({
      data: rows || [],
      count: (rows || []).length
    });
  });
});

// GET available vehicles from SQLite (for RTO dropdown)
router.get('/available-vehicles', (req, res) => {
  db.all('SELECT id, plate, type FROM vehicles ORDER BY plate', (err, rows) => {
    if (err) {
      console.error('Error fetching vehicles:', err);
      return res.status(500).json({ error: 'Failed to fetch vehicles' });
    }
    res.json({
      data: rows || [],
      count: (rows || []).length
    });
  });
});

// GET pending RTO payments for approval (MUST be before /:id route)
router.get('/approvals/pending', (req, res) => {
  const { search, date_from, date_to } = req.query;

  let query = `SELECT rp.*, ra.total_amount, ra.paid_amount, ra.remaining_balance, ra.agreement_status,
                      d.name as driver_name, v.plate as vehicle_plate, v.make_model,
                      CASE
                        WHEN v.plate IS NOT NULL AND v.make_model IS NOT NULL THEN v.plate || ' · ' || v.make_model
                        WHEN v.plate IS NOT NULL THEN v.plate
                        WHEN v.make_model IS NOT NULL THEN v.make_model
                        ELSE 'Unknown Vehicle'
                      END as vehicle_name
               FROM rent_to_own_payments rp
               JOIN rent_to_own_agreements ra ON rp.agreement_id = ra.id
               LEFT JOIN drivers d ON rp.driver_id = d.id
               LEFT JOIN vehicles v ON ra.vehicle_id = v.id
               WHERE rp.approval_status = 'pending'`;

  let params = [];

  if (search) {
    query += ` AND (d.name LIKE ? OR v.plate LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }

  if (date_from) {
    query += ` AND rp.created_at >= ?`;
    params.push(date_from);
  }

  if (date_to) {
    query += ` AND rp.created_at <= ?`;
    params.push(date_to);
  }

  query += ` ORDER BY rp.created_at DESC`;

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({
      data: rows || [],
      count: (rows || []).length
    });
  });
});

// GET single rent-to-own agreement with payment history
router.get('/:id', (req, res) => {
  db.get(
    `SELECT ra.*, d.name as driver_name, v.plate as vehicle_plate, v.make_model,
            CASE
              WHEN v.plate IS NOT NULL AND v.make_model IS NOT NULL THEN v.plate || ' · ' || v.make_model
              WHEN v.plate IS NOT NULL THEN v.plate
              WHEN v.make_model IS NOT NULL THEN v.make_model
              ELSE 'Unknown Vehicle'
            END as vehicle_name
     FROM rent_to_own_agreements ra
     LEFT JOIN drivers d ON ra.driver_id = d.id
     LEFT JOIN vehicles v ON ra.vehicle_id = v.id
     WHERE ra.id = ?`,
    [req.params.id],
    (err, agreement) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!agreement) {
        return res.status(404).json({ error: 'Rent-to-own agreement not found' });
      }

      // Get payment history
      db.all(
        'SELECT * FROM rent_to_own_payments WHERE agreement_id = ? ORDER BY payment_date DESC',
        [req.params.id],
        (err, payments) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          res.json({ ...agreement, payments: payments || [] });
        }
      );
    }
  );
});

// POST create rent-to-own agreement
router.post('/', (req, res) => {
  console.log('[RENT-TO-OWN POST] Request body:', JSON.stringify(req.body));

  const {
    driver_id,
    vehicle_id,
    total_amount,
    monthly_installment,
    start_date,
    expected_completion_date,
    notes
  } = req.body;

  console.log('[RENT-TO-OWN POST] Extracted: driver_id=' + driver_id + ', vehicle_id=' + vehicle_id + ', total_amount=' + total_amount);

  if (!driver_id || !vehicle_id || !total_amount) {
    console.log('[RENT-TO-OWN POST] Missing required fields');
    return res.status(400).json({ error: 'Driver ID, vehicle ID, and total amount are required' });
  }

  // Validate numeric values
  const parsedTotalAmount = parseFloat(total_amount);
  const parsedMonthlyInstallment = monthly_installment ? parseFloat(monthly_installment) : null;

  if (isNaN(parsedTotalAmount) || parsedTotalAmount <= 0) {
    return res.status(400).json({ error: 'Total amount must be a valid positive number' });
  }

  db.run(
    `INSERT INTO rent_to_own_agreements
     (driver_id, vehicle_id, total_amount, paid_amount, remaining_balance, monthly_installment,
      start_date, expected_completion_date, agreement_status, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [
      parseInt(driver_id),
      parseInt(vehicle_id),
      parsedTotalAmount,
      0,
      parsedTotalAmount,
      parsedMonthlyInstallment,
      start_date || null,
      expected_completion_date || null,
      'Active',
      notes || null
    ],
    function(err) {
      if (err) {
        console.error('Database error creating rent-to-own agreement:', err);
        return res.status(500).json({ error: 'Failed to create rent-to-own agreement: ' + err.message });
      }
      res.json({
        id: this.lastID,
        driver_id: parseInt(driver_id),
        vehicle_id: parseInt(vehicle_id),
        total_amount: parsedTotalAmount,
        paid_amount: 0,
        remaining_balance: parsedTotalAmount,
        agreement_status: 'Active'
      });
    }
  );
});

// PUT update rent-to-own agreement
router.put('/:id', (req, res) => {
  const {
    driver_id,
    vehicle_id,
    total_amount,
    monthly_installment,
    start_date,
    expected_completion_date,
    notes,
    agreement_status
  } = req.body;

  if (!driver_id || !vehicle_id || !total_amount) {
    return res.status(400).json({ error: 'Driver ID, vehicle ID, and total amount are required' });
  }

  db.run(
    `UPDATE rent_to_own_agreements
     SET driver_id=?, vehicle_id=?, total_amount=?, monthly_installment=?,
         start_date=?, expected_completion_date=?, notes=?, agreement_status=?, updated_at=CURRENT_TIMESTAMP
     WHERE id=?`,
    [
      driver_id,
      vehicle_id,
      total_amount,
      monthly_installment || null,
      start_date || null,
      expected_completion_date || null,
      notes || null,
      agreement_status || 'Active',
      req.params.id
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update agreement' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Agreement not found' });
      }
      res.json({ message: 'Rent-to-own agreement updated successfully' });
    }
  );
});

// POST record payment for rent-to-own agreement
router.post('/:id/record-payment', (req, res) => {
  const { payment_date, payment_amount, notes } = req.body;

  if (!payment_date || !payment_amount) {
    return res.status(400).json({ error: 'Payment date and amount are required' });
  }

  // Get current agreement
  db.get('SELECT * FROM rent_to_own_agreements WHERE id = ?', [req.params.id], (err, agreement) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!agreement) {
      return res.status(404).json({ error: 'Agreement not found' });
    }

    // Record the payment
    db.run(
      'INSERT INTO rent_to_own_payments (agreement_id, payment_date, payment_amount, notes) VALUES (?, ?, ?, ?)',
      [req.params.id, payment_date, payment_amount, notes || null],
      async function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to record payment' });
        }

        // Update agreement with new payment amount and balance
        const newPaidAmount = (agreement.paid_amount || 0) + payment_amount;
        const newRemainingBalance = agreement.total_amount - newPaidAmount;
        const isCompleted = newRemainingBalance <= 0;

        const updateValues = [
          newPaidAmount,
          newRemainingBalance,
          isCompleted ? 1 : agreement.ownership_transferred,
          isCompleted ? new Date().toISOString().split('T')[0] : agreement.ownership_transferred_date,
          isCompleted ? 'Completed' : agreement.agreement_status,
          req.params.id
        ];

        db.run(
          `UPDATE rent_to_own_agreements
           SET paid_amount=?, remaining_balance=?, ownership_transferred=?,
               ownership_transferred_date=?, agreement_status=?, updated_at=CURRENT_TIMESTAMP
           WHERE id=?`,
          updateValues,
          async function(err) {
            if (err) {
              return res.status(500).json({ error: 'Failed to update agreement' });
            }

            // Also create a payment record in Supabase for visibility in driver portal
            try {
              const driverId = agreement.driver_id;
              const paymentData = {
                payment_type: 'rent_to_own',
                payer_name: `Driver #${driverId}`,
                amount: payment_amount,
                description: notes || null,
                payment_date: payment_date,
                driver_id: driverId,
                rent_to_own_agreement_id: req.params.id,
                is_backdated: false
              };

              const { error: paymentError } = await supabase
                .from('payments')
                .insert([paymentData]);

              if (paymentError) {
                console.error('Error creating payment record:', paymentError);
                // Don't fail the request, just log it
              }
            } catch (err) {
              console.error('Error creating Supabase payment record:', err);
              // Don't fail the request
            }

            res.json({
              message: 'Payment recorded successfully',
              payment_id: this.lastID,
              agreement_id: req.params.id,
              paid_amount: newPaidAmount,
              remaining_balance: newRemainingBalance,
              ownership_transferred: isCompleted,
              agreement_status: isCompleted ? 'Completed' : agreement.agreement_status
            });
          }
        );
      }
    );
  });
});

// POST submit payment for approval (driver portal)
router.post('/:id/submit-for-approval', (req, res) => {
  const { payment_date, payment_amount, notes, driver_id } = req.body;

  if (!payment_date || !payment_amount || !driver_id) {
    return res.status(400).json({ error: 'Payment date, amount, and driver ID are required' });
  }

  // Validate payment amount
  const parsedAmount = parseFloat(payment_amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: 'Payment amount must be a valid positive number' });
  }

  // Get agreement to verify it exists
  db.get('SELECT * FROM rent_to_own_agreements WHERE id = ? AND driver_id = ?',
    [req.params.id, driver_id],
    (err, agreement) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!agreement) {
        return res.status(404).json({ error: 'Agreement not found' });
      }

      // Create pending payment record
      db.run(
        `INSERT INTO rent_to_own_payments
         (agreement_id, driver_id, payment_date, payment_amount, notes, approval_status, payment_type)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [req.params.id, driver_id, payment_date, parsedAmount, notes || null, 'pending', 'Driver Submission'],
        function(err) {
          if (err) {
            console.error('Error creating pending payment:', err);
            return res.status(500).json({ error: 'Failed to submit payment for approval' });
          }

          res.json({
            message: 'Payment submitted for approval. Waiting for secretary confirmation...',
            payment_id: this.lastID,
            agreement_id: req.params.id,
            approval_status: 'pending'
          });
        }
      );
    }
  );
});

// POST approve pending RTO payment
router.post('/:id/approve-payment/:payment_id', (req, res) => {
  const { approvedBy, notes } = req.body;
  const agreementId = req.params.id;
  const paymentId = req.params.payment_id;

  // Get the pending payment
  db.get('SELECT * FROM rent_to_own_payments WHERE id = ? AND agreement_id = ?',
    [paymentId, agreementId],
    (err, payment) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!payment) {
        return res.status(404).json({ error: 'Payment not found' });
      }
      if (payment.approval_status !== 'pending') {
        return res.status(400).json({ error: 'Payment is not in pending status' });
      }

      // Get the agreement
      db.get('SELECT * FROM rent_to_own_agreements WHERE id = ?', [agreementId],
        (err, agreement) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          if (!agreement) {
            return res.status(404).json({ error: 'Agreement not found' });
          }

          // Calculate new balances
          const newPaidAmount = (agreement.paid_amount || 0) + payment.payment_amount;
          const newRemainingBalance = agreement.total_amount - newPaidAmount;
          const isCompleted = newRemainingBalance <= 0;

          // Update payment record to approved
          db.run(
            `UPDATE rent_to_own_payments
             SET approval_status = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            ['approved', approvedBy || 'Secretary', paymentId],
            function(err) {
              if (err) {
                return res.status(500).json({ error: 'Failed to approve payment' });
              }

              // Update agreement with new balances
              db.run(
                `UPDATE rent_to_own_agreements
                 SET paid_amount=?, remaining_balance=?, ownership_transferred=?,
                     ownership_transferred_date=?, agreement_status=?, updated_at=CURRENT_TIMESTAMP
                 WHERE id=?`,
                [
                  newPaidAmount,
                  newRemainingBalance,
                  isCompleted ? 1 : agreement.ownership_transferred,
                  isCompleted ? new Date().toISOString().split('T')[0] : agreement.ownership_transferred_date,
                  isCompleted ? 'Completed' : agreement.agreement_status,
                  agreementId
                ],
                async function(err) {
                  if (err) {
                    return res.status(500).json({ error: 'Failed to update agreement' });
                  }

                  // Create record in Supabase payments table
                  try {
                    const paymentData = {
                      payment_type: 'rent_to_own',
                      payer_name: `Driver #${payment.driver_id}`,
                      amount: payment.payment_amount,
                      description: payment.notes || null,
                      payment_date: payment.payment_date,
                      driver_id: payment.driver_id,
                      rent_to_own_agreement_id: agreementId,
                      is_backdated: false
                    };

                    const { error: paymentError } = await supabase
                      .from('payments')
                      .insert([paymentData]);

                    if (paymentError) {
                      console.error('Error creating payment record:', paymentError);
                    }
                  } catch (err) {
                    console.error('Error creating Supabase payment record:', err);
                  }

                  res.json({
                    message: 'Payment approved successfully',
                    payment_id: paymentId,
                    agreement_id: agreementId,
                    paid_amount: newPaidAmount,
                    remaining_balance: newRemainingBalance,
                    ownership_transferred: isCompleted,
                    agreement_status: isCompleted ? 'Completed' : agreement.agreement_status
                  });
                }
              );
            }
          );
        }
      );
    }
  );
});

// POST reject pending RTO payment
router.post('/:id/reject-payment/:payment_id', (req, res) => {
  const { rejectionReason } = req.body;
  const agreementId = req.params.id;
  const paymentId = req.params.payment_id;

  db.get('SELECT * FROM rent_to_own_payments WHERE id = ? AND agreement_id = ?',
    [paymentId, agreementId],
    (err, payment) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!payment) {
        return res.status(404).json({ error: 'Payment not found' });
      }
      if (payment.approval_status !== 'pending') {
        return res.status(400).json({ error: 'Payment is not in pending status' });
      }

      // Update payment record to rejected
      db.run(
        `UPDATE rent_to_own_payments
         SET approval_status = ?, rejection_reason = ?, approved_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        ['rejected', rejectionReason || null, paymentId],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to reject payment' });
          }

          res.json({
            message: 'Payment rejected successfully',
            payment_id: paymentId,
            agreement_id: agreementId
          });
        }
      );
    }
  );
});

// DELETE rent-to-own agreement
router.delete('/:id', (req, res) => {
  db.run('DELETE FROM rent_to_own_agreements WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete agreement' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Agreement not found' });
    }
    res.json({ message: 'Rent-to-own agreement deleted successfully' });
  });
});

module.exports = router;
