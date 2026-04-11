const express = require('express');
const db = require('../config');
const router = express.Router();

// GET all deliveries
router.get('/', (req, res) => {
  const { status, rider_id, search } = req.query;
  let query = 'SELECT * FROM deliveries';
  let params = [];

  const conditions = [];
  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }
  if (rider_id) {
    conditions.push('rider_id = ?');
    params.push(rider_id);
  }
  if (search) {
    conditions.push("(tracking_number LIKE ? OR sender_name LIKE ? OR recipient_name LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY created_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ data: rows || [] });
  });
});

// GET single delivery
router.get('/:id', (req, res) => {
  db.get('SELECT * FROM deliveries WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Delivery not found' });
    }
    res.json(row);
  });
});

// POST create delivery
router.post('/', (req, res) => {
  const { tracking_number, sender_name, sender_phone, recipient_name, recipient_phone, pickup_location, dropoff_location, rider_id, weight_kg, amount, status } = req.body;

  if (!sender_name || !recipient_name) {
    return res.status(400).json({ error: 'Sender and recipient names are required' });
  }

  db.run(
    'INSERT INTO deliveries (tracking_number, sender_name, sender_phone, recipient_name, recipient_phone, pickup_location, dropoff_location, rider_id, weight_kg, amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [tracking_number || null, sender_name, sender_phone || null, recipient_name, recipient_phone || null, pickup_location || null, dropoff_location || null, rider_id || null, weight_kg || null, amount || null, status || 'Pending'],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create delivery' });
      }
      res.json({ id: this.lastID, sender_name, recipient_name });
    }
  );
});

// PUT update delivery
router.put('/:id', (req, res) => {
  const { tracking_number, sender_name, sender_phone, recipient_name, recipient_phone, pickup_location, dropoff_location, rider_id, weight_kg, amount, status } = req.body;

  if (!sender_name || !recipient_name) {
    return res.status(400).json({ error: 'Sender and recipient names are required' });
  }

  db.run(
    'UPDATE deliveries SET tracking_number=?, sender_name=?, sender_phone=?, recipient_name=?, recipient_phone=?, pickup_location=?, dropoff_location=?, rider_id=?, weight_kg=?, amount=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
    [tracking_number || null, sender_name, sender_phone || null, recipient_name, recipient_phone || null, pickup_location || null, dropoff_location || null, rider_id || null, weight_kg || null, amount || null, status || 'Pending', req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update delivery' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Delivery not found' });
      }
      res.json({ message: 'Delivery updated successfully' });
    }
  );
});

// DELETE delivery
router.delete('/:id', (req, res) => {
  db.run('DELETE FROM deliveries WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete delivery' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Delivery not found' });
    }
    res.json({ message: 'Delivery deleted successfully' });
  });
});

module.exports = router;
