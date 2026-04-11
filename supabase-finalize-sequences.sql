-- BLACKBIRD ERP - Finalize All Sequences
-- Run this in Supabase SQL Editor to ensure all auto-increment is working

-- ========================================
-- FIX AND VERIFY ALL TABLE SEQUENCES
-- ========================================

-- Get max IDs and set sequences correctly
SELECT setval('drivers_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM drivers));
SELECT setval('vehicles_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM vehicles));
SELECT setval('quotations_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM quotations));
SELECT setval('invoices_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM invoices));
SELECT setval('payments_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM payments));
SELECT setval('jobs_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM jobs));
SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM users));
SELECT setval('driver_submissions_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM driver_submissions));
SELECT setval('rent_to_own_agreements_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM rent_to_own_agreements));
SELECT setval('rent_to_own_payments_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM rent_to_own_payments));
SELECT setval('payment_categories_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM payment_categories));
SELECT setval('payment_backdating_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM payment_backdating));

SELECT 'All sequences synchronized!' as status;

-- ========================================
-- VERIFY ALL SEQUENCES ARE WORKING
-- ========================================

-- Test that all tables can generate new IDs
SELECT
  'drivers' as table_name,
  nextval('drivers_id_seq') as next_id
UNION ALL
SELECT
  'vehicles',
  nextval('vehicles_id_seq')
UNION ALL
SELECT
  'quotations',
  nextval('quotations_id_seq')
UNION ALL
SELECT
  'invoices',
  nextval('invoices_id_seq')
UNION ALL
SELECT
  'payments',
  nextval('payments_id_seq')
UNION ALL
SELECT
  'jobs',
  nextval('jobs_id_seq')
UNION ALL
SELECT
  'users',
  nextval('users_id_seq')
UNION ALL
SELECT
  'driver_submissions',
  nextval('driver_submissions_id_seq')
UNION ALL
SELECT
  'rent_to_own_agreements',
  nextval('rent_to_own_agreements_id_seq')
UNION ALL
SELECT
  'rent_to_own_payments',
  nextval('rent_to_own_payments_id_seq')
UNION ALL
SELECT
  'payment_categories',
  nextval('payment_categories_id_seq')
UNION ALL
SELECT
  'payment_backdating',
  nextval('payment_backdating_id_seq');

-- ========================================
-- ENSURE TIMESTAMPS AUTO-UPDATE
-- ========================================

-- Create trigger function for auto-updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply timestamp triggers to all tables
DROP TRIGGER IF EXISTS update_drivers_timestamp ON drivers;
CREATE TRIGGER update_drivers_timestamp BEFORE UPDATE ON drivers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vehicles_timestamp ON vehicles;
CREATE TRIGGER update_vehicles_timestamp BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_quotations_timestamp ON quotations;
CREATE TRIGGER update_quotations_timestamp BEFORE UPDATE ON quotations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_invoices_timestamp ON invoices;
CREATE TRIGGER update_invoices_timestamp BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_timestamp ON payments;
CREATE TRIGGER update_payments_timestamp BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_jobs_timestamp ON jobs;
CREATE TRIGGER update_jobs_timestamp BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_timestamp ON users;
CREATE TRIGGER update_users_timestamp BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_driver_submissions_timestamp ON driver_submissions;
CREATE TRIGGER update_driver_submissions_timestamp BEFORE UPDATE ON driver_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rent_to_own_agreements_timestamp ON rent_to_own_agreements;
CREATE TRIGGER update_rent_to_own_agreements_timestamp BEFORE UPDATE ON rent_to_own_agreements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rent_to_own_payments_timestamp ON rent_to_own_payments;
CREATE TRIGGER update_rent_to_own_payments_timestamp BEFORE UPDATE ON rent_to_own_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payment_categories_timestamp ON payment_categories;
CREATE TRIGGER update_payment_categories_timestamp BEFORE UPDATE ON payment_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payment_backdating_timestamp ON payment_backdating;
CREATE TRIGGER update_payment_backdating_timestamp BEFORE UPDATE ON payment_backdating
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

SELECT 'All timestamp triggers created!' as status;

-- ========================================
-- FINAL VERIFICATION
-- ========================================

SELECT 'Database finalization complete!' as final_status;
SELECT 'All auto-increment sequences are synchronized' as note1;
SELECT 'All timestamp fields will auto-update on record changes' as note2;
SELECT 'All new records will auto-generate IDs' as note3;
