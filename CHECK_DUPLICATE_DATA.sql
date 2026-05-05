-- =====================================================
-- SIMPLE CHECK: See all data linked to duplicate drivers
-- =====================================================

-- Show duplicate driver IDs and their data
SELECT
  d.name,
  d.id as driver_id,
  d.created_at,
  (SELECT COUNT(*) FROM payments WHERE driver_id = d.id) as payments,
  (SELECT COUNT(*) FROM driver_submissions WHERE driver_id = d.id) as submissions,
  (SELECT COUNT(*) FROM weekly_logs WHERE driver_id = d.id) as logs,
  (SELECT COUNT(*) FROM vehicles WHERE assigned_driver_id = d.id) as vehicles,
  (SELECT COUNT(*) FROM rent_to_own_agreements WHERE driver_id = d.id) as rto
FROM drivers d
WHERE (d.name, d.phone, d.plate) IN (
  SELECT name, phone, plate
  FROM drivers
  GROUP BY name, phone, plate
  HAVING COUNT(*) > 1
)
ORDER BY d.name, d.created_at;
