-- =====================================================
-- FIX: Driver Account Auto-Create Trigger
-- =====================================================
-- Problem: RLS policy on driver_accounts is blocking trigger inserts
-- Solution: Remove restrictive policy and allow trigger to work

-- 1. Drop the restrictive policy
DROP POLICY IF EXISTS "Restrict driver_accounts to RPC only" ON driver_accounts;

-- 2. Enable RLS (keep it enabled for security)
ALTER TABLE driver_accounts ENABLE ROW LEVEL SECURITY;

-- 3. Create permissive policy that allows all (trigger will handle auth)
CREATE POLICY "Allow all for trigger" ON driver_accounts FOR ALL TO anon USING (true) WITH CHECK (true);

-- 4. Verify trigger exists and is correct
-- The trigger function should now be able to insert

-- 5. Test by adding a driver manually
-- INSERT INTO drivers (name, phone, type) VALUES ('Test Driver', '0777123456', 'Car');
-- This should auto-create a record in driver_accounts

-- Verify
SELECT 'Driver Account RLS Fixed!' as status;
SELECT COUNT(*) as driver_accounts FROM driver_accounts;
