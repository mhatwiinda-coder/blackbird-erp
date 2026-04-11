const express = require('express');
const db = require('../config');
const router = express.Router();

// GET all website visits (authenticated)
router.get('/', (req, res) => {
  const { limit = 500 } = req.query;
  db.all(
    'SELECT * FROM website_visits ORDER BY visited_at DESC LIMIT ?',
    [parseInt(limit)],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({ data: rows || [] });
    }
  );
});

// GET visit summary stats (authenticated)
router.get('/stats', (req, res) => {
  db.all(`
    SELECT
      COUNT(*) as total_visits,
      COUNT(CASE WHEN date(visited_at) = date('now') THEN 1 END) as today,
      COUNT(CASE WHEN visited_at >= datetime('now', '-7 days') THEN 1 END) as this_week,
      COUNT(DISTINCT ip_address) as unique_ips,
      page,
      COUNT(*) as page_count
    FROM website_visits
    GROUP BY page
    ORDER BY page_count DESC
  `, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    // Also get totals
    db.get(`
      SELECT
        COUNT(*) as total_visits,
        COUNT(CASE WHEN date(visited_at) = date('now') THEN 1 END) as today,
        COUNT(CASE WHEN visited_at >= datetime('now', '-7 days') THEN 1 END) as this_week,
        COUNT(DISTINCT ip_address) as unique_ips
      FROM website_visits
    `, [], (err2, totals) => {
      if (err2) return res.status(500).json({ error: 'Database error' });
      res.json({ totals: totals || {}, by_page: rows || [] });
    });
  });
});

module.exports = router;
