const express = require('express');
const db = require('../config');
const router = express.Router();

// GET logs with filters
router.get('/', (req, res) => {
  const { driver_id, month, week } = req.query;
  let query = 'SELECT * FROM weekly_logs';
  let params = [];

  const conditions = [];
  if (driver_id) {
    conditions.push('driver_id = ?');
    params.push(driver_id);
  }
  if (month !== undefined) {
    conditions.push('month = ?');
    params.push(month);
  }
  if (week !== undefined) {
    conditions.push('week = ?');
    params.push(week);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY month DESC, week DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ data: rows || [] });
  });
});

// GET single log
router.get('/:id', (req, res) => {
  db.get('SELECT * FROM weekly_logs WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Log not found' });
    }
    res.json(row);
  });
});

// POST create log
router.post('/', (req, res) => {
  const { driver_id, vehicle_id, month, week, days_on_road, start_mileage, end_mileage, weekly_cashing, vehicle_condition, reminder, comments } = req.body;

  if (!driver_id || month === undefined || week === undefined) {
    return res.status(400).json({ error: 'Driver ID, month, and week are required' });
  }

  if (month < 0 || month > 11 || week < 1 || week > 4) {
    return res.status(400).json({ error: 'Invalid month (0-11) or week (1-4)' });
  }

  db.run(
    'INSERT INTO weekly_logs (driver_id, vehicle_id, month, week, days_on_road, start_mileage, end_mileage, weekly_cashing, vehicle_condition, reminder, comments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [driver_id, vehicle_id || null, month, week, days_on_road || null, start_mileage || null, end_mileage || null, weekly_cashing || null, vehicle_condition || 'OK', reminder || 'OK', comments || null],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create log' });
      }
      res.json({ id: this.lastID, driver_id, month, week });
    }
  );
});

// PUT update log
router.put('/:id', (req, res) => {
  const { driver_id, vehicle_id, month, week, days_on_road, start_mileage, end_mileage, weekly_cashing, vehicle_condition, reminder, comments } = req.body;

  if (!driver_id || month === undefined || week === undefined) {
    return res.status(400).json({ error: 'Driver ID, month, and week are required' });
  }

  db.run(
    'UPDATE weekly_logs SET driver_id=?, vehicle_id=?, month=?, week=?, days_on_road=?, start_mileage=?, end_mileage=?, weekly_cashing=?, vehicle_condition=?, reminder=?, comments=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
    [driver_id, vehicle_id || null, month, week, days_on_road || null, start_mileage || null, end_mileage || null, weekly_cashing || null, vehicle_condition || 'OK', reminder || 'OK', comments || null, req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update log' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Log not found' });
      }
      res.json({ message: 'Log updated successfully' });
    }
  );
});

// DELETE log
router.delete('/:id', (req, res) => {
  db.run('DELETE FROM weekly_logs WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete log' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Log not found' });
    }
    res.json({ message: 'Log deleted successfully' });
  });
});

module.exports = router;
