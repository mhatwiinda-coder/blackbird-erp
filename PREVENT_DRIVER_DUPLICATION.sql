-- =====================================================
-- PREVENT DUPLICATION: Add unique constraints
-- Stops the migration script from creating duplicates
-- =====================================================

-- 1. Add unique constraint on (name, phone, plate) combination
-- This prevents the same driver from being created twice
ALTER TABLE drivers
ADD CONSTRAINT unique_driver_identity UNIQUE (name, phone, plate);

-- 2. Create index for faster duplicate detection
CREATE INDEX IF NOT EXISTS idx_driver_unique_check
ON drivers(name, phone, plate);

-- 3. Add check constraint to prevent NULL issues with unique constraint
-- (PostgreSQL treats NULL as distinct, but we want explicit control)
ALTER TABLE drivers
ADD CONSTRAINT valid_driver_identity
CHECK (name IS NOT NULL);

-- Verification: Try to insert a duplicate (should fail)
-- This will error out, which is good:
-- INSERT INTO drivers (name, phone, plate, type)
-- VALUES ('Christopher Mrula', '0776068468', 'CAK 9802', 'CAR');
-- Expected error: "duplicate key value violates unique constraint"

-- View all constraints on drivers table
SELECT
  constraint_name,
  constraint_type,
  table_name
FROM information_schema.table_constraints
WHERE table_name = 'drivers'
ORDER BY constraint_name;
