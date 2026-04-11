/**
 * Run server with detailed error logging
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Request logging
app.use((req, res, next) => {
  console.log(`\n[${new Date().toISOString()}] ${req.method} ${req.path}`);
  console.log('  Query:', Object.keys(req.query).length > 0 ? req.query : 'none');
  console.log('  Auth:', req.headers.authorization ? 'YES' : 'NO');
  next();
});

// Auth middleware
const authMiddleware = require('./server/middleware/auth');

// Routes
app.use('/api/auth', require('./server/routes/auth-supabase'));
app.use('/api/drivers', authMiddleware, require('./server/routes/drivers-supabase'));
app.use('/api/payments', authMiddleware, require('./server/routes/payments-supabase'));
app.use('/api/driver-submissions', authMiddleware, require('./server/routes/driver-submissions'));
app.use('/api/vehicles', authMiddleware, require('./server/routes/vehicles'));
app.use('/api/rent-to-own', authMiddleware, require('./server/routes/rent-to-own'));

// Error handler
app.use((err, req, res, next) => {
  console.error(`\n[ERROR] ${req.method} ${req.path}:`);
  console.error('  Message:', err.message);
  console.error('  Stack:', err.stack);
  
  res.status(500).json({ 
    error: err.message,
    path: req.path,
    method: req.method
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n✅ Server running on http://localhost:${PORT}`);
  console.log('📋 API Endpoints:');
  console.log('  POST   /api/auth/driver-login');
  console.log('  POST   /api/driver-submissions');
  console.log('  GET    /api/driver-submissions/my-submissions');
  console.log('  GET    /api/payments');
  console.log('  GET    /api/rent-to-own');
  console.log('\n🔍 Server is ready. Waiting for requests...\n');
});
