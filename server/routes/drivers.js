const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config');
const router = express.Router();

// GET all drivers with optional filters
router.get('/', (req, res) => {
  const { type, search, status } = req.query;
  let query = 'SELECT * FROM drivers';
  let params = [];

  const conditions = [];
  if (type) {
    conditions.push('type = ?');
    params.push(type.toUpperCase());
  }
  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }
  if (search) {
    conditions.push("(name LIKE ? OR phone LIKE ? OR plate LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
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

// GET single driver
router.get('/:id', (req, res) => {
  db.get('SELECT * FROM drivers WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    res.json(row);
  });
});

// POST create driver
router.post('/', (req, res) => {
  const { name, phone, plate, type, assigned_date, national_id, license_number, status } = req.body;

  if (!name || !type) {
    return res.status(400).json({ error: 'Name and type are required' });
  }

  db.run(
    'INSERT INTO drivers (name, phone, plate, type, assigned_date, national_id, license_number, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [name, phone || null, plate || null, type.toUpperCase(), assigned_date || null, national_id || null, license_number || null, status || 'Active'],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create driver' });
      }

      const driverId = this.lastID;
      const firstName = name.split(' ')[0];
      const plainPassword = `${firstName}@123`;

      // Create user account for driver with bcrypt-hashed password
      bcrypt.hash(plainPassword, 10, (hashErr, passwordHash) => {
        if (hashErr) {
          return res.status(500).json({ error: 'Failed to create user account' });
        }

        db.run(
          'INSERT INTO users (driver_id, account_type, password_hash, role) VALUES (?, ?, ?, ?)',
          [driverId, 'driver', passwordHash, 'driver'],
          function(userErr) {
            if (userErr) {
              console.error('User creation error:', userErr);
              // Don't fail if user creation fails - driver is already created
              return res.json({
                id: driverId,
                name,
                phone,
                plate,
                type,
                assigned_date,
                national_id,
                license_number,
                status: status || 'Active',
                password: plainPassword,
                warning: 'Driver created but user account creation failed - driver may not be able to login'
              });
            }

            // Success - return driver info with plain password for display
            res.json({
              id: driverId,
              name,
              phone,
              plate,
              type,
              assigned_date,
              national_id,
              license_number,
              status: status || 'Active',
              password: plainPassword  // Include plain password for ERP to display
            });
          }
        );
      });
    }
  );
});

// PUT update driver
router.put('/:id', (req, res) => {
  const { name, phone, plate, type, assigned_date, national_id, license_number, status } = req.body;

  if (!name || !type) {
    return res.status(400).json({ error: 'Name and type are required' });
  }

  db.run(
    'UPDATE drivers SET name=?, phone=?, plate=?, type=?, assigned_date=?, national_id=?, license_number=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
    [name, phone || null, plate || null, type.toUpperCase(), assigned_date || null, national_id || null, license_number || null, status || 'Active', req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update driver' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Driver not found' });
      }
      res.json({ message: 'Driver updated successfully' });
    }
  );
});

// DELETE driver
router.delete('/:id', (req, res) => {
  db.run('DELETE FROM drivers WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete driver' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    res.json({ message: 'Driver deleted successfully' });
  });
});

module.exports = router;
