const express = require('express');
const db = require('../config');
const router = express.Router();

// GET all vehicles
router.get('/', (req, res) => {
  const { type, search } = req.query;
  let query = 'SELECT v.*, d.name as driver_name FROM vehicles v LEFT JOIN drivers d ON v.assigned_driver_id = d.id';
  let params = [];

  const conditions = [];
  if (type) {
    conditions.push('v.type = ?');
    params.push(type.toUpperCase());
  }
  if (search) {
    conditions.push("(v.plate LIKE ? OR v.make_model LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ data: rows || [] });
  });
});

// GET single vehicle
router.get('/:id', (req, res) => {
  db.get('SELECT * FROM vehicles WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    res.json(row);
  });
});

// POST create vehicle
router.post('/', (req, res) => {
  const { plate, type, make_model, assigned_driver_id, vehicle_condition, road_tax_due, insurance_due, service_due_km } = req.body;

  if (!plate || !type) {
    return res.status(400).json({ error: 'Plate and type are required' });
  }

  db.run(
    'INSERT INTO vehicles (plate, type, make_model, assigned_driver_id, vehicle_condition, road_tax_due, insurance_due, service_due_km) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [plate, type.toUpperCase(), make_model || null, assigned_driver_id || null, vehicle_condition || 'OK', road_tax_due || null, insurance_due || null, service_due_km || null],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'Plate number already exists' });
        }
        return res.status(500).json({ error: 'Failed to create vehicle' });
      }
      res.json({ id: this.lastID, plate, type, make_model });
    }
  );
});

// PUT update vehicle
router.put('/:id', (req, res) => {
  const { plate, type, make_model, assigned_driver_id, vehicle_condition, road_tax_due, insurance_due, service_due_km } = req.body;

  if (!plate || !type) {
    return res.status(400).json({ error: 'Plate and type are required' });
  }

  db.run(
    'UPDATE vehicles SET plate=?, type=?, make_model=?, assigned_driver_id=?, vehicle_condition=?, road_tax_due=?, insurance_due=?, service_due_km=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
    [plate, type.toUpperCase(), make_model || null, assigned_driver_id || null, vehicle_condition || 'OK', road_tax_due || null, insurance_due || null, service_due_km || null, req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update vehicle' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }
      res.json({ message: 'Vehicle updated successfully' });
    }
  );
});

// DELETE vehicle
router.delete('/:id', (req, res) => {
  db.run('DELETE FROM vehicles WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete vehicle' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    res.json({ message: 'Vehicle deleted successfully' });
  });
});

module.exports = router;
