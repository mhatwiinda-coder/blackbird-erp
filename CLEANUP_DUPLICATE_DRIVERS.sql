-- =====================================================
-- CLEANUP: Delete duplicate driver records
-- Safe because duplicates have no data attached
-- =====================================================

-- Step 1: Identify which driver IDs to DELETE (keep the first/oldest one)
WITH driver_groups AS (
  SELECT
    name,
    phone,
    plate,
    id,
    ROW_NUMBER() OVER (PARTITION BY name, phone, plate ORDER BY created_at ASC, id ASC) as rn,
    created_at
  FROM drivers
),
keep_ids AS (
  SELECT id FROM driver_groups WHERE rn = 1
),
delete_ids AS (
  SELECT id FROM driver_groups WHERE rn > 1
)

-- Step 2: Show what will be deleted (verification)
SELECT
  'WILL DELETE' as action,
  d.id,
  d.name,
  d.phone,
  d.plate,
  d.created_at,
  d.status
FROM drivers d
WHERE d.id IN (SELECT id FROM delete_ids)
ORDER BY d.name, d.id;

-- Step 3: DELETE duplicate drivers (UNCOMMENT TO RUN)
-- WITH driver_groups AS (
--   SELECT
--     id,
--     ROW_NUMBER() OVER (PARTITION BY name, phone, plate ORDER BY created_at ASC, id ASC) as rn
--   FROM drivers
-- )
-- DELETE FROM drivers
-- WHERE id IN (
--   SELECT id FROM driver_groups WHERE rn > 1
-- );

-- Verification queries to run AFTER deletion:
-- SELECT COUNT(*) as total_drivers FROM drivers;
-- SELECT name, COUNT(*) as duplicate_count FROM drivers GROUP BY name HAVING COUNT(*) > 1;
