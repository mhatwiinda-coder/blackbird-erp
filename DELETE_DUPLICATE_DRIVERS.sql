-- =====================================================
-- EXECUTE: Delete all 46 duplicate driver records
-- These have 0 data attached - completely safe
-- =====================================================

WITH driver_groups AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY name, phone, plate ORDER BY created_at ASC, id ASC) as rn
  FROM drivers
)
DELETE FROM drivers
WHERE id IN (
  SELECT id FROM driver_groups WHERE rn > 1
);

-- Verify cleanup (run after deletion)
SELECT COUNT(*) as remaining_drivers FROM drivers;
SELECT name, COUNT(*) as count FROM drivers GROUP BY name ORDER BY name;
