const express = require('express');
const db = require('../config');
const router = express.Router();

// GET all invoices
router.get('/', (req, res) => {
  const { status, search } = req.query;
  let query = 'SELECT * FROM invoices';
  let params = [];

  const conditions = [];
  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }
  if (search) {
    conditions.push("(invoice_number LIKE ? OR description LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY invoice_date DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ data: rows || [] });
  });
});

// GET single invoice
router.get('/:id', (req, res) => {
  db.get('SELECT * FROM invoices WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.json(row);
  });
});

// POST create invoice
router.post('/', (req, res) => {
  const { invoice_number, client_id, invoice_date, due_date, amount, description, status } = req.body;

  if (!invoice_number || !amount) {
    return res.status(400).json({ error: 'Invoice number and amount are required' });
  }

  db.run(
    'INSERT INTO invoices (invoice_number, client_id, invoice_date, due_date, amount, description, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [invoice_number, client_id || null, invoice_date || null, due_date || null, amount, description || null, status || 'Unpaid'],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create invoice' });
      }
      res.json({ id: this.lastID, invoice_number, amount });
    }
  );
});

// PUT update invoice
router.put('/:id', (req, res) => {
  const { invoice_number, client_id, invoice_date, due_date, amount, description, status } = req.body;

  if (!invoice_number || !amount) {
    return res.status(400).json({ error: 'Invoice number and amount are required' });
  }

  db.run(
    'UPDATE invoices SET invoice_number=?, client_id=?, invoice_date=?, due_date=?, amount=?, description=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
    [invoice_number, client_id || null, invoice_date || null, due_date || null, amount, description || null, status || 'Unpaid', req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update invoice' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      res.json({ message: 'Invoice updated successfully' });
    }
  );
});

// DELETE invoice
router.delete('/:id', (req, res) => {
  db.run('DELETE FROM invoices WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete invoice' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.json({ message: 'Invoice deleted successfully' });
  });
});

module.exports = router;
