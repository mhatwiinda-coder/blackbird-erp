const express = require('express');
const db = require('../config');
const router = express.Router();

// GET all maintenance records
router.get('/', (req, res) => {
  const { vehicle_id, maintenance_status, search } = req.query;
  let query = 'SELECT * FROM mechanics';
  let params = [];

  const conditions = [];
  if (vehicle_id) {
    conditions.push('vehicle_id = ?');
    params.push(vehicle_id);
  }
  if (maintenance_status) {
    conditions.push('maintenance_status = ?');
    params.push(maintenance_status);
  }
  if (search) {
    conditions.push("(service_type LIKE ? OR mechanic_name LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY service_date DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ data: rows || [] });
  });
});

// GET single maintenance record
router.get('/:id', (req, res) => {
  db.get('SELECT * FROM mechanics WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Maintenance record not found' });
    }
    res.json(row);
  });
});

// POST create maintenance record
router.post('/', (req, res) => {
  const { service_date, vehicle_id, service_type, mechanic_name, cost, next_service_due, maintenance_status, notes } = req.body;

  if (!service_type || !vehicle_id) {
    return res.status(400).json({ error: 'Service type and vehicle ID are required' });
  }

  db.run(
    'INSERT INTO mechanics (service_date, vehicle_id, service_type, mechanic_name, cost, next_service_due, maintenance_status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [service_date || null, vehicle_id, service_type, mechanic_name || null, cost || null, next_service_due || null, maintenance_status || 'Completed', notes || null],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create maintenance record' });
      }
      res.json({ id: this.lastID, service_type, vehicle_id });
    }
  );
});

// PUT update maintenance record
router.put('/:id', (req, res) => {
  const { service_date, vehicle_id, service_type, mechanic_name, cost, next_service_due, maintenance_status, notes } = req.body;

  if (!service_type || !vehicle_id) {
    return res.status(400).json({ error: 'Service type and vehicle ID are required' });
  }

  db.run(
    'UPDATE mechanics SET service_date=?, vehicle_id=?, service_type=?, mechanic_name=?, cost=?, next_service_due=?, maintenance_status=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
    [service_date || null, vehicle_id, service_type, mechanic_name || null, cost || null, next_service_due || null, maintenance_status || 'Completed', notes || null, req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update maintenance record' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Maintenance record not found' });
      }
      res.json({ message: 'Maintenance record updated successfully' });
    }
  );
});

// DELETE maintenance record
router.delete('/:id', (req, res) => {
  db.run('DELETE FROM mechanics WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete maintenance record' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Maintenance record not found' });
    }
    res.json({ message: 'Maintenance record deleted successfully' });
  });
});

module.exports = router;
