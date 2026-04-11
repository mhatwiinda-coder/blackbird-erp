/**
 * Test JWT token verification
 */

require('dotenv').config();
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Token from the login test
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NiwiZHJpdmVyX2lkIjoyMiwiOm5hbWUiOiJMT0RJQSBDSElLQU1CV0UiLCJhY2NvdW50X3R5cGUiOiJkcml2ZXIiLCJpYXQiOjE3NzU2ODg2NzEsImV4cCI6MTc3NTc3NTA3MX0.VNuDgtG8vEWWmsoUXufjspLebGKYd_KPKOayxnrWkqU';

console.log('\n🔐 Testing JWT token verification...\n');
console.log('SECRET:', SECRET.substring(0, 20) + '...');
console.log('Token:', token.substring(0, 50) + '...\n');

try {
  const decoded = jwt.verify(token, SECRET);
  console.log('✅ Token verified successfully!\n');
  console.log('Decoded payload:');
  console.log(JSON.stringify(decoded, null, 2));
} catch (err) {
  console.log('❌ Token verification failed!');
  console.log('Error:', err.message);
}
