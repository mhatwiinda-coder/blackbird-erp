const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const SECRET = 'test-secret-key';
const dbPath = path.join(__dirname, 'blackbird_erp.db');
const db = new sqlite3.Database(dbPath);

const app = express();
app.use(bodyParser.json());

function queryUsersSQLite(filters = {}) {
  return new Promise((resolve, reject) => {
    let query = 'SELECT * FROM users WHERE 1=1';
    const params = [];

    Object.entries(filters).forEach(([key, value]) => {
      query += ` AND ${key} = ?`;
      params.push(value);
    });

    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

function queryDriversSQLite(filters = {}) {
  return new Promise((resolve, reject) => {
    let query = 'SELECT * FROM drivers WHERE 1=1';
    const params = [];

    Object.entries(filters).forEach(([key, value]) => {
      query += ` AND ${key} = ?`;
      params.push(value);
    });

    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

app.post('/api/auth/driver-login', async (req, res) => {
  try {
    const { driverId, password } = req.body;
    console.log(`[REQUEST] Driver ${driverId}, Password: ${password}`);

    if (!driverId || !password) {
      return res.status(400).json({ error: 'Driver ID and password required' });
    }

    const driverIdInt = parseInt(driverId);
    console.log(`[PARSE] driverIdInt = ${driverIdInt}`);

    // Query users
    let users = await queryUsersSQLite({ driver_id: driverIdInt });
    console.log(`[QUERY] Found ${users?.length || 0} user(s)`);

    if (!users || users.length === 0) {
      console.log(`[ERROR] No user found for driver ${driverIdInt}`);
      return res.status(401).json({ error: 'Invalid driver ID or password' });
    }

    const user = users[0];
    console.log(`[USER] Found user: ID=${user.id}, Role=${user.role}`);

    // Compare password
    console.log(`[PASSWORD] Comparing "${password}" against hash...`);
    const isMatch = await new Promise((resolve, reject) => {
      bcrypt.compare(password, user.password_hash, (err, isMatch) => {
        console.log(`[BCRYPT] Result: ${isMatch}`);
        if (err) reject(err);
        else resolve(isMatch);
      });
    });

    if (!isMatch) {
      console.log(`[ERROR] Password mismatch for driver ${driverIdInt}`);
      return res.status(401).json({ error: 'Invalid driver ID or password' });
    }

    // Get driver details
    const drivers = await queryDriversSQLite({ id: user.driver_id });
    const driver = drivers && drivers.length > 0 ? drivers[0] : null;
    console.log(`[DRIVER] ${driver?.name || 'Unknown'}`);

    // Generate token
    const token = jwt.sign(
      {
        id: user.id,
        driver_id: user.driver_id,
        name: driver?.name || 'Driver',
        account_type: 'driver'
      },
      SECRET,
      { expiresIn: '24h' }
    );

    console.log(`[SUCCESS] Driver ${driverIdInt} logged in`);
    res.json({
      token,
      driverId: user.driver_id,
      driverName: driver?.name || 'Driver',
      message: 'Driver login successful'
    });
  } catch (error) {
    console.error('[EXCEPTION]', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 9000;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});
