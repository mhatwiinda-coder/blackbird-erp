-- CLEANUP SCRIPT - Delete all test/hardcoded data from Supabase
-- KEEP: Tables, functions, triggers, and staff/user accounts
-- DELETE: All driver submissions, payments, agreements, and other test data

-- Disable foreign key checks temporarily
SET session_replication_role = replica;

-- ==================== DELETE TEST DATA ====================

-- 1. Clear driver submissions (test data only)
DELETE FROM driver_submissions;

-- 2. Clear rent-to-own payments (test data only)
DELETE FROM rent_to_own_payments;

-- 3. Clear rent-to-own agreements (test data only)
DELETE FROM rent_to_own_agreements;

-- 4. Clear payments (test data only)
DELETE FROM payments;

-- 5. Clear invoices (test data only)
DELETE FROM invoices;

-- 6. Clear quotations (test data only)
DELETE FROM quotations;

-- 7. Clear jobs (test data only)
DELETE FROM jobs;

-- 8. Clear deliveries (test data only)
DELETE FROM deliveries;

-- 9. Clear mechanic logs (test data only)
DELETE FROM mechanics;

-- 11. Clear driver sessions but keep structure
DELETE FROM driver_sessions;

-- 12. Clear ERP sessions but keep structure
DELETE FROM erp_sessions;

-- ==================== KEEP INTACT ====================
-- ✅ drivers (table structure and any real drivers)
-- ✅ vehicles (table structure and any real vehicles)
-- ✅ staff (keep admin/staff accounts)
-- ✅ erp_users (keep login accounts)
-- ✅ driver_accounts (auto-generated from drivers)
-- ✅ All tables and functions

-- Re-enable foreign key checks
SET session_replication_role = default;

-- ==================== VERIFICATION ====================
SELECT 'Cleanup Complete!' as status;
SELECT COUNT(*) as driver_submissions_count FROM driver_submissions;
SELECT COUNT(*) as rent_to_own_payments_count FROM rent_to_own_payments;
SELECT COUNT(*) as rent_to_own_agreements_count FROM rent_to_own_agreements;
SELECT COUNT(*) as payments_count FROM payments;
