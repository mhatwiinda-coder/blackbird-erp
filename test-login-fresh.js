/**
 * Test fresh login and token verification
 */

require('dotenv').config();
const http = require('http');
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const loginData = JSON.stringify({
  driverId: 22,
  password: 'LODIA@123'
});

const loginOptions = {
  hostname: 'localhost',
  port: 8000,
  path: '/api/auth/driver-login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length
  }
};

console.log('\n🔐 Testing fresh login...\n');

const req = http.request(loginOptions, (res) => {
  let responseData = '';
  res.on('data', (chunk) => { responseData += chunk; });

  res.on('end', () => {
    const loginResponse = JSON.parse(responseData);
    console.log('Login Response:');
    console.log('  driverId:', loginResponse.driverId);
    console.log('  driverName:', loginResponse.driverName);
    console.log('  token:', loginResponse.token.substring(0, 50) + '...\n');

    // Now verify the token
    console.log('🔍 Verifying token...');
    try {
      const decoded = jwt.verify(loginResponse.token, SECRET);
      console.log('✅ Token verified!\n');
      console.log('Decoded payload:');
      console.log(JSON.stringify(decoded, null, 2));
    } catch (err) {
      console.log('❌ Token verification failed!');
      console.log('Error:', err.message);
    }
  });
});

req.write(loginData);
req.end();
