-- =====================================================
-- COMPLETE CLEANUP - Delete ALL test data
-- KEEP: Only tables, functions, staff/admin accounts
-- =====================================================

-- Disable foreign key checks temporarily
SET session_replication_role = replica;

-- ==================== DELETE ALL DATA ====================

-- 1. Clear ALL driver submissions
DELETE FROM driver_submissions;

-- 2. Clear ALL rent-to-own payments
DELETE FROM rent_to_own_payments;

-- 3. Clear ALL rent-to-own agreements
DELETE FROM rent_to_own_agreements;

-- 4. Clear ALL payments
DELETE FROM payments;

-- 5. Clear ALL invoices
DELETE FROM invoices;

-- 6. Clear ALL quotations
DELETE FROM quotations;

-- 7. Clear ALL jobs
DELETE FROM jobs;

-- 8. Clear ALL deliveries
DELETE FROM deliveries;

-- 9. Clear ALL mechanics logs
DELETE FROM mechanics;

-- 10. Clear ALL weekly logs
DELETE FROM weekly_logs;

-- 11. Clear ALL vehicles
DELETE FROM vehicles;

-- 12. Clear ALL drivers (including driver accounts)
DELETE FROM driver_accounts;
DELETE FROM driver_sessions;
DELETE FROM drivers;

-- 13. Clear ALL recruitment
DELETE FROM recruitment;

-- 14. Clear ALL clients
DELETE FROM clients;

-- 15. Clear sessions
DELETE FROM driver_sessions;
DELETE FROM erp_sessions;

-- ==================== KEEP INTACT ====================
-- ✅ staff (admin staff accounts)
-- ✅ erp_users (admin login accounts)
-- ✅ All tables structure
-- ✅ All functions and triggers

-- Re-enable foreign key checks
SET session_replication_role = default;

-- ==================== VERIFICATION ====================
SELECT 'COMPLETE CLEANUP FINISHED!' as status;
SELECT COUNT(*) as drivers FROM drivers;
SELECT COUNT(*) as vehicles FROM vehicles;
SELECT COUNT(*) as driver_submissions FROM driver_submissions;
SELECT COUNT(*) as payments FROM payments;
SELECT COUNT(*) as jobs FROM jobs;
SELECT COUNT(*) as deliveries FROM deliveries;
SELECT COUNT(*) as staff FROM staff;
SELECT COUNT(*) as erp_users FROM erp_users;

-- All counts should be 0 except staff and erp_users which should be 4 each
