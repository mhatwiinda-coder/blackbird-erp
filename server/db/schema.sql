-- Users/Authentication Table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Drivers & Riders
CREATE TABLE IF NOT EXISTS drivers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  plate TEXT,
  type TEXT NOT NULL,
  assigned_date TEXT,
  national_id TEXT,
  license_number TEXT,
  status TEXT DEFAULT 'Active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Vehicles/Fleet
CREATE TABLE IF NOT EXISTS vehicles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plate TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  make_model TEXT,
  assigned_driver_id INTEGER,
  vehicle_condition TEXT DEFAULT 'OK',
  road_tax_due TEXT,
  insurance_due TEXT,
  service_due_km INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assigned_driver_id) REFERENCES drivers(id) ON DELETE SET NULL
);

-- Weekly Logs (Driver Income/Usage)
CREATE TABLE IF NOT EXISTS weekly_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  driver_id INTEGER NOT NULL,
  vehicle_id INTEGER,
  month INTEGER NOT NULL,
  week INTEGER NOT NULL,
  days_on_road INTEGER,
  start_mileage INTEGER,
  end_mileage INTEGER,
  weekly_cashing DECIMAL(10,2),
  vehicle_condition TEXT DEFAULT 'OK',
  reminder TEXT DEFAULT 'OK',
  comments TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL
);

-- Jobs & Trips
CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_name TEXT NOT NULL,
  service_type TEXT NOT NULL,
  driver_id INTEGER,
  pickup_location TEXT,
  dropoff_location TEXT,
  job_date TEXT,
  amount DECIMAL(10,2),
  status TEXT DEFAULT 'Pending',
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL
);

-- Deliveries & Courier Orders
CREATE TABLE IF NOT EXISTS deliveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tracking_number TEXT UNIQUE,
  sender_name TEXT NOT NULL,
  sender_phone TEXT,
  recipient_name TEXT NOT NULL,
  recipient_phone TEXT,
  pickup_location TEXT,
  dropoff_location TEXT,
  rider_id INTEGER,
  weight_kg DECIMAL(10,2),
  amount DECIMAL(10,2),
  status TEXT DEFAULT 'Pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (rider_id) REFERENCES drivers(id) ON DELETE SET NULL
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_date TEXT NOT NULL,
  payer_name TEXT NOT NULL,
  payment_type TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(10,2) NOT NULL,
  week INTEGER,
  payment_status TEXT DEFAULT 'Paid',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_number TEXT UNIQUE,
  client_id INTEGER,
  invoice_date TEXT,
  due_date TEXT,
  amount DECIMAL(10,2),
  description TEXT,
  status TEXT DEFAULT 'Unpaid',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
);

-- Quotations
CREATE TABLE IF NOT EXISTS quotations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Staff (HR records)
CREATE TABLE IF NOT EXISTS staff (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  start_date TEXT,
  salary DECIMAL(10,2),
  performance TEXT DEFAULT 'Good',
  employment_status TEXT DEFAULT 'Active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Recruitment Pipeline
CREATE TABLE IF NOT EXISTS recruitment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  applicant_name TEXT NOT NULL,
  position_applied TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  applied_date TEXT,
  pipeline_stage TEXT DEFAULT 'Applied',
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Auto Mechanics / Maintenance Logs
CREATE TABLE IF NOT EXISTS mechanics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_date TEXT,
  vehicle_id INTEGER,
  service_type TEXT NOT NULL,
  mechanic_name TEXT,
  cost DECIMAL(10,2),
  next_service_due TEXT,
  maintenance_status TEXT DEFAULT 'Completed',
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

-- Clients
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);


-- SESSION MANAGEMENT TABLES
-- Active Sessions per User Role
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_role TEXT NOT NULL UNIQUE,
  token TEXT NOT NULL,
  device_info TEXT,
  ip_address TEXT,
  logged_in_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
  session_status TEXT DEFAULT 'active',
  FOREIGN KEY (user_role) REFERENCES users(role) ON DELETE CASCADE
);

