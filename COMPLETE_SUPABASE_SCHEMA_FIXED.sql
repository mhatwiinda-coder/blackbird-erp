-- ==============================================
-- BLACKBIRD LOGISTICS ERP — COMPLETE SUPABASE SCHEMA (FIXED)
-- Fixed version: Skips duplicate RLS policies
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ==============================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==================== DATA TABLES ====================

-- 2.1 EXISTING DATA TABLES (IF NOT EXISTS)
-- These will be skipped if they already exist

CREATE TABLE IF NOT EXISTS drivers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  plate TEXT,
  type TEXT NOT NULL,
  assigned_date TEXT,
  national_id TEXT,
  license_number TEXT,
  status TEXT DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vehicles (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  plate TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  make_model TEXT,
  assigned_driver_id BIGINT REFERENCES drivers(id) ON DELETE SET NULL,
  vehicle_condition TEXT DEFAULT 'OK',
  road_tax_due TEXT,
  insurance_due TEXT,
  service_due_km INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS weekly_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  driver_id BIGINT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  vehicle_id BIGINT REFERENCES vehicles(id) ON DELETE SET NULL,
  month INTEGER NOT NULL,
  week INTEGER NOT NULL,
  days_on_road INTEGER,
  start_mileage INTEGER,
  end_mileage INTEGER,
  weekly_cashing DECIMAL(10,2),
  vehicle_condition TEXT DEFAULT 'OK',
  reminder TEXT DEFAULT 'OK',
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jobs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  client_name TEXT NOT NULL,
  service_type TEXT NOT NULL,
  driver_id BIGINT REFERENCES drivers(id) ON DELETE SET NULL,
  pickup_location TEXT,
  dropoff_location TEXT,
  job_date TEXT,
  amount DECIMAL(10,2),
  status TEXT DEFAULT 'Pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS deliveries (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tracking_number TEXT UNIQUE,
  sender_name TEXT NOT NULL,
  sender_phone TEXT,
  recipient_name TEXT NOT NULL,
  recipient_phone TEXT,
  pickup_location TEXT,
  dropoff_location TEXT,
  rider_id BIGINT REFERENCES drivers(id) ON DELETE SET NULL,
  weight_kg DECIMAL(10,2),
  amount DECIMAL(10,2),
  status TEXT DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  payment_date TEXT NOT NULL,
  payer_name TEXT NOT NULL,
  payment_type TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(10,2) NOT NULL,
  week INTEGER,
  payment_status TEXT DEFAULT 'Paid',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clients (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  client_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoices (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  invoice_number TEXT UNIQUE,
  client_id BIGINT REFERENCES clients(id) ON DELETE SET NULL,
  invoice_date TEXT,
  due_date TEXT,
  amount DECIMAL(10,2),
  description TEXT,
  status TEXT DEFAULT 'Unpaid',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quotations (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  service_type TEXT NOT NULL,
  pickup_location TEXT,
  dropoff_location TEXT,
  estimated_amount DECIMAL(10,2),
  source TEXT DEFAULT 'Website',
  status TEXT DEFAULT 'Pending',
  notes TEXT,
  quote_date TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS staff (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  start_date TEXT,
  salary DECIMAL(10,2),
  performance TEXT DEFAULT 'Good',
  employment_status TEXT DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recruitment (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  applicant_name TEXT NOT NULL,
  position_applied TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  applied_date TEXT,
  pipeline_stage TEXT DEFAULT 'Applied',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mechanics (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  service_date TEXT,
  vehicle_id BIGINT REFERENCES vehicles(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  mechanic_name TEXT,
  cost DECIMAL(10,2),
  next_service_due TEXT,
  maintenance_status TEXT DEFAULT 'Completed',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS website_visits (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  page TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  referrer TEXT,
  visited_at TIMESTAMPTZ DEFAULT now()
);

-- ==================== NEW DRIVER PORTAL TABLES ====================

-- 2.4 DRIVER PORTAL TABLES (NEW!)
-- These are definitely new, so no risk of duplicates

CREATE TABLE IF NOT EXISTS driver_submissions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  driver_id BIGINT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  submission_date TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  week INTEGER,
  month INTEGER,
  notes TEXT,
  submission_type TEXT DEFAULT 'weekly',  -- 'weekly' or 'rto' (rent-to-own)
  agreement_id BIGINT REFERENCES rent_to_own_agreements(id) ON DELETE SET NULL,  -- For RTO submissions
  submission_status TEXT DEFAULT 'Pending',
  approved_by_staff_id BIGINT REFERENCES staff(id) ON DELETE SET NULL,
  approved_by_role TEXT,
  approval_date TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rent_to_own_agreements (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  driver_id BIGINT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  vehicle_id BIGINT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  total_price DECIMAL(10,2) NOT NULL,
  paid_amount DECIMAL(10,2) DEFAULT 0,
  remaining_balance DECIMAL(10,2) NOT NULL,
  agreement_status TEXT DEFAULT 'Active',
  agreement_date TEXT NOT NULL,
  ownership_transferred BOOLEAN DEFAULT FALSE,
  ownership_transferred_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rent_to_own_payments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  agreement_id BIGINT NOT NULL REFERENCES rent_to_own_agreements(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_date TEXT NOT NULL,
  payment_method TEXT DEFAULT 'Weekly Cashing',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==================== AUTH TABLES ====================

CREATE TABLE IF NOT EXISTS erp_users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  role TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS erp_sessions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_role TEXT NOT NULL UNIQUE,
  token TEXT NOT NULL,
  device_info TEXT,
  logged_in_at TIMESTAMPTZ DEFAULT now(),
  last_activity TIMESTAMPTZ DEFAULT now(),
  session_status TEXT DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS driver_accounts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  driver_id BIGINT UNIQUE NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS driver_sessions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  driver_id BIGINT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  device_info TEXT,
  logged_in_at TIMESTAMPTZ DEFAULT now(),
  last_activity TIMESTAMPTZ DEFAULT now(),
  session_status TEXT DEFAULT 'active'
);

-- ==================== RLS FOR NEW TABLES ONLY ====================

-- Enable RLS only on NEW tables (existing tables already have RLS)
ALTER TABLE driver_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rent_to_own_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE rent_to_own_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_sessions ENABLE ROW LEVEL SECURITY;

-- Permissive policies for new data tables
CREATE POLICY "Allow all for anon" ON driver_submissions FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON rent_to_own_agreements FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON rent_to_own_payments FOR ALL TO anon USING (true) WITH CHECK (true);

-- Restrict auth tables (RPCs use SECURITY DEFINER)
CREATE POLICY "Restrict driver_accounts to RPC only" ON driver_accounts FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY "Restrict driver_sessions to RPC only" ON driver_sessions FOR ALL USING (false) WITH CHECK (false);

-- ==================== RPC FUNCTIONS ====================

-- 5.1 ERP STAFF LOGIN
CREATE OR REPLACE FUNCTION erp_login(p_role text, p_password text, p_device text DEFAULT '')
RETURNS json AS $$
DECLARE
  usr erp_users%ROWTYPE;
  new_token text;
  has_conflict boolean := false;
  other_users json;
BEGIN
  SELECT * INTO usr FROM erp_users WHERE role = lower(p_role);
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Invalid role or password');
  END IF;
  IF usr.password_hash != crypt(p_password, usr.password_hash) THEN
    RETURN json_build_object('error', 'Invalid role or password');
  END IF;

  new_token := gen_random_uuid()::text;

  IF EXISTS (SELECT 1 FROM erp_sessions WHERE user_role = lower(p_role) AND session_status = 'active') THEN
    has_conflict := true;
  END IF;

  INSERT INTO erp_sessions (user_role, token, device_info, session_status)
  VALUES (lower(p_role), new_token, p_device, 'active')
  ON CONFLICT (user_role) DO UPDATE SET
    token = new_token, device_info = p_device,
    logged_in_at = now(), last_activity = now(), session_status = 'active';

  SELECT json_agg(user_role) INTO other_users
  FROM erp_sessions WHERE user_role != lower(p_role) AND session_status = 'active';

  RETURN json_build_object(
    'token', new_token,
    'role', usr.role,
    'hasConflict', has_conflict,
    'anotherUserActive', other_users IS NOT NULL,
    'activeUsers', COALESCE(other_users, '[]'::json),
    'message', 'Login successful'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION erp_logout(p_token text)
RETURNS json AS $$
BEGIN
  UPDATE erp_sessions SET session_status = 'invalidated' WHERE token = p_token;
  RETURN json_build_object('message', 'Logged out');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION erp_session_check(p_token text)
RETURNS json AS $$
DECLARE
  sess erp_sessions%ROWTYPE;
  other_users json;
BEGIN
  SELECT * INTO sess FROM erp_sessions WHERE token = p_token;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Session not found', 'status', 'expired');
  END IF;
  IF sess.session_status = 'invalidated' THEN
    RETURN json_build_object('error', 'Session invalidated', 'status', 'invalidated', 'conflict', true);
  END IF;

  UPDATE erp_sessions SET last_activity = now() WHERE token = p_token;

  SELECT json_agg(user_role) INTO other_users
  FROM erp_sessions WHERE user_role != sess.user_role AND session_status = 'active';

  RETURN json_build_object(
    'status', 'active',
    'role', sess.user_role,
    'conflict', false,
    'anotherUserActive', other_users IS NOT NULL,
    'activeUsers', COALESCE(other_users, '[]'::json)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION erp_change_password(p_role text, p_current text, p_new text)
RETURNS json AS $$
DECLARE
  usr erp_users%ROWTYPE;
BEGIN
  SELECT * INTO usr FROM erp_users WHERE role = lower(p_role);
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'User not found');
  END IF;
  IF usr.password_hash != crypt(p_current, usr.password_hash) THEN
    RETURN json_build_object('error', 'Current password is incorrect');
  END IF;
  IF length(p_new) < 6 THEN
    RETURN json_build_object('error', 'New password must be at least 6 characters');
  END IF;
  UPDATE erp_users SET password_hash = crypt(p_new, gen_salt('bf')) WHERE role = lower(p_role);
  UPDATE erp_sessions SET session_status = 'invalidated' WHERE user_role = lower(p_role);
  RETURN json_build_object('message', 'Password changed successfully. Please log in again.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.2 DRIVER PORTAL LOGIN (NEW!)
CREATE OR REPLACE FUNCTION driver_login(p_driver_id bigint, p_password text)
RETURNS json AS $$
DECLARE
  driver_account driver_accounts%ROWTYPE;
  driver_info drivers%ROWTYPE;
  new_token text;
BEGIN
  SELECT * INTO driver_account FROM driver_accounts WHERE driver_id = p_driver_id;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Invalid driver ID or password');
  END IF;

  IF driver_account.password_hash != crypt(p_password, driver_account.password_hash) THEN
    RETURN json_build_object('error', 'Invalid driver ID or password');
  END IF;

  IF NOT driver_account.is_active THEN
    RETURN json_build_object('error', 'Driver account is inactive');
  END IF;

  SELECT * INTO driver_info FROM drivers WHERE id = p_driver_id;

  new_token := gen_random_uuid()::text;

  INSERT INTO driver_sessions (driver_id, token, session_status)
  VALUES (p_driver_id, new_token, 'active');

  UPDATE driver_accounts SET last_login = now() WHERE driver_id = p_driver_id;

  RETURN json_build_object(
    'token', new_token,
    'driverId', driver_info.id,
    'driverName', driver_info.name,
    'driverPhone', driver_info.phone,
    'driverType', driver_info.type,
    'message', 'Login successful'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION driver_logout(p_token text)
RETURNS json AS $$
BEGIN
  UPDATE driver_sessions SET session_status = 'invalidated' WHERE token = p_token;
  RETURN json_build_object('message', 'Logged out');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.3 BUSINESS LOGIC FUNCTIONS
CREATE OR REPLACE FUNCTION dashboard_stats()
RETURNS json AS $$
  SELECT json_build_object(
    'total_drivers', (SELECT count(*) FROM drivers),
    'total_vehicles', (SELECT count(*) FROM vehicles),
    'total_revenue', (SELECT coalesce(sum(weekly_cashing), 0) FROM weekly_logs),
    'active_jobs', (SELECT count(*) FROM jobs WHERE status != 'Completed'),
    'active_routes', (SELECT count(*) FROM deliveries WHERE status IN ('Pending', 'Picked Up', 'In Transit')),
    'pending_submissions', (SELECT count(*) FROM driver_submissions WHERE submission_status = 'Pending'),
    'active_rent_to_own', (SELECT count(*) FROM rent_to_own_agreements WHERE agreement_status = 'Active')
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION monthly_revenue()
RETURNS json AS $$
  SELECT coalesce(json_agg(row_to_json(t)), '[]'::json) FROM (
    SELECT month, sum(weekly_cashing) as revenue
    FROM weekly_logs WHERE weekly_cashing IS NOT NULL
    GROUP BY month ORDER BY month
  ) t;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION top_drivers()
RETURNS json AS $$
  SELECT coalesce(json_agg(row_to_json(t)), '[]'::json) FROM (
    SELECT d.id, d.name, d.type,
           coalesce(sum(wl.weekly_cashing), 0) as total_earnings,
           count(distinct wl.id) as logged_weeks
    FROM drivers d LEFT JOIN weekly_logs wl ON d.id = wl.driver_id
    GROUP BY d.id, d.name, d.type
    ORDER BY total_earnings DESC LIMIT 10
  ) t;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION dashboard_alerts()
RETURNS json AS $$
  SELECT coalesce(json_agg(row_to_json(t)), '[]'::json) FROM (
    SELECT 'vehicle_condition'::text as type, id as vehicle_id, plate,
           'Vehicle ' || plate || ' needs attention' as message, vehicle_condition as status
    FROM vehicles WHERE vehicle_condition IN ('Needs Service', 'Under Repair')
    UNION ALL
    SELECT 'log_reminder'::text, driver_id, NULL,
           'Week ' || week || ' of month ' || month || ' has active reminder', 'Pending'
    FROM weekly_logs WHERE reminder = 'FALSE'
    UNION ALL
    SELECT 'pending_submission'::text, driver_id, NULL,
           'Payment submission pending approval', submission_status
    FROM driver_submissions WHERE submission_status = 'Pending'
  ) t;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION convert_quote_to_job(quote_id bigint)
RETURNS json AS $$
DECLARE
  q quotations%ROWTYPE;
  new_job_id bigint;
BEGIN
  SELECT * INTO q FROM quotations WHERE id = quote_id;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Quotation not found');
  END IF;
  INSERT INTO jobs (client_name, service_type, pickup_location, dropoff_location, amount, status, notes)
  VALUES (q.customer_name, q.service_type, q.pickup_location, q.dropoff_location, q.estimated_amount, 'Pending', q.notes)
  RETURNING id INTO new_job_id;
  UPDATE quotations SET status = 'Converted' WHERE id = quote_id;
  RETURN json_build_object('jobId', new_job_id, 'message', 'Quotation converted to job');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.4 DRIVER SUBMISSION APPROVAL (NEW!)
CREATE OR REPLACE FUNCTION approve_driver_submission(p_submission_id bigint, p_staff_id bigint, p_role text)
RETURNS json AS $$
DECLARE
  sub driver_submissions%ROWTYPE;
  new_payment_id bigint;
BEGIN
  SELECT * INTO sub FROM driver_submissions WHERE id = p_submission_id;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Submission not found');
  END IF;

  IF sub.submission_status != 'Pending' THEN
    RETURN json_build_object('error', 'Submission has already been processed');
  END IF;

  UPDATE driver_submissions
  SET submission_status = 'Approved',
      approved_by_staff_id = p_staff_id,
      approved_by_role = p_role,
      approval_date = now()
  WHERE id = p_submission_id;

  INSERT INTO payments (payment_date, payer_name, payment_type, amount, week, payment_status)
  SELECT submission_date, (SELECT name FROM drivers WHERE id = sub.driver_id),
         'Driver Weekly Cashing', amount, week, 'Paid'
  FROM driver_submissions WHERE id = p_submission_id
  RETURNING id INTO new_payment_id;

  RETURN json_build_object(
    'message', 'Submission approved',
    'paymentId', new_payment_id,
    'submissionId', p_submission_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.5 RENT-TO-OWN PAYMENT PROCESSING (NEW!)
CREATE OR REPLACE FUNCTION process_rent_to_own_payment(p_agreement_id bigint, p_payment_amount decimal)
RETURNS json AS $$
DECLARE
  agreement rent_to_own_agreements%ROWTYPE;
  new_balance decimal;
BEGIN
  SELECT * INTO agreement FROM rent_to_own_agreements WHERE id = p_agreement_id;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Agreement not found');
  END IF;

  IF agreement.agreement_status != 'Active' THEN
    RETURN json_build_object('error', 'Agreement is not active');
  END IF;

  new_balance := agreement.remaining_balance - p_payment_amount;

  INSERT INTO rent_to_own_payments (agreement_id, amount, payment_date)
  VALUES (p_agreement_id, p_payment_amount, to_char(now(), 'YYYY-MM-DD'));

  IF new_balance <= 0 THEN
    UPDATE rent_to_own_agreements
    SET paid_amount = agreement.total_price,
        remaining_balance = 0,
        agreement_status = 'Completed',
        ownership_transferred = TRUE,
        ownership_transferred_date = now()
    WHERE id = p_agreement_id;

    RETURN json_build_object(
      'message', 'Payment processed - Agreement completed!',
      'agreementId', p_agreement_id,
      'ownershipTransferred', TRUE,
      'remainingBalance', 0
    );
  ELSE
    UPDATE rent_to_own_agreements
    SET paid_amount = agreement.paid_amount + p_payment_amount,
        remaining_balance = new_balance
    WHERE id = p_agreement_id;

    RETURN json_build_object(
      'message', 'Payment processed successfully',
      'agreementId', p_agreement_id,
      'remainingBalance', new_balance,
      'ownershipTransferred', FALSE
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================== SEED DATA ====================

-- 6.1 ERP STAFF ACCOUNTS
INSERT INTO erp_users (role, password_hash) VALUES
  ('ceo', crypt('CEO@1234', gen_salt('bf'))),
  ('hr', crypt('HR@1234', gen_salt('bf'))),
  ('accountant', crypt('ACCT@1234', gen_salt('bf'))),
  ('secretary', crypt('SEC@1234', gen_salt('bf')))
ON CONFLICT (role) DO NOTHING;

-- 6.2 STAFF DATA
INSERT INTO staff (full_name, role, email, start_date, employment_status) VALUES
  ('CEO Account', 'CEO', 'ceo@blackbird.com', '2025-01-01', 'Active'),
  ('HR Manager', 'HR', 'hr@blackbird.com', '2025-01-02', 'Active'),
  ('Finance Manager', 'Accountant', 'accounts@blackbird.com', '2025-01-03', 'Active'),
  ('Secretary', 'Secretary', 'secretary@blackbird.com', '2025-01-04', 'Active')
ON CONFLICT DO NOTHING;

-- 6.3 DRIVER ACCOUNTS (passwords: FirstName@123)
INSERT INTO driver_accounts (driver_id, password_hash, is_active)
SELECT id, crypt(CONCAT(name, '@123'), gen_salt('bf')), TRUE
FROM drivers
WHERE id NOT IN (SELECT driver_id FROM driver_accounts WHERE driver_id IS NOT NULL)
ON CONFLICT DO NOTHING;

-- ==================== SUMMARY ====================
-- New tables created:
-- ✅ driver_submissions
-- ✅ rent_to_own_agreements
-- ✅ rent_to_own_payments
-- ✅ driver_accounts
-- ✅ driver_sessions
--
-- New functions created:
-- ✅ driver_login()
-- ✅ driver_logout()
-- ✅ approve_driver_submission()
-- ✅ process_rent_to_own_payment()
-- ✅ Updated: dashboard_alerts()
--
-- Status: ✅ COMPLETE
-- ==================================================
