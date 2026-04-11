/**
 * Drivers Routes - Using Supabase Backend
 * Replaces SQLite with Supabase PostgreSQL
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { select, insert, update, delete: deleteRecord } = require('../supabase-config');
const router = express.Router();

// GET all drivers with optional filters
router.get('/', async (req, res) => {
  try {
    const { type, search, status } = req.query;
    let options = { select: '*' };

    // Build filters
    if (type) {
      options.filters = options.filters || {};
      options.filters.type = type.toUpperCase();
    }
    if (status) {
      options.filters = options.filters || {};
      options.filters.status = status;
    }

    let drivers = await select('drivers', options);

    // Apply search filter (client-side since Supabase doesn't support LIKE in simple queries)
    if (search) {
      drivers = drivers.filter(d =>
        d.name?.toLowerCase().includes(search.toLowerCase()) ||
        d.phone?.includes(search) ||
        d.plate?.includes(search)
      );
    }

    res.json({ data: drivers || [] });
  } catch (error) {
    console.error('Error fetching drivers:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET single driver
router.get('/:id', async (req, res) => {
  try {
    const drivers = await select('drivers', {
      select: '*',
      filters: { id: parseInt(req.params.id) }
    });

    if (!drivers || drivers.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    res.json(drivers[0]);
  } catch (error) {
    console.error('Error fetching driver:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST create driver with user account
router.post('/', async (req, res) => {
  try {
    const { name, phone, plate, type, assigned_date, national_id, license_number, status } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }

    // Insert driver
    const drivers = await insert('drivers', [{
      name,
      phone: phone || null,
      plate: plate || null,
      type: type.toUpperCase(),
      assigned_date: assigned_date || null,
      national_id: national_id || null,
      license_number: license_number || null,
      status: status || 'Active'
    }]);

    if (!drivers || drivers.length === 0) {
      return res.status(500).json({ error: 'Failed to create driver' });
    }

    const driverId = drivers[0].id;
    const firstName = name.split(' ')[0];
    const plainPassword = `${firstName}@123`;

    // Create user account with bcrypt-hashed password
    try {
      const passwordHash = await new Promise((resolve, reject) => {
        bcrypt.hash(plainPassword, 10, (err, hash) => {
          if (err) reject(err);
          else resolve(hash);
        });
      });

      const uniqueRole = `driver_${driverId}`;

      await insert('users', [{
        driver_id: driverId,
        account_type: 'driver',
        password_hash: passwordHash,
        role: uniqueRole
      }]);

      // Return driver with password for display
      res.json({
        id: driverId,
        ...drivers[0],
        password: plainPassword  // Plain password for ERP to display
      });
    } catch (userError) {
      console.error('User creation error:', userError);
      // Don't fail if user creation fails - driver is already created
      res.json({
        id: driverId,
        ...drivers[0],
        password: plainPassword,
        warning: 'Driver created but user account creation failed'
      });
    }
  } catch (error) {
    console.error('Error creating driver:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT update driver
router.put('/:id', async (req, res) => {
  try {
    const { name, phone, plate, type, status } = req.body;
    const driverId = parseInt(req.params.id);

    const updateData = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (plate) updateData.plate = plate;
    if (type) updateData.type = type.toUpperCase();
    if (status) updateData.status = status;
    updateData.updated_at = new Date().toISOString();

    const result = await update('drivers', updateData, { id: driverId });

    if (!result || result.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    res.json(result[0]);
  } catch (error) {
    console.error('Error updating driver:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE driver
router.delete('/:id', async (req, res) => {
  try {
    const driverId = parseInt(req.params.id);
    await deleteRecord('drivers', { id: driverId });
    res.json({ message: 'Driver deleted successfully' });
  } catch (error) {
    console.error('Error deleting driver:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
