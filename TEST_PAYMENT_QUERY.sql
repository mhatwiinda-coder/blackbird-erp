-- =====================================================
-- TEST: Mimic the exact backend query for driver 163
-- =====================================================

-- Step 1: Get driver 163's name
SELECT id, name
FROM drivers
WHERE id = 163;

-- Step 2: Query payments by driver_id = 163
SELECT
  id, payment_date, payer_name, driver_id,
  payment_type, amount, payment_status
FROM payments
WHERE driver_id = 163
ORDER BY payment_date DESC;

-- Step 3: Query payments by payer_name matching 'Edward Zulu'
SELECT
  id, payment_date, payer_name, driver_id,
  payment_type, amount, payment_status
FROM payments
WHERE payer_name ILIKE 'Edward Zulu'
ORDER BY payment_date DESC;

-- Step 4: See all payments for Edward Zulu (combined from both queries, deduplicated)
SELECT DISTINCT ON (id)
  id, payment_date, payer_name, driver_id,
  payment_type, amount, payment_status
FROM (
  SELECT * FROM payments WHERE driver_id = 163
  UNION ALL
  SELECT * FROM payments WHERE payer_name ILIKE 'Edward Zulu'
) combined
ORDER BY id, payment_date DESC;
