const express = require('express');
const db = require('../config');
const authMiddleware = require('../middleware/auth');
const { insert } = require('../supabase-config');
const router = express.Router();

/**
 * DRIVER SUBMISSION ROUTES
 * Handles driver payment submissions and admin approval/rejection
 */

// ============================================
// DRIVER ENDPOINTS (Accessible to drivers only)
// ============================================

/**
 * POST /api/driver-submissions
 * Create a new payment submission
 * Auth: Driver account only
 */
router.post('/', authMiddleware, (req, res) => {
  // Verify this is a driver account
  if (!req.user.driver_id) {
    return res.status(403).json({ error: 'Only drivers can submit payments' });
  }

  const { amount, week, month, notes } = req.body;

  // Validation
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number' });
  }

  if (amount > 999999.99) {
    return res.status(400).json({ error: 'Amount exceeds maximum limit' });
  }

  const today = new Date().toISOString().split('T')[0];
  const submissionWeek = week || Math.ceil(new Date().getDate() / 7);
  const submissionMonth = month || new Date().getMonth() + 1;

  db.run(
    `INSERT INTO payment_submissions (driver_id, submission_date, amount, week, month, notes, submission_status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [req.user.driver_id, today, amount, submissionWeek, submissionMonth, notes || null],
    function(err) {
      if (err) {
        console.error('[SUBMISSION] Error creating payment submission:', {
          driverId: req.user.driver_id,
          amount: amount,
          week: submissionWeek,
          month: submissionMonth,
          error: err.message
        });
        return res.status(500).json({ error: 'Failed to create submission: ' + err.message });
      }

      // Get the created submission
      db.get(
        `SELECT id, driver_id, submission_date, amount, week, month, notes, submission_status, created_at
         FROM payment_submissions WHERE id = ?`,
        [this.lastID],
        (err, submission) => {
          if (err) {
            return res.status(500).json({ error: 'Failed to retrieve submission' });
          }
          res.status(201).json({
            message: 'Payment submission created successfully',
            data: submission
          });
        }
      );
    }
  );
});

/**
 * GET /api/driver-submissions/my-submissions
 * Get driver's own submissions
 * Auth: Driver account only
 * Query params: ?status=pending&limit=10&offset=0
 */
router.get('/my-submissions', authMiddleware, (req, res) => {
  // Verify this is a driver account
  if (!req.user.driver_id) {
    return res.status(403).json({ error: 'Only drivers can view their submissions' });
  }

  const { status, limit = 10, offset = 0 } = req.query;
  const driverId = req.user.driver_id;

  let query = 'SELECT * FROM payment_submissions WHERE driver_id = ?';
  const params = [driverId];

  if (status) {
    query += ' AND submission_status = ?';
    params.push(status);
  }

  query += ' ORDER BY submission_date DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  db.all(query, params, (err, submissions) => {
    if (err) {
      console.error('Error fetching submissions:', err);
      return res.status(500).json({ error: 'Failed to fetch submissions' });
    }

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as count FROM payment_submissions WHERE driver_id = ?';
    const countParams = [driverId];

    if (status) {
      countQuery += ' AND submission_status = ?';
      countParams.push(status);
    }

    db.get(countQuery, countParams, (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to count submissions' });
      }

      res.json({
        data: submissions || [],
        total: result?.count || 0,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
    });
  });
});

/**
 * GET /api/driver-submissions/my-submissions/:id
 * Get single submission details
 * Auth: Driver account only (can only view own)
 */
router.get('/my-submissions/:id', authMiddleware, (req, res) => {
  if (!req.user.driver_id) {
    return res.status(403).json({ error: 'Only drivers can view their submissions' });
  }

  const { id } = req.params;

  db.get(
    `SELECT ps.*, d.name as driver_name, d.phone as driver_phone
     FROM payment_submissions ps
     JOIN drivers d ON ps.driver_id = d.id
     WHERE ps.id = ? AND ps.driver_id = ?`,
    [id, req.user.driver_id],
    (err, submission) => {
      if (err) {
        console.error('Error fetching submission:', err);
        return res.status(500).json({ error: 'Failed to fetch submission' });
      }

      if (!submission) {
        return res.status(404).json({ error: 'Submission not found' });
      }

      res.json({ data: submission });
    }
  );
});

// ============================================
// ADMIN ENDPOINTS (Secretary/HR approval)
// ============================================

/**
 * GET /api/driver-submissions
 * List all submissions (with filters)
 * Auth: Secretary or HR role
 * Query params: ?status=pending&driver_id=1&week=1&month=4&limit=20&offset=0
 */
router.get('/', authMiddleware, (req, res) => {
  // Verify this is secretary or HR
  if (!['secretary', 'hr'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Only Secretary or HR can view submissions' });
  }

  const { status, driver_id, week, month, limit = 20, offset = 0, search } = req.query;

  let query = `SELECT ps.*, d.name as driver_name, d.phone as driver_phone, d.plate
               FROM payment_submissions ps
               JOIN drivers d ON ps.driver_id = d.id
               WHERE 1=1`;
  const params = [];

  if (status) {
    query += ' AND ps.submission_status = ?';
    params.push(status);
  }

  if (driver_id) {
    query += ' AND ps.driver_id = ?';
    params.push(driver_id);
  }

  if (week) {
    query += ' AND ps.week = ?';
    params.push(week);
  }

  if (month) {
    query += ' AND ps.month = ?';
    params.push(month);
  }

  if (search) {
    query += ' AND (d.name LIKE ? OR d.phone LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY ps.submission_date DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  db.all(query, params, (err, submissions) => {
    if (err) {
      console.error('Error fetching submissions:', err);
      return res.status(500).json({ error: 'Failed to fetch submissions' });
    }

    // Get total count
    let countQuery = `SELECT COUNT(*) as count FROM payment_submissions ps
                     JOIN drivers d ON ps.driver_id = d.id WHERE 1=1`;
    const countParams = [];

    if (status) {
      countQuery += ' AND ps.submission_status = ?';
      countParams.push(status);
    }
    if (driver_id) {
      countQuery += ' AND ps.driver_id = ?';
      countParams.push(driver_id);
    }
    if (week) {
      countQuery += ' AND ps.week = ?';
      countParams.push(week);
    }
    if (month) {
      countQuery += ' AND ps.month = ?';
      countParams.push(month);
    }
    if (search) {
      countQuery += ' AND (d.name LIKE ? OR d.phone LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`);
    }

    db.get(countQuery, countParams, (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to count submissions' });
      }

      res.json({
        data: submissions || [],
        total: result?.count || 0,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
    });
  });
});

