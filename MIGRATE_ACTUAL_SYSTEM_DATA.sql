-- MIGRATE ACTUAL VEHICLE DATA FROM YOUR CURRENT SYSTEM TO SUPABASE
-- This is the REAL production data from your BLACK BIRD system
-- Run in Supabase: https://app.supabase.com/project/[ID]/sql/new

-- Insert all 41 vehicles with actual assignments and conditions
INSERT INTO vehicles (plate, type, assigned_driver_id, vehicle_condition, road_tax_due, insurance_due, service_due_km)
VALUES
  -- Vehicles with assigned drivers (from your current system)
  ('AAA1234', 'Car', (SELECT id FROM drivers WHERE name = 'ESTHER CHIKO' LIMIT 1), 'OK', '2026-04-12', '2026-04-12', 5000),
  ('ABC 4541', 'Car', (SELECT id FROM drivers WHERE name = 'MILDRED BWALIA' LIMIT 1), 'OK', '2026-09-11', '2026-07-24', 5000),
  ('BBA 5656', 'Car', (SELECT id FROM drivers WHERE name = 'Sisa Munks' LIMIT 1), 'OK', '2026-04-10', '2026-04-10', 5000),
  ('CAK 1234', 'Car', (SELECT id FROM drivers WHERE name = 'Mwiza Kamanga' LIMIT 1), 'OK', '2026-04-09', '2026-04-09', 5000),
  ('BBA1245', 'Car', (SELECT id FROM drivers WHERE name = 'MAINZA HATWIINDA' LIMIT 1), 'OK', '2026-04-13', '2026-10-31', 5000),

  -- Unassigned vehicles (no driver link)
  ('DLB 758', 'Bike', NULL, 'Good', NULL, NULL, NULL),
  ('BK 3752', 'Bike', NULL, 'Good', NULL, NULL, NULL),
  ('CAK 3880', 'Car', NULL, 'Good', NULL, NULL, NULL),
  ('CAK 2676', 'Car', NULL, 'Good', NULL, NULL, NULL),
  ('CAK 3807', 'Bike', NULL, 'Good', NULL, NULL, NULL),
  ('BLD 3765', 'Bike', NULL, 'Good', NULL, NULL, NULL),
  ('BLD 8757', 'Bike', NULL, 'Good', NULL, NULL, NULL),
  ('BBC 1522', 'Car', NULL, 'Good', NULL, NULL, NULL),
  ('BLD 3771', 'Car', NULL, 'Good', NULL, NULL, NULL),
  ('BLD 8740', 'Bike', NULL, 'Good', NULL, NULL, NULL),
  ('BLD 8741', 'Bike', NULL, 'Good', NULL, NULL, NULL),
  ('BLD 8742', 'Bike', NULL, 'Good', NULL, NULL, NULL),
  ('BLD 8744', 'Bike', NULL, 'Good', NULL, NULL, NULL),
  ('BLD 8747', 'Bike', NULL, 'Good', NULL, NULL, NULL),
  ('BLD 8759', 'Bike', NULL, 'Good', NULL, NULL, NULL),
  ('CAK 4117', 'Car', NULL, 'Good', NULL, NULL, NULL),
  ('CAK 3354', 'Car', NULL, 'Good', NULL, NULL, NULL),
  ('BLD 8745', 'Bike', NULL, 'Good', NULL, NULL, NULL),
  ('CAK 3802', 'Car', NULL, 'Good', NULL, NULL, NULL),
  ('CAK 3765', 'Car', NULL, 'Good', NULL, NULL, NULL),
  ('CAK 3169', 'Car', NULL, 'Good', NULL, NULL, NULL),
  ('CAF 2098', 'Car', NULL, 'Good', NULL, NULL, NULL),
  ('CAK 2876', 'Car', NULL, 'Good', NULL, NULL, NULL),
  ('CAK 3494', 'Bike', NULL, 'Good', NULL, NULL, NULL),
  ('AEB 4721', 'Car', NULL, 'Good', NULL, NULL, NULL),
  ('CAK 3412', 'Car', NULL, 'Good', NULL, NULL, NULL),
  ('CAK 3773', 'Bike', NULL, 'Good', NULL, NULL, NULL),
  ('CAF 4805', 'Car', NULL, 'Good', NULL, NULL, NULL),
  ('CAK 3775', 'Bike', NULL, 'Good', NULL, NULL, NULL),
  ('CAK 3666', 'Bike', NULL, 'Good', NULL, NULL, NULL),
  ('CAK 3749', 'Bike', NULL, 'Good', NULL, NULL, NULL),
  ('BK 1522', 'Car', NULL, 'Good', NULL, NULL, NULL),
  ('AED 4721', 'Car', NULL, 'Good', NULL, NULL, NULL),
  ('CAE 1892', 'Car', NULL, 'Good', NULL, NULL, NULL),
  ('CAK 3312', 'Car', NULL, 'OK', '2026-03-25', '2027-04-22', 5000)
ON CONFLICT (plate) DO NOTHING;

-- Verify the migration
SELECT
  COUNT(*) as total_vehicles,
  COUNT(CASE WHEN type = 'Car' THEN 1 END) as cars,
  COUNT(CASE WHEN type = 'Bike' THEN 1 END) as bikes,
  COUNT(CASE WHEN assigned_driver_id IS NOT NULL THEN 1 END) as assigned_vehicles,
  COUNT(CASE WHEN assigned_driver_id IS NULL THEN 1 END) as unassigned_vehicles
FROM vehicles;
