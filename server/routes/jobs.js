const express = require('express');
const db = require('../config');
const router = express.Router();

// GET all jobs
router.get('/', (req, res) => {
  const { status, driver_id, search } = req.query;
  let query = 'SELECT * FROM jobs';
  let params = [];

  const conditions = [];
  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }
  if (driver_id) {
    conditions.push('driver_id = ?');
    params.push(driver_id);
  }
  if (search) {
    conditions.push("(client_name LIKE ? OR pickup_location LIKE ? OR dropoff_location LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY job_date DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ data: rows || [] });
  });
});

// GET single job
router.get('/:id', (req, res) => {
  db.get('SELECT * FROM jobs WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json(row);
  });
});

// POST create job
router.post('/', (req, res) => {
  const { client_name, service_type, driver_id, pickup_location, dropoff_location, job_date, amount, status, notes } = req.body;

  if (!client_name || !service_type) {
    return res.status(400).json({ error: 'Client name and service type are required' });
  }

  db.run(
    'INSERT INTO jobs (client_name, service_type, driver_id, pickup_location, dropoff_location, job_date, amount, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [client_name, service_type, driver_id || null, pickup_location || null, dropoff_location || null, job_date || null, amount || null, status || 'Pending', notes || null],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create job' });
      }
      res.json({ id: this.lastID, client_name, service_type });
    }
  );
});

// PUT update job
router.put('/:id', (req, res) => {
  const { client_name, service_type, driver_id, pickup_location, dropoff_location, job_date, amount, status, notes } = req.body;

  if (!client_name || !service_type) {
    return res.status(400).json({ error: 'Client name and service type are required' });
  }

  db.run(
    'UPDATE jobs SET client_name=?, service_type=?, driver_id=?, pickup_location=?, dropoff_location=?, job_date=?, amount=?, status=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
    [client_name, service_type, driver_id || null, pickup_location || null, dropoff_location || null, job_date || null, amount || null, status || 'Pending', notes || null, req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update job' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Job not found' });
      }
      res.json({ message: 'Job updated successfully' });
    }
  );
});

// DELETE job
router.delete('/:id', (req, res) => {
  db.run('DELETE FROM jobs WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete job' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json({ message: 'Job deleted successfully' });
  });
});

module.exports = router;
