const express = require('express');
const db = require('../config');
const router = express.Router();

// GET all payments
router.get('/', (req, res) => {
  const { payment_status, week, search } = req.query;
  let query = 'SELECT * FROM payments';
  let params = [];

  const conditions = [];
  if (payment_status) {
    conditions.push('payment_status = ?');
    params.push(payment_status);
  }
  if (week !== undefined) {
    conditions.push('week = ?');
    params.push(week);
  }
  if (search) {
    conditions.push("(payer_name LIKE ? OR description LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY payment_date DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ data: rows || [] });
  });
});

// GET single payment
router.get('/:id', (req, res) => {
  db.get('SELECT * FROM payments WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    res.json(row);
  });
});

// POST create payment
router.post('/', (req, res) => {
  const { payment_date, payer_name, payment_type, description, amount, week, payment_status } = req.body;

  if (!payment_date || !payer_name || !payment_type || !amount) {
    return res.status(400).json({ error: 'Payment date, payer name, type, and amount are required' });
  }

  db.run(
    'INSERT INTO payments (payment_date, payer_name, payment_type, description, amount, week, payment_status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [payment_date, payer_name, payment_type, description || null, amount, week || null, payment_status || 'Paid'],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create payment' });
      }
      res.json({ id: this.lastID, payer_name, amount });
    }
  );
});

// PUT update payment
router.put('/:id', (req, res) => {
  const { payment_date, payer_name, payment_type, description, amount, week, payment_status } = req.body;

  if (!payment_date || !payer_name || !payment_type || !amount) {
    return res.status(400).json({ error: 'Payment date, payer name, type, and amount are required' });
  }

  db.run(
    'UPDATE payments SET payment_date=?, payer_name=?, payment_type=?, description=?, amount=?, week=?, payment_status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
    [payment_date, payer_name, payment_type, description || null, amount, week || null, payment_status || 'Paid', req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update payment' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Payment not found' });
      }
      res.json({ message: 'Payment updated successfully' });
    }
  );
});

// DELETE payment
router.delete('/:id', (req, res) => {
  db.run('DELETE FROM payments WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete payment' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    res.json({ message: 'Payment deleted successfully' });
  });
});

module.exports = router;
