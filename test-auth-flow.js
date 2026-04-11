const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'blackbird_erp.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
});

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

async function testLogin() {
  const driverId = 156;
  const password = 'Sisa@123';
  const driverIdInt = parseInt(driverId);

  console.log(`Testing login for driver ${driverIdInt} with password "${password}"\n`);

  try {
    // Step 1: Query user
    console.log('Step 1: Querying user...');
    let users = await queryUsersSQLite({ driver_id: driverIdInt });
    console.log(`  Found ${users.length} user(s)`);

    if (!users || users.length === 0) {
      console.log('❌ No user found - would auto-create');
      db.close();
      process.exit(0);
    }

    const user = users[0];
    console.log(`  ✅ User found: ID=${user.id}, Role=${user.role}\n`);

    // Step 2: Compare password
    console.log('Step 2: Comparing password...');
    const isMatch = await new Promise((resolve, reject) => {
      bcrypt.compare(password, user.password_hash, (err, isMatch) => {
        console.log(`  bcrypt.compare("${password}", "${user.password_hash.substring(0, 30)}...") = ${isMatch}`);
        if (err) reject(err);
        else resolve(isMatch);
      });
    });

    if (!isMatch) {
      console.log('❌ Password does NOT match - would return 401\n');
      db.close();
      process.exit(0);
    }

    console.log('✅ Password matches!\n');

    // Step 3: Get driver details
    console.log('Step 3: Getting driver details...');
    const drivers = await queryDriversSQLite({ id: user.driver_id });
    const driver = drivers && drivers.length > 0 ? drivers[0] : null;
    console.log(`  Driver: ${driver?.name}\n`);

    // Step 4: Would generate token
    console.log('Step 4: Would generate JWT token');
    console.log('✅ LOGIN SUCCESSFUL\n');

    db.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    db.close();
    process.exit(1);
  }
}

testLogin();
