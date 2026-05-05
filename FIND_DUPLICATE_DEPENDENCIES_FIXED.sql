-- =====================================================
-- SCAN: Find what data is linked to duplicate driver IDs (FIXED)
-- =====================================================

-- First, create a list of duplicate IDs (all except the first/kept one)
WITH driver_groups AS (
  SELECT
    name,
    phone,
    plate,
    id,
    ROW_NUMBER() OVER (PARTITION BY name, phone, plate ORDER BY created_at ASC, id ASC) as rn
  FROM drivers
),
to_delete AS (
  SELECT id FROM driver_groups WHERE rn > 1
)

-- Now check all dependencies
SELECT
  d.name,
  d.id,
  COALESCE((SELECT COUNT(*) FROM payments WHERE driver_id = d.id), 0) as payment_count,
  COALESCE((SELECT COUNT(*) FROM driver_submissions WHERE driver_id = d.id), 0) as submission_count,
  COALESCE((SELECT COUNT(*) FROM weekly_logs WHERE driver_id = d.id), 0) as log_count,
  COALESCE((SELECT COUNT(*) FROM jobs WHERE driver_id = d.id), 0) as job_count,
  COALESCE((SELECT COUNT(*) FROM vehicles WHERE assigned_driver_id = d.id), 0) as vehicle_count,
  COALESCE((SELECT COUNT(*) FROM rent_to_own_agreements WHERE driver_id = d.id), 0) as rto_count,
  COALESCE((SELECT COUNT(*) FROM deliveries WHERE rider_id = d.id), 0) as delivery_count
FROM driver_groups d
WHERE d.rn > 1
ORDER BY d.name, d.id;

-- Also show summary totals
WITH driver_groups AS (
  SELECT
    name,
    phone,
    plate,
    id,
    ROW_NUMBER() OVER (PARTITION BY name, phone, plate ORDER BY created_at ASC, id ASC) as rn
  FROM drivers
)
SELECT
  'SUMMARY' as metric,
  COUNT(*) as total_duplicate_driver_ids,
  COALESCE(SUM(COALESCE((SELECT COUNT(*) FROM payments WHERE driver_id = d.id), 0)), 0) as total_payments_to_reassign,
  COALESCE(SUM(COALESCE((SELECT COUNT(*) FROM driver_submissions WHERE driver_id = d.id), 0)), 0) as total_submissions_to_reassign,
  COALESCE(SUM(COALESCE((SELECT COUNT(*) FROM weekly_logs WHERE driver_id = d.id), 0)), 0) as total_logs_to_reassign
FROM (
  SELECT d.id FROM driver_groups d WHERE d.rn > 1
) d;
