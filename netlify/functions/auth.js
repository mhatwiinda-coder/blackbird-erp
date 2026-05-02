const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

exports.handler = async (event, context) => {
  try {
    const { httpMethod, path, body } = event;
    const basePath = path.includes('/.netlify/functions/') ? '/.netlify/functions/auth' : '/api/auth'; const pathSegments = path.replace(basePath, '').split('/').filter(Boolean);
    const action = pathSegments[0];

    // POST /api/auth/login - Staff login
    if (httpMethod === 'POST' && action === 'login') {
      const { role, password } = JSON.parse(body);

      if (!role || !password) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Role and password required' })
        };
      }

      // Fetch user from Supabase
      const { data: users, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('role', role.toLowerCase());

      if (fetchError || !users || users.length === 0) {
        return {
          statusCode: 401,
          body: JSON.stringify({ error: 'Invalid role or password' })
        };
      }

      const user = users[0];

      // Compare password
      const isMatch = await new Promise((resolve, reject) => {
        bcryptjs.compare(password, user.password_hash, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });

      if (!isMatch) {
        return {
          statusCode: 401,
          body: JSON.stringify({ error: 'Invalid role or password' })
        };
      }

      // Generate JWT
      const token = jwt.sign(
        {
          id: user.id,
          role: user.role,
          account_type: user.account_type || 'admin'
        },
        SECRET,
        { expiresIn: '24h' }
      );

      return {
        statusCode: 200,
        body: JSON.stringify({
          token,
          role: user.role,
          message: 'Login successful'
        })
      };
    }

    // POST /api/auth/driver-login - Driver login
    if (httpMethod === 'POST' && action === 'driver-login') {
      const { driverId, password } = JSON.parse(body);

      if (!driverId || !password) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Driver ID and password required' })
        };
      }

      const driverIdInt = parseInt(driverId);

      // Try to find driver user account
      let { data: users, error: fetchError } = await supabase
        .from('driver_accounts')
        .select('*')
        .eq('driver_id', driverIdInt);

      // If no account, create it (first login auto-enrollment)
      if (!users || users.length === 0) {
        // Get driver info
        const { data: drivers, error: driverError } = await supabase
          .from('drivers')
          .select('id, name')
          .eq('id', driverIdInt);

        if (driverError || !drivers || drivers.length === 0) {
          return {
            statusCode: 401,
            body: JSON.stringify({ error: 'Invalid driver ID' })
          };
        }

        const driver = drivers[0];
        const firstName = driver.name.split(' ')[0];
        const expectedPassword = `${firstName}@123`;

        // VALIDATE PASSWORD BEFORE CREATING ACCOUNT
        if (password !== expectedPassword) {
          return {
            statusCode: 401,
            body: JSON.stringify({ error: 'Invalid driver ID or password' })
          };
        }

        // Hash password
        const passwordHash = await new Promise((resolve, reject) => {
          bcryptjs.hash(expectedPassword, 10, (err, hash) => {
            if (err) reject(err);
            else resolve(hash);
          });
        });

        // Create driver user account
        const { error: insertError } = await supabase
          .from('driver_accounts')
          .insert([{
            driver_id: driverIdInt,
            password_hash: passwordHash,
            created_at: new Date().toISOString()
          }]);

        if (insertError) throw insertError;

        // Re-fetch the user
        const { data: newUsers } = await supabase
          .from('driver_accounts')
          .select('*')
          .eq('driver_id', driverIdInt);

        users = newUsers;
      }

      if (!users || users.length === 0) {
        return {
          statusCode: 401,
          body: JSON.stringify({ error: 'Invalid driver ID or password' })
        };
      }

      const user = users[0];

      // Compare password
      const isMatch = await new Promise((resolve, reject) => {
        bcryptjs.compare(password, user.password_hash, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });

      if (!isMatch) {
        return {
          statusCode: 401,
          body: JSON.stringify({ error: 'Invalid driver ID or password' })
        };
      }

      // Get driver details
      const { data: drivers } = await supabase
        .from('drivers')
        .select('id, name')
        .eq('id', user.driver_id);

      const driver = drivers?.[0] || { name: 'Driver' };

      // Generate JWT
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

      return {
        statusCode: 200,
        body: JSON.stringify({
          token,
          driverId: user.driver_id,
          driverName: driver.name,
          message: 'Driver login successful'
        })
      };
    }

    // POST /api/auth/register-driver - Register new driver account (called when driver is created in ERP)
    if (httpMethod === 'POST' && action === 'register-driver') {
      const { driverId, password } = JSON.parse(body);

      if (!driverId || !password) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Driver ID and password required' })
        };
      }

      // Check if driver exists
      const { data: drivers, error: driverError } = await supabase
        .from('drivers')
        .select('id, name')
        .eq('id', parseInt(driverId));

      if (driverError || !drivers || drivers.length === 0) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Driver not found' })
        };
      }

      // Check if account already exists
      const { data: existing } = await supabase
        .from('driver_accounts')
        .select('id')
        .eq('driver_id', parseInt(driverId));

      if (existing && existing.length > 0) {
        return {
          statusCode: 200,
          body: JSON.stringify({ message: 'Driver account already exists' })
        };
      }

      // Hash password
      const passwordHash = await new Promise((resolve, reject) => {
        bcryptjs.hash(password, 10, (err, hash) => {
          if (err) reject(err);
          else resolve(hash);
        });
      });

      // Create driver account
      const { error: insertError } = await supabase
        .from('driver_accounts')
        .insert([{
          driver_id: parseInt(driverId),
          password_hash: passwordHash,
          created_at: new Date().toISOString()
        }]);

      if (insertError) {
        console.error('Account creation error:', insertError);
        return {
          statusCode: 500,
          body: JSON.stringify({ error: 'Failed to create account' })
        };
      }

      return {
        statusCode: 201,
        body: JSON.stringify({ message: 'Driver account created successfully' })
      };
    }

    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Endpoint not found' })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