-- Session Conflict Log for Audit Trail
CREATE TABLE IF NOT EXISTS session_conflicts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_role TEXT NOT NULL,
  previous_session_id INTEGER,
  new_session_id INTEGER,
  conflict_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  action TEXT DEFAULT 'login_conflict',
  FOREIGN KEY (user_role) REFERENCES users(role) ON DELETE CASCADE,
  FOREIGN KEY (previous_session_id) REFERENCES sessions(id) ON DELETE SET NULL,
  FOREIGN KEY (new_session_id) REFERENCES sessions(id) ON DELETE SET NULL
);

-- Website Visitor Log
CREATE TABLE IF NOT EXISTS website_visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  referrer TEXT,
  visited_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Rent-to-Own Agreements
CREATE TABLE IF NOT EXISTS rent_to_own_agreements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quotation_id INTEGER,
  driver_id INTEGER NOT NULL,
  vehicle_id INTEGER NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  paid_amount DECIMAL(10,2) DEFAULT 0,
  remaining_balance DECIMAL(10,2) NOT NULL,
  monthly_installment DECIMAL(10,2),
  start_date TEXT,
  expected_completion_date TEXT,
  ownership_transferred BOOLEAN DEFAULT 0,
  ownership_transferred_date TEXT,
  agreement_status TEXT DEFAULT 'Active',
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE SET NULL,
  FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

-- Rent-to-Own Payments
CREATE TABLE IF NOT EXISTS rent_to_own_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agreement_id INTEGER NOT NULL,
  payment_date TEXT NOT NULL,
  payment_amount DECIMAL(10,2) NOT NULL,
  payment_type TEXT DEFAULT 'Manual',
  recorded_by TEXT,
  notes TEXT,
  approval_status TEXT DEFAULT 'pending',
  approved_by TEXT,
  approved_at DATETIME,
  rejection_reason TEXT,
  driver_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agreement_id) REFERENCES rent_to_own_agreements(id) ON DELETE CASCADE,
  FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE
);

-- Driver Payment Submissions (Pending Approval)
CREATE TABLE IF NOT EXISTS payment_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  driver_id INTEGER NOT NULL,
  submission_date TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  week INTEGER,
  month INTEGER,
  notes TEXT,
  submission_status TEXT DEFAULT 'pending',
  approved_by_role TEXT,
  approved_by_date TEXT,
  rejection_reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payment_submissions_driver_id ON payment_submissions(driver_id);
CREATE INDEX IF NOT EXISTS idx_payment_submissions_status ON payment_submissions(submission_status);

-- Driver Portal Accounts (Individual driver login credentials)
CREATE TABLE IF NOT EXISTS driver_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  driver_id INTEGER UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE
);

-- Index for driver_users lookups
CREATE INDEX IF NOT EXISTS idx_driver_users_driver_id ON driver_users(driver_id);

-- ===== MIGRATIONS: MODIFY USERS TABLE FOR DRIVER SUPPORT =====
-- These ALTER TABLE statements add support for individual driver accounts
-- If columns already exist, they will fail safely (SQLite will skip the second definition)

-- Check if driver_id column exists, if not add it
-- SQLite workaround: we'll use PRAGMA table_info in the migration script instead

-- Note: In SQLite, ALTER TABLE ADD COLUMN requires manual migration for existing databases
-- The following are intended to be run via migration script or fresh database setup
-- PRAGMA foreign_keys should be ON before these changes

-- ALTER TABLE users ADD COLUMN driver_id INTEGER REFERENCES drivers(id) ON DELETE CASCADE;
-- ALTER TABLE users ADD COLUMN account_type TEXT DEFAULT 'admin';
-- CREATE INDEX idx_users_driver_id ON users(driver_id);

-- Driver accounts will have: account_type='driver', driver_id=<id>, role=NULL (or generic)
-- Admin accounts will have: account_type='admin', driver_id=NULL, role='ceo'|'hr'|'accountant'|'secretary'
