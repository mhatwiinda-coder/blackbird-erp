const express = require('express');
const db = require('../config');
const router = express.Router();

// GET all staff
router.get('/', (req, res) => {
  const { search, employment_status } = req.query;
  let query = 'SELECT * FROM staff';
  let params = [];

  const conditions = [];
  if (employment_status) {
    conditions.push('employment_status = ?');
    params.push(employment_status);
  }
  if (search) {
    conditions.push("(full_name LIKE ? OR email LIKE ? OR role LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY full_name ASC';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ data: rows || [] });
  });
});

// GET single staff member
router.get('/:id', (req, res) => {
  db.get('SELECT * FROM staff WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Staff member not found' });
    }
    res.json(row);
  });
});

// POST create staff
router.post('/', (req, res) => {
  const { full_name, role, phone, email, start_date, salary, performance, employment_status } = req.body;

  if (!full_name || !role) {
    return res.status(400).json({ error: 'Full name and role are required' });
  }

  db.run(
    'INSERT INTO staff (full_name, role, phone, email, start_date, salary, performance, employment_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [full_name, role, phone || null, email || null, start_date || null, salary || null, performance || 'Good', employment_status || 'Active'],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create staff member' });
      }
      res.json({ id: this.lastID, full_name, role });
    }
  );
});

// PUT update staff
router.put('/:id', (req, res) => {
  const { full_name, role, phone, email, start_date, salary, performance, employment_status } = req.body;

  if (!full_name || !role) {
    return res.status(400).json({ error: 'Full name and role are required' });
  }

  db.run(
    'UPDATE staff SET full_name=?, role=?, phone=?, email=?, start_date=?, salary=?, performance=?, employment_status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
    [full_name, role, phone || null, email || null, start_date || null, salary || null, performance || 'Good', employment_status || 'Active', req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update staff member' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Staff member not found' });
      }
      res.json({ message: 'Staff member updated successfully' });
    }
  );
});

// DELETE staff
router.delete('/:id', (req, res) => {
  db.run('DELETE FROM staff WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete staff member' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Staff member not found' });
    }
    res.json({ message: 'Staff member deleted successfully' });
  });
});

module.exports = router;