/**
 * POST /api/driver-submissions/:id/approve
 * Approve a payment submission
 * Auth: Secretary or HR
 * Creates entry in payments table
 */
router.post('/:id/approve', authMiddleware, (req, res) => {
  // Verify authorization
  if (!['secretary', 'hr'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Only Secretary or HR can approve submissions' });
  }

  const { id } = req.params;
  const approvedByRole = req.user.role;
  const approvalDate = new Date().toISOString().split('T')[0];

  // Get submission details
  db.get(
    `SELECT ps.*, d.name as driver_name FROM payment_submissions ps
     JOIN drivers d ON ps.driver_id = d.id WHERE ps.id = ?`,
    [id],
    (err, submission) => {
      if (err) {
        console.error('Error fetching submission:', err);
        return res.status(500).json({ error: 'Failed to fetch submission' });
      }

      if (!submission) {
        return res.status(404).json({ error: 'Submission not found' });
      }

      if (submission.submission_status !== 'pending') {
        return res.status(400).json({
          error: `Cannot approve submission with status: ${submission.submission_status}`
        });
      }

      // Update submission status
      db.run(
        `UPDATE payment_submissions
         SET submission_status = 'approved',
             approved_by_role = ?,
             approved_by_date = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [approvedByRole, approvalDate, id],
        function(err) {
          if (err) {
            console.error('Error updating submission:', err);
            return res.status(500).json({ error: 'Failed to approve submission' });
          }

          // Create entry in SQLite payments table
          db.run(
            `INSERT INTO payments (payment_date, payer_name, payment_type, amount, week, payment_status, description, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [
              submission.submission_date,
              submission.driver_name,
              'Driver Weekly Cashing',
              submission.amount,
              submission.week,
              'Paid',
              `Submission ID: ${id}${submission.notes ? ' - ' + submission.notes : ''}`
            ],
            async function(err) {
              if (err) {
                console.error('Error creating payment record:', err);
                // Revert the submission update
                db.run(
                  `UPDATE payment_submissions SET submission_status = 'pending' WHERE id = ?`,
                  [id]
                );
                return res.status(500).json({ error: 'Failed to create payment record' });
              }

              // Also create in Supabase for driver portal to see
              try {
                await insert('payments', [{
                  payment_date: submission.submission_date,
                  payer_name: submission.driver_name,
                  payment_type: 'weekly_cash',
                  amount: submission.amount,
                  week: submission.week,
                  payment_status: 'Paid',
                  driver_id: submission.driver_id,
                  description: `Submission ID: ${id}${submission.notes ? ' - ' + submission.notes : ''}`
                }]);

                console.log('[SYNC] Payment synced to Supabase for driver', submission.driver_id);
              } catch (syncErr) {
                console.error('[SYNC] Failed to sync payment to Supabase:', syncErr.message);
                // Don't fail the entire operation if sync fails
              }

              res.json({
                message: 'Submission approved successfully',
                submission_id: id,
                payment_id: this.lastID,
                approved_by: approvedByRole,
                approved_date: approvalDate,
                amount: submission.amount
              });
            }
          );
        }
      );
    }
  );
});

