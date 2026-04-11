-- ==============================================
-- Driver Data Sync Function
-- Syncs drivers from driver_submissions to drivers table
-- Run this in Supabase SQL Editor
-- ==============================================

-- CREATE OR REPLACE FUNCTION sync_drivers_from_submissions()
-- RETURNS json AS $$
-- DECLARE
--   new_drivers_count INT := 0;
--   updated_drivers_count INT := 0;
-- BEGIN
--   -- Add drivers from submissions that don't exist in drivers table
--   WITH new_drivers AS (
--     SELECT DISTINCT ds.driver_id, d.name, d.phone, d.plate
--     FROM driver_submissions ds
--     LEFT JOIN drivers d ON d.id = ds.driver_id
--     WHERE d.id IS NULL AND ds.driver_id IS NOT NULL
--   )
--   INSERT INTO drivers (id, name, phone, plate, type, status)
--   SELECT
--     driver_id,
--     COALESCE(name, 'Driver ' || driver_id),
--     phone,
--     COALESCE(plate, 'PORTAL-' || driver_id),
--     'CAR',
--     'Active'
--   FROM new_drivers
--   ON CONFLICT (id) DO NOTHING;
--
--   GET DIAGNOSTICS new_drivers_count = ROW_COUNT;
--
--   RETURN json_build_object(
--     'message', 'Sync completed',
--     'new_drivers_added', new_drivers_count,
--     'timestamp', now()
--   );
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;

-- Alternative: SQL View approach (simpler, no function needed)
-- This view combines drivers table with submission data

CREATE OR REPLACE VIEW drivers_with_submissions AS
SELECT
  d.id,
  d.name,
  d.phone,
  d.plate,
  d.type,
  d.assigned_date,
  d.status,
  COUNT(DISTINCT ds.id) as submission_count,
  MAX(ds.submission_date) as last_submission,
  COALESCE(SUM(CASE WHEN ds.submission_status = 'Approved' THEN ds.amount ELSE 0 END), 0) as approved_amount,
  COALESCE(SUM(CASE WHEN ds.submission_status = 'Pending' THEN ds.amount ELSE 0 END), 0) as pending_amount
FROM drivers d
LEFT JOIN driver_submissions ds ON d.id = ds.driver_id
GROUP BY d.id, d.name, d.phone, d.plate, d.type, d.assigned_date, d.status;

-- Function to get driver submission history
CREATE OR REPLACE FUNCTION get_driver_submission_history(p_driver_id BIGINT)
RETURNS json AS $$
  SELECT COALESCE(
    json_agg(
      json_build_object(
        'id', id,
        'submission_date', submission_date,
        'amount', amount,
        'week', week,
        'month', month,
        'status', submission_status,
        'notes', notes,
        'approved_by_role', approved_by_role
      ) ORDER BY submission_date DESC
    ),
    '[]'::json
  )
  FROM driver_submissions
  WHERE driver_id = p_driver_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- =====================================================
-- TO USE THIS IN SUPABASE:
-- 1. Run the CREATE VIEW statement above
-- 2. Grant access to the view (if needed)
-- 3. Update erp.html to query this view instead of drivers table
-- =====================================================

-- Example queries:
-- SELECT * FROM drivers_with_submissions WHERE submission_count > 0;
-- SELECT * FROM get_driver_submission_history(1);
