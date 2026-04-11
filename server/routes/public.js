const express = require('express');
const db = require('../config');
const router = express.Router();

// POST - Website quote submission (no auth required)
router.post('/quotation', (req, res) => {
  const { customer_name, customer_phone, service_type, pickup_location, dropoff_location, estimated_amount, notes } = req.body;
  if (!customer_name || !service_type) {
    return res.status(400).json({ error: 'Name and service type required' });
  }
  const quote_date = new Date().toISOString().split('T')[0];
  db.run(
    'INSERT INTO quotations (customer_name, customer_phone, service_type, pickup_location, dropoff_location, estimated_amount, source, status, notes, quote_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [customer_name, customer_phone || null, service_type, pickup_location || null, dropoff_location || null, estimated_amount || null, 'Website', 'Pending', notes || null, quote_date],
    function(err) {
      if (err) return res.status(500).json({ error: 'Failed to save quotation' });
      res.json({ id: this.lastID, message: 'Quotation saved' });
    }
  );
});

// POST - Log a website page visit (no auth required)
router.post('/visit', (req, res) => {
  const { page } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  const user_agent = req.headers['user-agent'] || '';
  const referrer = req.headers['referer'] || '';
  db.run(
    'INSERT INTO website_visits (page, user_agent, ip_address, referrer) VALUES (?, ?, ?, ?)',
    [page || 'Unknown', user_agent, ip, referrer],
    function(err) {
      if (err) return res.status(500).json({ error: 'Failed to log visit' });
      res.json({ logged: true });
    }
  );
});

module.exports = router;
