const express = require('express');
const db = require('../config');
const router = express.Router();

// GET dashboard statistics
router.get('/stats', (req, res) => {
  Promise.all([
    getDriverCount(),
    getVehicleCount(),
    getTotalRevenue(),
    getActiveJobs(),
    getActiveDrives()
  ]).then(([drivers, vehicles, revenue, jobs, activeDrives]) => {
    res.json({
      total_drivers: drivers,
      total_vehicles: vehicles,
      total_revenue: revenue,
      active_jobs: jobs,
      active_routes: activeDrives
    });
  }).catch((err) => {
    res.status(500).json({ error: 'Failed to fetch stats' });
  });
});

// GET monthly revenue
router.get('/monthly-revenue', (req, res) => {
  const query = `
    SELECT
      month,
      SUM(weekly_cashing) as total_revenue
    FROM weekly_logs
    WHERE weekly_cashing IS NOT NULL
    GROUP BY month
    ORDER BY month ASC
  `;

  db.all(query, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({
      data: rows.map(row => ({
        month: row.month,
        revenue: row.total_revenue || 0
      }))
    });
  });
});

// GET top drivers by earnings
router.get('/top-drivers', (req, res) => {
  const query = `
    SELECT
      d.id,
      d.name,
      d.type,
      SUM(wl.weekly_cashing) as total_earnings,
      COUNT(DISTINCT wl.id) as logged_weeks
    FROM drivers d
    LEFT JOIN weekly_logs wl ON d.id = wl.driver_id
    GROUP BY d.id, d.name, d.type
    ORDER BY total_earnings DESC
    LIMIT 10
  `;

  db.all(query, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({
      data: rows || []
    });
  });
});

// GET vehicle/route alerts
router.get('/alerts', (req, res) => {
  const alerts = [];

  // Check for vehicles needing service
  db.all(
    "SELECT id, plate, vehicle_condition FROM vehicles WHERE vehicle_condition IN ('Needs Service', 'Under Repair')",
    (err, vehicles) => {
      if (!err && vehicles) {
        vehicles.forEach(v => {
          alerts.push({
            type: 'vehicle_condition',
            vehicle_id: v.id,
            plate: v.plate,
            message: `Vehicle ${v.plate} needs attention`,
            status: v.vehicle_condition
          });
        });
      }

      // Check for overdue logs
      db.all(
        "SELECT id, driver_id, month, week, reminder FROM weekly_logs WHERE reminder = 'FALSE'",
        (err, logs) => {
          if (!err && logs) {
            logs.forEach(l => {
              alerts.push({
                type: 'log_reminder',
                log_id: l.id,
                driver_id: l.driver_id,
                message: `Week ${l.week} of month ${l.month} has active reminder`,
                status: 'Pending'
              });
            });
          }

          res.json({ alerts });
        }
      );
    }
  );
});

// Helper functions
function getDriverCount() {
  return new Promise((resolve, reject) => {
    db.get("SELECT COUNT(*) as count FROM drivers", (err, row) => {
      if (err) reject(err);
      resolve(row?.count || 0);
    });
  });
}

function getVehicleCount() {
  return new Promise((resolve, reject) => {
    db.get("SELECT COUNT(*) as count FROM vehicles", (err, row) => {
      if (err) reject(err);
      resolve(row?.count || 0);
    });
  });
}

function getTotalRevenue() {
  return new Promise((resolve, reject) => {
    db.get("SELECT SUM(weekly_cashing) as total FROM weekly_logs WHERE weekly_cashing IS NOT NULL", (err, row) => {
      if (err) reject(err);
      resolve(row?.total || 0);
    });
  });
}

function getActiveJobs() {
  return new Promise((resolve, reject) => {
    db.get("SELECT COUNT(*) as count FROM jobs WHERE status != 'Completed'", (err, row) => {
      if (err) reject(err);
      resolve(row?.count || 0);
    });
  });
}

function getActiveDrives() {
  return new Promise((resolve, reject) => {
    db.get("SELECT COUNT(*) as count FROM deliveries WHERE status IN ('Pending', 'Picked Up', 'In Transit')", (err, row) => {
      if (err) reject(err);
      resolve(row?.count || 0);
    });
  });
}

module.exports = router;
