-- =====================================================
-- SCAN: Find what data is linked to duplicate driver IDs
-- This tells us what needs to be reassigned before deletion
-- =====================================================

-- Get list of duplicate driver IDs to check
WITH duplicates AS (
  SELECT
    name,
    phone,
    plate,
    id,
    ROW_NUMBER() OVER (PARTITION BY name, phone, plate ORDER BY created_at ASC, id ASC) as rn
  FROM drivers
  GROUP BY name, phone, plate, id, created_at
  HAVING COUNT(*) > 0
)
,
duplicate_ids AS (
  SELECT DISTINCT id FROM duplicates WHERE rn > 1
)

-- 1. Check payments linked to duplicates
SELECT 'payments' as table_name, COUNT(*) as record_count, STRING_AGG(DISTINCT CAST(driver_id as TEXT), ', ') as duplicate_driver_ids
FROM payments
WHERE driver_id IN (SELECT id FROM duplicate_ids);

-- 2. Check driver_submissions linked to duplicates
SELECT 'driver_submissions' as table_name, COUNT(*) as record_count, STRING_AGG(DISTINCT CAST(driver_id as TEXT), ', ') as duplicate_driver_ids
FROM driver_submissions
WHERE driver_id IN (SELECT id FROM duplicate_ids);

-- 3. Check weekly_logs linked to duplicates
SELECT 'weekly_logs' as table_name, COUNT(*) as record_count, STRING_AGG(DISTINCT CAST(driver_id as TEXT), ', ') as duplicate_driver_ids
FROM weekly_logs
WHERE driver_id IN (SELECT id FROM duplicate_ids);

-- 4. Check jobs linked to duplicates
SELECT 'jobs' as table_name, COUNT(*) as record_count, STRING_AGG(DISTINCT CAST(driver_id as TEXT), ', ') as duplicate_driver_ids
FROM jobs
WHERE driver_id IN (SELECT id FROM duplicate_ids);

-- 5. Check deliveries linked to duplicates
SELECT 'deliveries' as table_name, COUNT(*) as record_count, STRING_AGG(DISTINCT CAST(rider_id as TEXT), ', ') as duplicate_driver_ids
FROM deliveries
WHERE rider_id IN (SELECT id FROM duplicate_ids);

-- 6. Check vehicles assigned to duplicates
SELECT 'vehicles' as table_name, COUNT(*) as record_count, STRING_AGG(DISTINCT CAST(assigned_driver_id as TEXT), ', ') as duplicate_driver_ids
FROM vehicles
WHERE assigned_driver_id IN (SELECT id FROM duplicate_ids);

-- 7. Check rent_to_own linked to duplicates
SELECT 'rent_to_own_agreements' as table_name, COUNT(*) as record_count, STRING_AGG(DISTINCT CAST(driver_id as TEXT), ', ') as duplicate_driver_ids
FROM rent_to_own_agreements
WHERE driver_id IN (SELECT id FROM duplicate_ids);

-- 8. Summary: Show which duplicate IDs have data
WITH duplicates AS (
  SELECT
    name,
    id,
    ROW_NUMBER() OVER (PARTITION BY name, phone, plate ORDER BY created_at ASC, id ASC) as rn
  FROM drivers
  GROUP BY name, phone, plate, id, created_at
)
SELECT
  d.name,
  d.id,
  COALESCE((SELECT COUNT(*) FROM payments WHERE driver_id = d.id), 0) as payment_count,
  COALESCE((SELECT COUNT(*) FROM driver_submissions WHERE driver_id = d.id), 0) as submission_count,
  COALESCE((SELECT COUNT(*) FROM weekly_logs WHERE driver_id = d.id), 0) as log_count,
  COALESCE((SELECT COUNT(*) FROM jobs WHERE driver_id = d.id), 0) as job_count,
  COALESCE((SELECT COUNT(*) FROM vehicles WHERE assigned_driver_id = d.id), 0) as vehicle_count,
  COALESCE((SELECT COUNT(*) FROM rent_to_own_agreements WHERE driver_id = d.id), 0) as rto_count
FROM duplicates d
WHERE d.rn > 1
ORDER BY d.name, d.id;
