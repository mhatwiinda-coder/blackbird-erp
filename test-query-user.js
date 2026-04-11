const sqlite3 = require('sqlite3').verbose();
const path = require('path');

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

    console.log('Query:', query);
    console.log('Params:', params);

    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

async function test() {
  try {
    const users = await queryUsersSQLite({ driver_id: 156 });
    console.log('Result:', users);
    
    if (users && users.length > 0) {
      console.log('✅ User found');
      console.log('  - ID:', users[0].id);
      console.log('  - Driver ID:', users[0].driver_id);
      console.log('  - Role:', users[0].role);
    } else {
      console.log('❌ No user found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    db.close();
  }
}

test();
