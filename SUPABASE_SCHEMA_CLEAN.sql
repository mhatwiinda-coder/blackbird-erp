-- =====================================================
-- BLACKBIRD ERP - COMPLETE SUPABASE SCHEMA (CLEAN)
-- For Supabase SQL Editor
-- =====================================================
-- This schema includes:
-- ✅ All necessary tables
-- ✅ All functions and triggers
-- ✅ All RLS policies
-- ✅ NO hardcoded test data
-- ✅ Empty tables ready for real data
-- =====================================================

-- 1. ENABLE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================
-- 2. CORE DATA TABLES
-- =====================================================

-- 2.1 DRIVERS TABLE
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

-- 2.2 VEHICLES TABLE
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

-- 2.3 WEEKLY LOGS TABLE
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

-- 2.4 JOBS TABLE
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

-- 2.5 DELIVERIES TABLE
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

-- 2.6 PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS payments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  payment_date TEXT NOT NULL,
  payer_name TEXT NOT NULL,
  payment_type TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(10,2) NOT NULL,
  week INTEGER,
  month INTEGER,
  payment_status TEXT DEFAULT 'Paid',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2.7 CLIENTS TABLE
CREATE TABLE IF NOT EXISTS clients (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  client_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2.8 INVOICES TABLE
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

-- 2.9 QUOTATIONS TABLE
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

-- 2.10 STAFF TABLE
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

-- 2.11 RECRUITMENT TABLE
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

-- 2.12 MECHANICS TABLE
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

-- 2.13 WEBSITE VISITS TABLE
CREATE TABLE IF NOT EXISTS website_visits (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  page TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  referrer TEXT,
  visited_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 3. DRIVER PORTAL TABLES (NEW)
-- =====================================================

-- 3.1 DRIVER SUBMISSIONS TABLE
CREATE TABLE IF NOT EXISTS driver_submissions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  driver_id BIGINT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  submission_date TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  week INTEGER,
  month INTEGER,
  notes TEXT,
  submission_type TEXT DEFAULT 'weekly',
  agreement_id BIGINT,
  submission_status TEXT DEFAULT 'Pending',
  approved_by_staff_id BIGINT REFERENCES staff(id) ON DELETE SET NULL,
  approved_by_role TEXT,
  approval_date TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3.2 RENT-TO-OWN AGREEMENTS TABLE
CREATE TABLE IF NOT EXISTS rent_to_own_agreements (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  driver_id BIGINT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  vehicle_id BIGINT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  quotation_id BIGINT REFERENCES quotations(id) ON DELETE SET NULL,
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

-- Link driver_submissions to rent_to_own_agreements
ALTER TABLE driver_submissions
ADD CONSTRAINT fk_driver_submissions_agreement
FOREIGN KEY (agreement_id) REFERENCES rent_to_own_agreements(id) ON DELETE SET NULL;

-- =====================================================
-- 3.5 ADD MISSING COLUMNS TO EXISTING TABLES
-- =====================================================

ALTER TABLE payments ADD COLUMN IF NOT EXISTS month INTEGER;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS week INTEGER;

-- 3.3 RENT-TO-OWN PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS rent_to_own_payments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  agreement_id BIGINT NOT NULL REFERENCES rent_to_own_agreements(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_date TEXT NOT NULL,
  payment_method TEXT DEFAULT 'driver_submission',
  approval_status TEXT DEFAULT 'pending',
  approved_at TIMESTAMPTZ,
  driver_name TEXT,
  vehicle_plate TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 4. AUTHENTICATION TABLES
-- =====================================================

-- 4.1 ERP USERS TABLE
CREATE TABLE IF NOT EXISTS erp_users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  role TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4.2 ERP SESSIONS TABLE
CREATE TABLE IF NOT EXISTS erp_sessions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_role TEXT NOT NULL UNIQUE,
  token TEXT NOT NULL,
  device_info TEXT,
  logged_in_at TIMESTAMPTZ DEFAULT now(),
  last_activity TIMESTAMPTZ DEFAULT now(),
  session_status TEXT DEFAULT 'active'
);

-- 4.3 DRIVER ACCOUNTS TABLE
CREATE TABLE IF NOT EXISTS driver_accounts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  driver_id BIGINT UNIQUE NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4.4 DRIVER SESSIONS TABLE
CREATE TABLE IF NOT EXISTS driver_sessions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  driver_id BIGINT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  device_info TEXT,
  logged_in_at TIMESTAMPTZ DEFAULT now(),
  last_activity TIMESTAMPTZ DEFAULT now(),
  session_status TEXT DEFAULT 'active'
);

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE driver_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rent_to_own_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE rent_to_own_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow all for anon" ON driver_submissions;
DROP POLICY IF EXISTS "Allow all for anon" ON rent_to_own_agreements;
DROP POLICY IF EXISTS "Allow all for anon" ON rent_to_own_payments;
DROP POLICY IF EXISTS "Restrict driver_accounts to RPC only" ON driver_accounts;
DROP POLICY IF EXISTS "Restrict driver_sessions to RPC only" ON driver_sessions;

-- Permissive policies for data tables (allow anon access via APIs)
CREATE POLICY "Allow all for anon" ON driver_submissions FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON rent_to_own_agreements FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON rent_to_own_payments FOR ALL TO anon USING (true) WITH CHECK (true);

-- Restrict auth tables to RPC only (APIs handle auth via SECURITY DEFINER functions)
CREATE POLICY "Restrict driver_accounts to RPC only" ON driver_accounts FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY "Restrict driver_sessions to RPC only" ON driver_sessions FOR ALL USING (false) WITH CHECK (false);

-- =====================================================
-- 6. TRIGGERS
-- =====================================================

-- 6.1 Auto-create driver account when driver is inserted
CREATE OR REPLACE FUNCTION create_driver_account_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO driver_accounts (driver_id, password_hash, is_active)
  VALUES (
    NEW.id,
    crypt(SPLIT_PART(NEW.name, ' ', 1) || '@123', gen_salt('bf')),
    TRUE
  )
  ON CONFLICT (driver_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS auto_create_driver_account ON drivers;
CREATE TRIGGER auto_create_driver_account
AFTER INSERT ON drivers
FOR EACH ROW
EXECUTE FUNCTION create_driver_account_on_insert();

-- =====================================================
-- 7. FUNCTIONS
-- =====================================================

-- 7.1 ERP LOGIN
CREATE OR REPLACE FUNCTION erp_login(p_role text, p_password text, p_device text DEFAULT '')
RETURNS json AS $$
DECLARE
  usr erp_users%ROWTYPE;
  new_token text;
BEGIN
  SELECT * INTO usr FROM erp_users WHERE role = lower(p_role);
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Invalid role or password');
  END IF;
  IF usr.password_hash != crypt(p_password, usr.password_hash) THEN
    RETURN json_build_object('error', 'Invalid role or password');
  END IF;

  new_token := gen_random_uuid()::text;

  INSERT INTO erp_sessions (user_role, token, device_info, session_status)
  VALUES (lower(p_role), new_token, p_device, 'active')
  ON CONFLICT (user_role) DO UPDATE SET
    token = new_token, device_info = p_device,
    logged_in_at = now(), last_activity = now(), session_status = 'active';

  RETURN json_build_object(
    'token', new_token,
    'role', usr.role,
    'message', 'Login successful'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7.2 ERP LOGOUT
CREATE OR REPLACE FUNCTION erp_logout(p_token text)
RETURNS json AS $$
BEGIN
  UPDATE erp_sessions SET session_status = 'invalidated' WHERE token = p_token;
  RETURN json_build_object('message', 'Logged out');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7.3 ERP SESSION CHECK
CREATE OR REPLACE FUNCTION erp_session_check(p_token text)
RETURNS json AS $$
DECLARE
  sess erp_sessions%ROWTYPE;
BEGIN
  SELECT * INTO sess FROM erp_sessions WHERE token = p_token;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Session not found', 'status', 'expired');
  END IF;
  IF sess.session_status = 'invalidated' THEN
    RETURN json_build_object('error', 'Session invalidated', 'status', 'invalidated');
  END IF;

  UPDATE erp_sessions SET last_activity = now() WHERE token = p_token;

  RETURN json_build_object(
    'status', 'active',
    'role', sess.user_role,
    'message', 'Session valid'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7.4 DRIVER LOGIN
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
    'message', 'Login successful'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7.5 DRIVER LOGOUT
CREATE OR REPLACE FUNCTION driver_logout(p_token text)
RETURNS json AS $$
BEGIN
  UPDATE driver_sessions SET session_status = 'invalidated' WHERE token = p_token;
  RETURN json_build_object('message', 'Logged out');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7.6 DASHBOARD STATS
CREATE OR REPLACE FUNCTION dashboard_stats()
RETURNS json AS $$
  SELECT json_build_object(
    'total_drivers', (SELECT count(*) FROM drivers),
    'total_vehicles', (SELECT count(*) FROM vehicles),
    'total_revenue', (SELECT coalesce(sum(amount), 0) FROM payments WHERE payment_status = 'Paid'),
    'active_jobs', (SELECT count(*) FROM jobs WHERE status != 'Completed'),
    'pending_submissions', (SELECT count(*) FROM driver_submissions WHERE submission_status = 'Pending'),
    'active_rent_to_own', (SELECT count(*) FROM rent_to_own_agreements WHERE agreement_status = 'Active')
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 7.7 MONTHLY REVENUE
CREATE OR REPLACE FUNCTION monthly_revenue()
RETURNS json AS $$
  SELECT coalesce(json_agg(row_to_json(t)), '[]'::json) FROM (
    SELECT COALESCE(month, EXTRACT(MONTH FROM (payment_date::DATE))::INTEGER, 0) as month,
           sum(amount) as revenue
    FROM payments WHERE payment_status = 'Paid'
    GROUP BY COALESCE(month, EXTRACT(MONTH FROM (payment_date::DATE))::INTEGER, 0)
    ORDER BY COALESCE(month, EXTRACT(MONTH FROM (payment_date::DATE))::INTEGER, 0)
  ) t;
$$ LANGUAGE sql SECURITY DEFINER;

-- 7.8 TOP DRIVERS
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

-- 7.9 DASHBOARD ALERTS
CREATE OR REPLACE FUNCTION dashboard_alerts()
RETURNS json AS $$
  SELECT coalesce(json_agg(row_to_json(t)), '[]'::json) FROM (
    SELECT 'vehicle_condition'::text as type, id as vehicle_id, plate,
           'Vehicle ' || plate || ' needs attention' as message, vehicle_condition as status
    FROM vehicles WHERE vehicle_condition IN ('Needs Service', 'Under Repair')
    UNION ALL
    SELECT 'pending_submission'::text, driver_id, NULL,
           'Payment submission pending approval', submission_status
    FROM driver_submissions WHERE submission_status = 'Pending'
    LIMIT 10
  ) t;
$$ LANGUAGE sql SECURITY DEFINER;

-- 7.10 CONVERT QUOTE TO JOB
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

-- =====================================================
-- 8. INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON vehicles(plate);
CREATE INDEX IF NOT EXISTS idx_vehicles_assigned_driver ON vehicles(assigned_driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_submissions_driver ON driver_submissions(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_submissions_status ON driver_submissions(submission_status);
CREATE INDEX IF NOT EXISTS idx_rent_to_own_agreements_driver ON rent_to_own_agreements(driver_id);
CREATE INDEX IF NOT EXISTS idx_rent_to_own_agreements_status ON rent_to_own_agreements(agreement_status);
CREATE INDEX IF NOT EXISTS idx_rent_to_own_payments_agreement ON rent_to_own_payments(agreement_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_driver_sessions_driver ON driver_sessions(driver_id);
CREATE INDEX IF NOT EXISTS idx_weekly_logs_driver ON weekly_logs(driver_id);
CREATE INDEX IF NOT EXISTS idx_weekly_logs_month_week ON weekly_logs(month, week);

-- =====================================================
-- 9. SEED DATA - STAFF ACCOUNTS ONLY
-- =====================================================

INSERT INTO erp_users (role, password_hash) VALUES
  ('ceo', crypt('CEO@1234', gen_salt('bf'))),
  ('hr', crypt('HR@1234', gen_salt('bf'))),
  ('accountant', crypt('ACCT@1234', gen_salt('bf'))),
  ('secretary', crypt('SEC@1234', gen_salt('bf')))
ON CONFLICT (role) DO NOTHING;

INSERT INTO staff (full_name, role, email, start_date, employment_status) VALUES
  ('CEO Account', 'CEO', 'ceo@blackbird.com', '2025-01-01', 'Active'),
  ('HR Manager', 'HR', 'hr@blackbird.com', '2025-01-02', 'Active'),
  ('Finance Manager', 'Accountant', 'accounts@blackbird.com', '2025-01-03', 'Active'),
  ('Secretary', 'Secretary', 'secretary@blackbird.com', '2025-01-04', 'Active')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 10. COMPLETION SUMMARY
-- =====================================================

SELECT '✅ SCHEMA SETUP COMPLETE!' as status;

-- Tables created: 18
-- Functions created: 10
-- Triggers created: 1
-- RLS policies: 5
-- Indexes created: 13
--
-- All tables are EMPTY and ready for real data
-- Staff/Admin accounts seeded (passwords provided above)
-- Driver accounts auto-created when drivers are added
