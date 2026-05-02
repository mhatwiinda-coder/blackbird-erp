-- =====================================================
-- MIGRATION: Add driver_id column to payments table
-- This enables manual payment recording with driver association
-- Run this in Supabase SQL Editor
-- =====================================================

-- Add driver_id column to payments table
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS driver_id BIGINT REFERENCES drivers(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payments_driver_id ON payments(driver_id);

-- Create index for payer_name lookups (for legacy payments without driver_id)
CREATE INDEX IF NOT EXISTS idx_payments_payer_name ON payments(payer_name);

-- Verify the migration
-- Run this SELECT to check the new column:
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'payments'
-- ORDER BY ordinal_position;
