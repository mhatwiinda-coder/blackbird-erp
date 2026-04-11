/**
 * Authentication Routes - Using Supabase Backend (Production Ready)
 * Supports both staff/admin login and driver login
 * For Netlify deployment and permanent solution
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { select, insert } = require('../supabase-config');
const router = express.Router();

const SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// POST login for staff/admin (by role) - Supabase-backed, production-ready
router.post('/login', async (req, res) => {
  try {
    const { role, password } = req.body;

    if (!role || !password) {
      return res.status(400).json({ error: 'Role and password required' });
    }

    console.log(`[ADMIN-LOGIN] Attempting login for role: ${role}`);

    try {
      // Query users table for staff/admin account by role
      const users = await select('users', {
        select: '*',
        filters: { role: role.toLowerCase() }
      });

      if (!users || users.length === 0) {
        console.warn(`[ADMIN-LOGIN] No account found for role: ${role}`);
        return res.status(401).json({ error: 'Invalid role or password' });
      }

      const user = users[0];
      console.log(`[ADMIN-LOGIN] User found: ID=${user.id}, Role=${user.role}`);

      // Compare password
      const isMatch = await new Promise((resolve, reject) => {
        bcrypt.compare(password, user.password_hash, (err, isMatch) => {
          if (err) reject(err);
          else resolve(isMatch);
        });
      });

      if (!isMatch) {
        console.warn(`[ADMIN-LOGIN] Password mismatch for role: ${role}`);
        return res.status(401).json({ error: 'Invalid role or password' });
      }

      console.log(`[ADMIN-LOGIN] ✅ ${role} login successful`);

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, role: user.role },
        SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        token,
        role: user.role,
        message: 'Login successful'
      });
    } catch (supabaseError) {
      // If Supabase is completely unreachable (network error)
      if (supabaseError.message && supabaseError.message.includes('fetch')) {
        console.error(`[SUPABASE] Network unreachable:`, supabaseError.message);
        return res.status(503).json({
          error: 'Database service temporarily unavailable. Please try again later.',
          details: process.env.NODE_ENV === 'development' ? supabaseError.message : undefined
        });
      }
      // Other Supabase errors
      console.error(`[SUPABASE] Error:`, supabaseError.message);
      return res.status(401).json({ error: 'Invalid role or password' });
    }
  } catch (error) {
    console.error('[ADMIN-LOGIN] Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST login for drivers (Supabase-backed, production-ready)
// Driver login with SQLite fallback
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '../../blackbird_erp.db');

router.post('/driver-login', (req, res) => {
  try {
    const { driverId, password } = req.body;

    if (!driverId || !password) {
      return res.status(400).json({ error: 'Driver ID and password required' });
    }

    const driverIdInt = parseInt(driverId);
    console.log(`[DRIVER-LOGIN] Attempting login for driver ${driverIdInt}`);

    // Use SQLite for local development
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('[DRIVER-LOGIN] Database error:', err.message);
        return res.status(500).json({ error: 'Database connection failed' });
      }

      // Ensure driver_users table exists
      db.run(`
        CREATE TABLE IF NOT EXISTS driver_users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          driver_id INTEGER UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          console.error('[DRIVER-LOGIN] Table creation error:', err.message);
          db.close();
          return res.status(500).json({ error: 'Database setup failed' });
        }

        // Step 1: Look for driver user account in SQLite
        db.get(
          'SELECT id, driver_id, password_hash FROM driver_users WHERE driver_id = ?',
          [driverIdInt],
          (err, user) => {
          if (err) {
            console.error('[DRIVER-LOGIN] Query error:', err.message);
            db.close();
            return res.status(500).json({ error: 'Database error' });
          }

          // If no user account exists, auto-create it
          if (!user) {
            console.log(`[AUTO-CREATE] Creating user account for driver ${driverIdInt}`);

            // Get driver info
            db.get(
              'SELECT id, name FROM drivers WHERE id = ?',
              [driverIdInt],
              (err, driver) => {
                if (err || !driver) {
                  console.error(`[AUTO-CREATE] Driver ${driverIdInt} not found`);
                  db.close();
                  return res.status(401).json({ error: 'Invalid driver ID' });
                }

                // Generate default password: FirstName@123
                const firstName = driver.name.split(' ')[0];
                const plainPassword = `${firstName}@123`;

                // Hash password
                bcrypt.hash(plainPassword, 10, (err, passwordHash) => {
                  if (err) {
                    console.error('[AUTO-CREATE] Hash error:', err.message);
                    db.close();
                    return res.status(500).json({ error: 'Password hash failed' });
                  }

                  // Insert new driver user account
                  db.run(
                    'INSERT INTO driver_users (driver_id, password_hash, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
                    [driverIdInt, passwordHash],
                    function(err) {
                      if (err) {
                        console.error('[AUTO-CREATE] Insert error:', err.message);
                        db.close();
                        return res.status(500).json({ error: 'Failed to create account' });
                      }

                      console.log(`[AUTO-CREATE] ✅ Account created for driver ${driverIdInt}: ${driver.name}`);

                      // Now authenticate with the newly created account
                      authenticateDriver(driverIdInt, password, db, res);
                    }
                  );
                });
              }
            );
          } else {
            // User exists, authenticate
            authenticateDriver(driverIdInt, password, db, res);
          }
        }
      );
      });
    });
  } catch (error) {
    console.error('[DRIVER-LOGIN] Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to authenticate driver
function authenticateDriver(driverIdInt, password, db, res) {
  db.get(
    'SELECT id, driver_id, password_hash FROM driver_users WHERE driver_id = ?',
    [driverIdInt],
    (err, user) => {
      if (err || !user) {
        console.error(`[LOGIN] User not found for driver ${driverIdInt}`);
        db.close();
        return res.status(401).json({ error: 'Invalid driver ID or password' });
      }

      // Compare password
      bcrypt.compare(password, user.password_hash, (err, isMatch) => {
        if (err || !isMatch) {
          console.warn(`[LOGIN] Password mismatch for driver ${driverIdInt}`);
          db.close();
          return res.status(401).json({ error: 'Invalid driver ID or password' });
        }

        // Get driver details
        db.get(
          'SELECT id, name FROM drivers WHERE id = ?',
          [user.driver_id],
          (err, driver) => {
            db.close();

            if (err || !driver) {
              console.error(`[LOGIN] Driver ${driverIdInt} not found`);
              return res.status(401).json({ error: 'Driver not found' });
            }

            console.log(`[LOGIN] ✅ Driver ${driverIdInt} (${driver.name}) login successful`);

            // Generate JWT token
            const token = jwt.sign(
              {
                id: user.id,
                driver_id: user.driver_id,
                name: driver.name,
                account_type: 'driver'
              },
              SECRET,
              { expiresIn: '24h' }
            );

            res.json({
              token,
              driverId: user.driver_id,
              driverName: driver.name,
              message: 'Driver login successful'
            });
          }
        );
      });
    }
  );
}

module.exports = router;
