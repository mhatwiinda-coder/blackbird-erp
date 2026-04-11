const express = require('express');
const db = require('../config');
const router = express.Router();

// GET all quotations
router.get('/', (req, res) => {
  const { status, search } = req.query;
  let query = 'SELECT * FROM quotations';
  let params = [];

  const conditions = [];
  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }
  if (search) {
    conditions.push("(customer_name LIKE ? OR customer_phone LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY quote_date DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ data: rows || [] });
  });
});

// GET single quotation
router.get('/:id', (req, res) => {
  db.get('SELECT * FROM quotations WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Quotation not found' });
    }
    res.json(row);
  });
});

// POST create quotation
router.post('/', (req, res) => {
  const { customer_name, customer_phone, customer_email, service_type, pickup_location, dropoff_location, estimated_amount, source, status, notes, quote_date } = req.body;

  if (!customer_name || !service_type) {
    return res.status(400).json({ error: 'Customer name and service type are required' });
  }

  db.run(
    'INSERT INTO quotations (customer_name, customer_phone, customer_email, service_type, pickup_location, dropoff_location, estimated_amount, source, status, notes, quote_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [customer_name, customer_phone || null, customer_email || null, service_type, pickup_location || null, dropoff_location || null, estimated_amount || null, source || 'Website', status || 'Pending', notes || null, quote_date || null],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create quotation' });
      }
      res.json({ id: this.lastID, customer_name, service_type });
    }
  );
});

// PUT update quotation
router.put('/:id', (req, res) => {
  const { customer_name, customer_phone, customer_email, service_type, pickup_location, dropoff_location, estimated_amount, source, status, notes, quote_date } = req.body;

  if (!customer_name || !service_type) {
    return res.status(400).json({ error: 'Customer name and service type are required' });
  }

  db.run(
    'UPDATE quotations SET customer_name=?, customer_phone=?, customer_email=?, service_type=?, pickup_location=?, dropoff_location=?, estimated_amount=?, source=?, status=?, notes=?, quote_date=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
    [customer_name, customer_phone || null, customer_email || null, service_type, pickup_location || null, dropoff_location || null, estimated_amount || null, source || 'Website', status || 'Pending', notes || null, quote_date || null, req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update quotation' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Quotation not found' });
      }
      res.json({ message: 'Quotation updated successfully' });
    }
  );
});

// POST convert quotation to job
router.post('/:id/convert-to-job', (req, res) => {
  const quotationId = req.params.id;

  db.get('SELECT * FROM quotations WHERE id = ?', [quotationId], (err, quotation) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!quotation) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    db.run(
      'INSERT INTO jobs (client_name, service_type, pickup_location, dropoff_location, amount, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [quotation.customer_name, quotation.service_type, quotation.pickup_location, quotation.dropoff_location, quotation.estimated_amount, 'Pending', quotation.notes],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to create job from quotation' });
        }

        // Update quotation status to Converted
        db.run('UPDATE quotations SET status = ? WHERE id = ?', ['Converted', quotationId], (err) => {
          if (err) {
            return res.status(500).json({ error: 'Failed to update quotation status' });
          }
          res.json({ jobId: this.lastID, message: 'Quotation converted to job' });
        });
      }
    );
  });
});

// POST convert quotation to rent-to-own agreement
router.post('/:id/convert-to-rent-to-own', (req, res) => {
  const quotationId = req.params.id;
  const { driver_id, vehicle_id, monthly_installment } = req.body;

  if (!driver_id || !vehicle_id) {
    return res.status(400).json({ error: 'Driver ID and vehicle ID are required' });
  }

  db.get('SELECT * FROM quotations WHERE id = ?', [quotationId], (err, quotation) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!quotation) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    db.run(
      `INSERT INTO rent_to_own_agreements
       (quotation_id, driver_id, vehicle_id, total_amount, paid_amount, remaining_balance,
        monthly_installment, agreement_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [quotationId, driver_id, vehicle_id, quotation.estimated_amount || 0, 0, quotation.estimated_amount || 0, monthly_installment || null, 'Active'],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to create rent-to-own agreement' });
        }

        // Update quotation status to Converted
        db.run('UPDATE quotations SET status = ? WHERE id = ?', ['Converted', quotationId], (err) => {
          if (err) {
            return res.status(500).json({ error: 'Failed to update quotation status' });
          }
          res.json({
            agreementId: this.lastID,
            quotationId,
            message: 'Quotation converted to rent-to-own agreement'
          });
        });
      }
    );
  });
});

// DELETE quotation
router.delete('/:id', (req, res) => {
  db.run('DELETE FROM quotations WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete quotation' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Quotation not found' });
    }
    res.json({ message: 'Quotation deleted successfully' });
  });
});

module.exports = router;
