-- =====================================================
-- DEEP SCAN: Migration Duplication Analysis
-- Find duplicate drivers and understand the pattern
-- =====================================================

-- 1. Count total drivers
SELECT COUNT(*) as total_drivers FROM drivers;

-- 2. Find duplicate driver names (same name, multiple IDs)
SELECT
  name,
  COUNT(*) as count,
  STRING_AGG(CAST(id as TEXT), ', ' ORDER BY id) as ids,
  phone,
  plate
FROM drivers
GROUP BY name, phone, plate
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- 3. Get deduplication stats
SELECT
  COUNT(DISTINCT name) as unique_driver_names,
  COUNT(*) as total_records,
  COUNT(*) - COUNT(DISTINCT name) as duplicate_records
FROM drivers;

-- 4. Show the most duplicated drivers
SELECT
  name,
  COUNT(*) as duplicate_count,
  phone,
  plate,
  MIN(id) as first_id,
  MAX(id) as last_id,
  MIN(created_at) as first_created,
  MAX(created_at) as last_created
FROM drivers
GROUP BY name, phone, plate
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC
LIMIT 20;

-- 5. Find which ID should be kept (usually the oldest)
WITH driver_dedup AS (
  SELECT
    name,
    phone,
    plate,
    ROW_NUMBER() OVER (PARTITION BY name, phone, plate ORDER BY created_at ASC, id ASC) as rn,
    id,
    created_at
  FROM drivers
)
SELECT
  name,
  phone,
  plate,
  id as keep_id,
  created_at,
  (SELECT STRING_AGG(CAST(id as TEXT), ', ' ORDER BY id)
   FROM driver_dedup dd2
   WHERE dd2.name = driver_dedup.name
   AND dd2.phone = driver_dedup.phone
   AND dd2.plate = driver_dedup.plate
   AND dd2.rn > 1) as delete_ids
FROM driver_dedup
WHERE rn = 1
ORDER BY name;