/**
 * POST /api/driver-submissions/:id/reject
 * Reject a payment submission
 * Auth: Secretary or HR
 */
router.post('/:id/reject', authMiddleware, (req, res) => {
  // Verify authorization
  if (!['secretary', 'hr'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Only Secretary or HR can reject submissions' });
  }

  const { id } = req.params;
  const { rejectionReason } = req.body;

  if (!rejectionReason || rejectionReason.trim().length === 0) {
    return res.status(400).json({ error: 'Rejection reason is required' });
  }

  db.get(
    `SELECT id, submission_status FROM payment_submissions WHERE id = ?`,
    [id],
    (err, submission) => {
      if (err) {
        console.error('Error fetching submission:', err);
        return res.status(500).json({ error: 'Failed to fetch submission' });
      }

      if (!submission) {
        return res.status(404).json({ error: 'Submission not found' });
      }

      if (submission.submission_status !== 'pending') {
        return res.status(400).json({
          error: `Cannot reject submission with status: ${submission.submission_status}`
        });
      }

      db.run(
        `UPDATE payment_submissions
         SET submission_status = 'rejected',
             rejection_reason = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [rejectionReason, id],
        (err) => {
          if (err) {
            console.error('Error rejecting submission:', err);
            return res.status(500).json({ error: 'Failed to reject submission' });
          }

          res.json({
            message: 'Submission rejected successfully',
            submission_id: id,
            rejection_reason: rejectionReason
          });
        }
      );
    }
  );
});

/**
 * GET /api/driver-submissions/:id
 * Get single submission (admin view - includes more details)
 * Auth: Secretary or HR
 */
router.get('/:id', authMiddleware, (req, res) => {
  if (!['secretary', 'hr'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Only Secretary or HR can view submission details' });
  }

  const { id } = req.params;

  db.get(
    `SELECT ps.*, d.name as driver_name, d.phone as driver_phone, d.plate
     FROM payment_submissions ps
     JOIN drivers d ON ps.driver_id = d.id
     WHERE ps.id = ?`,
    [id],
    (err, submission) => {
      if (err) {
        console.error('Error fetching submission:', err);
        return res.status(500).json({ error: 'Failed to fetch submission' });
      }

      if (!submission) {
        return res.status(404).json({ error: 'Submission not found' });
      }

      res.json({ data: submission });
    }
  );
});

module.exports = router;
