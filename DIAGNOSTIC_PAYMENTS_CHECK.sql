-- =====================================================
-- DIAGNOSTIC: Check what's actually in the payments table
-- Run this in Supabase SQL Editor to see the data
-- =====================================================

-- 1. Check if driver_id column exists and has data
SELECT
  id,
  payment_date,
  payer_name,
  driver_id,
  payment_type,
  amount,
  payment_status,
  created_at
FROM payments
WHERE payer_name ILIKE '%edward%' OR payer_name ILIKE '%zulu%'
ORDER BY payment_date DESC;

-- 2. Check Edward Zulu's driver record
SELECT id, name, phone, plate FROM drivers WHERE LOWER(name) LIKE '%edward%';

-- 3. Check ALL payments with null driver_id (legacy payments)
SELECT
  id,
  payment_date,
  payer_name,
  driver_id,
  amount,
  payment_type
FROM payments
WHERE driver_id IS NULL
ORDER BY payment_date DESC
LIMIT 20;

-- 4. Count payments by driver_id vs payer_name
SELECT
  'With driver_id' as category,
  COUNT(*) as count
FROM payments
WHERE driver_id IS NOT NULL

UNION ALL

SELECT
  'Without driver_id (legacy)',
  COUNT(*)
FROM payments
WHERE driver_id IS NULL;
