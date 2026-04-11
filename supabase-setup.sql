-- ==============================================
-- BLACKBIRD LOGISTICS ERP — FULL SUPABASE MIGRATION
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ==============================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. DATA TABLES
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

-- 3. AUTH TABLES (private — accessed only via RPCs)
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

-- 4. ROW LEVEL SECURITY
-- Auth tables: locked down (RPCs use SECURITY DEFINER)
ALTER TABLE erp_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_sessions ENABLE ROW LEVEL SECURITY;

-- Data tables: allow anon full access (auth is handled at the UI layer)
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE recruitment ENABLE ROW LEVEL SECURITY;
ALTER TABLE mechanics ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_visits ENABLE ROW LEVEL SECURITY;

-- Permissive policies for all data tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'drivers','vehicles','weekly_logs','jobs','deliveries',
    'payments','invoices','quotations','staff','recruitment',
    'mechanics','clients','website_visits'
  ]) LOOP
    EXECUTE format('CREATE POLICY "Allow all for anon" ON %I FOR ALL TO anon USING (true) WITH CHECK (true)', tbl);
  END LOOP;
END $$;

-- 5. RPC FUNCTIONS

-- Login
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

-- Logout
CREATE OR REPLACE FUNCTION erp_logout(p_token text)
RETURNS json AS $$
BEGIN
  UPDATE erp_sessions SET session_status = 'invalidated' WHERE token = p_token;
  RETURN json_build_object('message', 'Logged out');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Session check (polling)
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

-- Change password
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

-- Dashboard stats
CREATE OR REPLACE FUNCTION dashboard_stats()
RETURNS json AS $$
  SELECT json_build_object(
    'total_drivers', (SELECT count(*) FROM drivers),
    'total_vehicles', (SELECT count(*) FROM vehicles),
    'total_revenue', (SELECT coalesce(sum(weekly_cashing), 0) FROM weekly_logs),
    'active_jobs', (SELECT count(*) FROM jobs WHERE status != 'Completed'),
    'active_routes', (SELECT count(*) FROM deliveries WHERE status IN ('Pending', 'Picked Up', 'In Transit'))
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Monthly revenue
CREATE OR REPLACE FUNCTION monthly_revenue()
RETURNS json AS $$
  SELECT coalesce(json_agg(row_to_json(t)), '[]'::json) FROM (
    SELECT month, sum(weekly_cashing) as revenue
    FROM weekly_logs WHERE weekly_cashing IS NOT NULL
    GROUP BY month ORDER BY month
  ) t;
$$ LANGUAGE sql SECURITY DEFINER;

-- Top drivers
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

-- Dashboard alerts
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
  ) t;
$$ LANGUAGE sql SECURITY DEFINER;

-- Convert quotation to job
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

-- 6. SEED DATA

-- User accounts
INSERT INTO erp_users (role, password_hash) VALUES
  ('ceo', crypt('CEO@1234', gen_salt('bf'))),
  ('hr', crypt('HR@1234', gen_salt('bf'))),
  ('accountant', crypt('ACCT@1234', gen_salt('bf'))),
  ('secretary', crypt('SEC@1234', gen_salt('bf')))
ON CONFLICT (role) DO NOTHING;

-- Drivers (actual company data)
INSERT INTO drivers (name, phone, plate, type, assigned_date, status) VALUES
  ('Emmanuel Chisenga', '773755890', 'CAK 3169 car', 'CAR', '2025-12-29', 'Active'),
  ('Maxwell Chileshe', '974799918', 'CAF 2098 car', 'CAR', '2025-12-30', 'Active'),
  ('Augustine Mutale', '966832664', 'CAE 1892 car', 'CAR', '2026-01-05', 'Active'),
  ('Jonathan', '977749920', 'BBC 1522 car', 'CAR', '2026-01-07', 'Active'),
  ('Rabson Lungu', '977320959', 'CAK 3354 car', 'CAR', '2026-01-08', 'Active'),
  ('Gift Silupumbwe', '571906862', 'CAK 3412 car', 'CAR', '2026-01-09', 'Active'),
  ('Patrick Mwansa', '97977536182', 'CAK 2876 car', 'CAR', '2026-01-09', 'Active'),
  ('Mwenya Mutale', NULL, 'AEB 4721 car', 'CAR', NULL, 'Active'),
  ('Nicholas Kafiso', NULL, 'CAK 3773 Bike', 'BIKE', NULL, 'Active'),
  ('Bernard Zulu', NULL, 'CAK 3907 Bike', 'BIKE', NULL, 'Active'),
  ('Arnold Mulefu', NULL, 'CAK 3775 Bike', 'BIKE', NULL, 'Active'),
  ('Renox Sakala', NULL, 'CAK 3848 Bike', 'BIKE', NULL, 'Active'),
  ('Passmore Liyungu', NULL, 'CAK 3775 Bike', 'BIKE', NULL, 'Active'),
  ('Samon Chipepo', NULL, 'CAK 3906 Bike', 'BIKE', NULL, 'Active'),
  ('Paul Munshya', NULL, 'CAK 3749 Bike', 'BIKE', NULL, 'Active'),
  ('John Phiri', NULL, NULL, 'CAR', '2025-12-27', 'Active')
ON CONFLICT DO NOTHING;

-- Sample quotation
INSERT INTO quotations (customer_name, customer_phone, customer_email, service_type, pickup_location, dropoff_location, estimated_amount, source, status, quote_date) VALUES
  ('Acme Logistics Ltd', '254723000000', 'info@acmelogistics.com', 'Transportation', 'Nairobi CBD', 'Mombasa', 15000, 'Website', 'Pending', '2026-03-19')
ON CONFLICT DO NOTHING;

-- Sample weekly logs
INSERT INTO weekly_logs (driver_id, month, week, days_on_road, weekly_cashing, vehicle_condition, reminder) VALUES
  (1, 0, 1, 5, 5000, 'OK', 'OK'),
  (2, 0, 1, 6, 6200, 'OK', 'OK'),
  (3, 0, 2, 5, 4800, 'OK', 'OK'),
  (4, 0, 2, 7, 7100, 'OK', 'OK'),
  (5, 0, 3, 4, 3900, 'OK', 'OK'),
  (6, 0, 3, 6, 5800, 'OK', 'OK'),
  (7, 1, 1, 5, 5200, 'OK', 'OK'),
  (8, 1, 1, 7, 7300, 'OK', 'OK'),
  (9, 1, 2, 6, 6100, 'OK', 'OK'),
  (10, 1, 2, 5, 4700, 'OK', 'OK')
ON CONFLICT DO NOTHING;
