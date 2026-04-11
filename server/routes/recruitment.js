const express = require('express');
const db = require('../config');
const router = express.Router();

// GET all applicants
router.get('/', (req, res) => {
  const { pipeline_stage, search } = req.query;
  let query = 'SELECT * FROM recruitment';
  let params = [];

  const conditions = [];
  if (pipeline_stage) {
    conditions.push('pipeline_stage = ?');
    params.push(pipeline_stage);
  }
  if (search) {
    conditions.push("(applicant_name LIKE ? OR position_applied LIKE ? OR email LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY applied_date DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ data: rows || [] });
  });
});

// GET single applicant
router.get('/:id', (req, res) => {
  db.get('SELECT * FROM recruitment WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Applicant not found' });
    }
    res.json(row);
  });
});

// POST create applicant
router.post('/', (req, res) => {
  const { applicant_name, position_applied, phone, email, applied_date, pipeline_stage, notes } = req.body;

  if (!applicant_name || !position_applied) {
    return res.status(400).json({ error: 'Applicant name and position are required' });
  }

  db.run(
    'INSERT INTO recruitment (applicant_name, position_applied, phone, email, applied_date, pipeline_stage, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [applicant_name, position_applied, phone || null, email || null, applied_date || null, pipeline_stage || 'Applied', notes || null],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create applicant entry' });
      }
      res.json({ id: this.lastID, applicant_name, position_applied });
    }
  );
});

// PUT update applicant
router.put('/:id', (req, res) => {
  const { applicant_name, position_applied, phone, email, applied_date, pipeline_stage, notes } = req.body;

  if (!applicant_name || !position_applied) {
    return res.status(400).json({ error: 'Applicant name and position are required' });
  }

  db.run(
    'UPDATE recruitment SET applicant_name=?, position_applied=?, phone=?, email=?, applied_date=?, pipeline_stage=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
    [applicant_name, position_applied, phone || null, email || null, applied_date || null, pipeline_stage || 'Applied', notes || null, req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update applicant' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Applicant not found' });
      }
      res.json({ message: 'Applicant updated successfully' });
    }
  );
});

// DELETE applicant
router.delete('/:id', (req, res) => {
  db.run('DELETE FROM recruitment WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete applicant' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Applicant not found' });
    }
    res.json({ message: 'Applicant deleted successfully' });
  });
});

module.exports = router;
