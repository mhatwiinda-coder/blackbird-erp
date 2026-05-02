-- =====================================================
-- CRITICAL FIX: Add missing columns to rent_to_own_payments
-- This script MUST be run in Supabase SQL Editor
-- =====================================================

-- Check if column exists before adding (Supabase safe approach)
ALTER TABLE rent_to_own_payments
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending';

-- Add other missing columns if needed
ALTER TABLE rent_to_own_payments
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

ALTER TABLE rent_to_own_payments
ADD COLUMN IF NOT EXISTS driver_name TEXT;

ALTER TABLE rent_to_own_payments
ADD COLUMN IF NOT EXISTS vehicle_plate TEXT;

-- Verify the table structure
-- Run this SELECT to verify all columns exist:
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'rent_to_own_payments'
-- ORDER BY ordinal_position;
