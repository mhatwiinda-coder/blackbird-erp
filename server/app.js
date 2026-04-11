const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const authMiddleware = require('./middleware/auth');
const { startAutoSync } = require('./services/auto-sync');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// No-cache headers for HTML files
app.use((req, res, next) => {
  if (req.path.endsWith('.html') || req.path === '/') {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
  next();
});

app.use(express.static(path.join(__dirname, '../public')));
app.use('/images', express.static(path.join(__dirname, '../public/images')));

// Public routes (no auth required - website integration)
app.use('/api/public', require('./routes/public'));
app.use('/services', express.static(path.join(__dirname, '../services')));

// Routes - Using Supabase Backend
console.log('🔄 Initializing Supabase-backed API routes...');

app.use('/api/auth', require('./routes/auth-supabase'));
app.use('/api/drivers', authMiddleware, require('./routes/drivers-supabase'));
app.use('/api/vehicles', authMiddleware, require('./routes/vehicles'));
app.use('/api/logs', authMiddleware, require('./routes/logs'));
app.use('/api/jobs', authMiddleware, require('./routes/jobs'));
app.use('/api/deliveries', authMiddleware, require('./routes/deliveries'));
app.use('/api/payments', authMiddleware, require('./routes/payments-supabase'));
app.use('/api/invoices', authMiddleware, require('./routes/invoices'));
app.use('/api/quotations', authMiddleware, require('./routes/quotations'));
app.use('/api/staff', authMiddleware, require('./routes/hr'));
app.use('/api/recruitment', authMiddleware, require('./routes/recruitment'));
app.use('/api/mechanics', authMiddleware, require('./routes/mechanics'));
app.use('/api/dashboard', authMiddleware, require('./routes/dashboard'));
app.use('/api/website-activity', authMiddleware, require('./routes/website-activity'));
app.use('/api/rent-to-own', authMiddleware, require('./routes/rent-to-own'));
app.use('/api/driver-submissions', authMiddleware, require('./routes/driver-submissions'));

// Serve Driver Portals
app.get('/driver', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/driver.html'));
});
app.get('/driver.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/driver.html'));
});
app.get('/driver-login', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/driver-login.html'));
});
app.get('/driver-portal', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/driver-login.html'));
});
app.get('/rent-to-own-driver', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/driver-rent-to-own.html'));
});
app.get('/driver-earnings', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/driver-earnings.html'));
});

// Serve Marketing Website at root and ERP at /erp.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});
app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});
app.get('/erp', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/erp.html'));
});
app.get('/erp.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/erp.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Blackbird ERP Server running on http://localhost:${PORT}`);

  // Start automatic sync service
  startAutoSync().catch(err => {
    console.error('Failed to start auto-sync service:', err);
  });
});
