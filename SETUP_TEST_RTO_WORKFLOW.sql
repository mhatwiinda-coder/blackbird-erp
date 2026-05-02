-- =====================================================
-- SETUP: Create test RTO workflow for MAINZA
-- =====================================================
-- This script creates:
-- 1. Test driver (MAINZA HATWIINDA)
-- 2. Test vehicle (BBA1245)
-- 3. Test RTO agreement linking driver to vehicle
-- =====================================================

-- 1. Create test driver
INSERT INTO drivers (name, phone, plate, type, status)
VALUES ('MAINZA HATWIINDA', '0977123456', 'BBA1245', 'Car', 'Active')
ON CONFLICT DO NOTHING
RETURNING id as driver_id;

-- Store the driver ID for use below
-- Note: If driver already exists, use existing ID
-- Get the driver ID
DO $$
DECLARE
  driver_id BIGINT;
BEGIN
  SELECT id INTO driver_id FROM drivers WHERE name = 'MAINZA HATWIINDA' LIMIT 1;

  -- 2. Create test vehicle
  INSERT INTO vehicles (plate, type, vehicle_condition, assigned_driver_id, status)
  VALUES ('BBA1245', 'Car', 'OK', driver_id, 'Active')
  ON CONFLICT (plate) DO NOTHING;

  -- 3. Create test RTO agreement
  INSERT INTO rent_to_own_agreements (
    driver_id,
    vehicle_id,
    total_price,
    paid_amount,
    remaining_balance,
    agreement_status,
    agreement_date
  )
  SELECT
    driver_id,
    v.id,
    120000.00,
    0.00,
    120000.00,
    'Active',
    CURRENT_DATE::TEXT
  FROM vehicles v
  WHERE v.plate = 'BBA1245'
  AND NOT EXISTS (
    SELECT 1 FROM rent_to_own_agreements
    WHERE driver_id = driver_id AND vehicle_id = v.id
  );

  RAISE NOTICE 'Test RTO setup complete for driver_id: %', driver_id;
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT 'TEST SETUP COMPLETE!' as status;

SELECT
  'Driver' as type,
  COUNT(*) as count
FROM drivers WHERE name = 'MAINZA HATWIINDA'

UNION ALL

SELECT
  'Vehicle',
  COUNT(*)
FROM vehicles WHERE plate = 'BBA1245'

UNION ALL

SELECT
  'RTO Agreement',
  COUNT(*)
FROM rent_to_own_agreements WHERE agreement_status = 'Active';

-- Show the created RTO agreement
SELECT
  rto.id as agreement_id,
  d.name as driver_name,
  v.plate as vehicle_plate,
  rto.total_price,
  rto.paid_amount,
  rto.remaining_balance,
  rto.agreement_status
FROM rent_to_own_agreements rto
JOIN drivers d ON rto.driver_id = d.id
JOIN vehicles v ON rto.vehicle_id = v.id
WHERE d.name = 'MAINZA HATWIINDA'
ORDER BY rto.created_at DESC
LIMIT 1;

-- Show driver has auto-created account
SELECT
  da.driver_id,
  d.name,
  da.is_active,
  da.last_login
FROM driver_accounts da
JOIN drivers d ON da.driver_id = d.id
WHERE d.name = 'MAINZA HATWIINDA';
