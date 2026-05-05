-- =====================================================
-- DIAGNOSTIC: Check RLS policies on payments table
-- Run in Supabase SQL Editor
-- =====================================================

-- Check if RLS is enabled on payments table
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'payments';

-- List all RLS policies on payments table
SELECT
  policyname,
  poltype,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'payments'
ORDER BY policyname;

-- Check if there are ANY policies on payments
SELECT COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'payments';
