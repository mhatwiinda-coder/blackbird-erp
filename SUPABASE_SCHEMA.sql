-- ============================================
-- BLACK BIRD ERP - UNIFIED SUPABASE SCHEMA
-- Integrates Staff ERP + Driver Portal
-- ============================================

-- ============================================
-- 1. AUTHENTICATION & USER MANAGEMENT
-- ============================================

-- Staff/Admin Users
CREATE TABLE IF NOT EXISTS staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(50) NOT NULL, -- 'admin', 'secretary', 'hr', 'mechanic', 'manager'
    department VARCHAR(100),
    status VARCHAR(20) DEFAULT 'Active', -- 'Active', 'Inactive', 'Suspended'
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Driver Accounts (separate from drivers table)
CREATE TABLE IF NOT EXISTS driver_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id INTEGER NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'Active', -- 'Active', 'Inactive', 'Suspended'
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 2. DRIVERS & VEHICLES (OPERATIONS)
-- ============================================

CREATE TABLE IF NOT EXISTS drivers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE,
    national_id VARCHAR(50),
    license_number VARCHAR(50),
    plate_number VARCHAR(20),
    vehicle_type VARCHAR(50), -- 'CAR', 'BIKE', 'VAN', etc.
    status VARCHAR(20) DEFAULT 'Active', -- 'Active', 'Inactive', 'On Leave', 'Terminated'
    assigned_date DATE,
    hire_date DATE,
    salary DECIMAL(10, 2),
    bank_account VARCHAR(50),
    bank_name VARCHAR(100),
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehicles (
    id SERIAL PRIMARY KEY,
    plate_number VARCHAR(20) UNIQUE NOT NULL,
    make_model VARCHAR(100),
    vehicle_type VARCHAR(50), -- 'CAR', 'BIKE', 'VAN', 'TRUCK'
    year INTEGER,
    color VARCHAR(50),
    chasis_number VARCHAR(100),
    engine_number VARCHAR(100),
    assigned_driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
    vehicle_condition VARCHAR(50), -- 'Excellent', 'Good', 'Fair', 'Poor'
    status VARCHAR(20) DEFAULT 'Active',
    road_tax_due DATE,
    insurance_due DATE,
    service_due_km INTEGER,
    current_km INTEGER DEFAULT 0,
    purchase_price DECIMAL(12, 2),
    purchase_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 3. DRIVER PAYMENTS & SUBMISSIONS
-- ============================================

CREATE TABLE IF NOT EXISTS driver_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id INTEGER NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    submission_date DATE NOT NULL,
    approval_status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
    approved_by_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    approval_date TIMESTAMP,
    rejection_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id INTEGER NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    submission_id UUID REFERENCES driver_submissions(id) ON DELETE SET NULL,
    amount DECIMAL(12, 2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50), -- 'Cash', 'Bank Transfer', 'Mobile Money'
    reference_number VARCHAR(100),
    status VARCHAR(20) DEFAULT 'Completed', -- 'Pending', 'Completed', 'Failed', 'Reversed'
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 4. RENT-TO-OWN PROGRAM
-- ============================================

CREATE TABLE IF NOT EXISTS rent_to_own_agreements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id INTEGER NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
    vehicle_name VARCHAR(255),
    plate_number VARCHAR(20),
    total_price DECIMAL(12, 2) NOT NULL,
    paid_amount DECIMAL(12, 2) DEFAULT 0,
    remaining_balance DECIMAL(12, 2),
    agreement_status VARCHAR(50) DEFAULT 'Active', -- 'Active', 'Completed', 'Defaulted', 'Cancelled'
    agreement_date DATE NOT NULL,
    ownership_transferred BOOLEAN DEFAULT FALSE,
    ownership_transferred_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rent_to_own_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agreement_id UUID NOT NULL REFERENCES rent_to_own_agreements(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50),
    reference_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 5. JOBS & LOGISTICS
-- ============================================

CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
    vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
    job_type VARCHAR(50), -- 'Delivery', 'Passenger', 'Rental'
    pickup_location VARCHAR(255),
    dropoff_location VARCHAR(255),
    pickup_time TIMESTAMP,
    dropoff_time TIMESTAMP,
    distance_km DECIMAL(8, 2),
    fare DECIMAL(10, 2),
    status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'In Progress', 'Completed', 'Cancelled'
    customer_name VARCHAR(255),
    customer_phone VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
    vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
    sender_name VARCHAR(255),
    sender_phone VARCHAR(20),
    sender_location VARCHAR(255),
    receiver_name VARCHAR(255),
    receiver_phone VARCHAR(20),
    receiver_location VARCHAR(255),
    package_description TEXT,
    package_weight_kg DECIMAL(8, 2),
    delivery_fee DECIMAL(10, 2),
    status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'In Transit', 'Delivered', 'Failed'
    delivery_date DATE,
    proof_of_delivery VARCHAR(255), -- URL or path to image
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 6. SALES & QUOTATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_number VARCHAR(100) UNIQUE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(20),
    vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
    quotation_type VARCHAR(50), -- 'Sale', 'Rent', 'Lease', 'Rent-to-Own'
    price DECIMAL(12, 2),
    duration_days INTEGER,
    status VARCHAR(50) DEFAULT 'Draft', -- 'Draft', 'Sent', 'Accepted', 'Rejected', 'Completed'
    valid_until DATE,
    notes TEXT,
    created_by_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 7. INVOICES & BILLING
-- ============================================

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    total_amount DECIMAL(12, 2),
    paid_amount DECIMAL(12, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Draft', -- 'Draft', 'Sent', 'Partial', 'Paid', 'Overdue', 'Cancelled'
    issue_date DATE,
    due_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 8. MAINTENANCE & MECHANICS
-- ============================================

CREATE TABLE IF NOT EXISTS mechanics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    specialization VARCHAR(100),
    status VARCHAR(20) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS maintenance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    mechanic_id UUID REFERENCES mechanics(id) ON DELETE SET NULL,
    maintenance_type VARCHAR(100), -- 'Oil Change', 'Tire Replacement', 'General Service'
    description TEXT,
    cost DECIMAL(10, 2),
    maintenance_date DATE,
    next_service_due_km INTEGER,
    next_service_due_date DATE,
    status VARCHAR(50) DEFAULT 'Completed',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 9. HR & RECRUITMENT
-- ============================================

CREATE TABLE IF NOT EXISTS job_postings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    position VARCHAR(255) NOT NULL,
    department VARCHAR(100),
    description TEXT,
    requirements TEXT,
    salary_range VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Open', -- 'Open', 'Closed', 'Filled'
    posted_date DATE,
    closing_date DATE,
    created_by_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_posting_id UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
    applicant_name VARCHAR(255),
    applicant_email VARCHAR(255),
    applicant_phone VARCHAR(20),
    resume_url VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Reviewed', 'Shortlisted', 'Rejected', 'Hired'
    applied_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 10. ACTIVITY LOGGING
-- ============================================

CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_type VARCHAR(50), -- 'staff', 'driver'
    action VARCHAR(255),
    entity_type VARCHAR(100), -- 'driver', 'vehicle', 'job', 'payment', etc.
    entity_id VARCHAR(255),
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS website_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_visited VARCHAR(255),
    referrer VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 11. INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_drivers_phone ON drivers(phone);
CREATE INDEX idx_drivers_status ON drivers(status);
CREATE INDEX idx_drivers_plate ON drivers(plate_number);

CREATE INDEX idx_vehicles_plate ON vehicles(plate_number);
CREATE INDEX idx_vehicles_driver ON vehicles(assigned_driver_id);
CREATE INDEX idx_vehicles_status ON vehicles(status);

CREATE INDEX idx_submissions_driver ON driver_submissions(driver_id);
CREATE INDEX idx_submissions_status ON driver_submissions(approval_status);
CREATE INDEX idx_submissions_date ON driver_submissions(submission_date);

CREATE INDEX idx_payments_driver ON payments(driver_id);
CREATE INDEX idx_payments_date ON payments(payment_date);

CREATE INDEX idx_rto_driver ON rent_to_own_agreements(driver_id);
CREATE INDEX idx_rto_status ON rent_to_own_agreements(agreement_status);

CREATE INDEX idx_jobs_driver ON jobs(driver_id);
CREATE INDEX idx_jobs_status ON jobs(status);

CREATE INDEX idx_deliveries_driver ON deliveries(driver_id);
CREATE INDEX idx_deliveries_status ON deliveries(status);

CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_date ON invoices(issue_date);

CREATE INDEX idx_activity_user ON activity_logs(user_id);
CREATE INDEX idx_activity_timestamp ON activity_logs(timestamp);

-- ============================================
-- 12. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rent_to_own_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Staff can access all data
CREATE POLICY "Staff access all data" ON drivers FOR ALL USING (
  EXISTS (
    SELECT 1 FROM staff WHERE staff.auth_user_id = auth.uid()
  )
);

-- Drivers can only see their own data
CREATE POLICY "Drivers see own submissions" ON driver_submissions FOR SELECT USING (
  driver_id = (
    SELECT driver_id FROM driver_accounts WHERE auth_user_id = auth.uid() LIMIT 1
  )
);

CREATE POLICY "Drivers see own payments" ON payments FOR SELECT USING (
  driver_id = (
    SELECT driver_id FROM driver_accounts WHERE auth_user_id = auth.uid() LIMIT 1
  )
);

CREATE POLICY "Drivers see own rent-to-own" ON rent_to_own_agreements FOR SELECT USING (
  driver_id = (
    SELECT driver_id FROM driver_accounts WHERE auth_user_id = auth.uid() LIMIT 1
  )
);

-- ============================================
-- 13. VIEWS FOR COMMON QUERIES
-- ============================================

CREATE VIEW driver_summary AS
SELECT
    d.id,
    d.name,
    d.phone,
    d.status,
    COUNT(DISTINCT j.id) as total_jobs,
    COUNT(DISTINCT ds.id) as total_submissions,
    SUM(p.amount) as total_earned,
    v.plate_number,
    v.vehicle_type
FROM drivers d
LEFT JOIN jobs j ON d.id = j.driver_id
LEFT JOIN driver_submissions ds ON d.id = ds.driver_id
LEFT JOIN payments p ON d.id = p.driver_id
LEFT JOIN vehicles v ON d.id = v.assigned_driver_id
GROUP BY d.id, v.plate_number, v.vehicle_type;

CREATE VIEW vehicle_status_summary AS
SELECT
    v.id,
    v.plate_number,
    v.vehicle_type,
    v.status,
    d.name as driver_name,
    COUNT(j.id) as total_jobs,
    COALESCE(SUM(j.distance_km), 0) as total_km
FROM vehicles v
LEFT JOIN drivers d ON v.assigned_driver_id = d.id
LEFT JOIN jobs j ON v.id = j.vehicle_id
GROUP BY v.id, d.name;

CREATE VIEW pending_payments AS
SELECT
    ds.id,
    ds.driver_id,
    d.name,
    ds.amount,
    ds.submission_date,
    ds.approval_status
FROM driver_submissions ds
JOIN drivers d ON ds.driver_id = d.id
WHERE ds.approval_status = 'Pending'
ORDER BY ds.submission_date DESC;

-- ============================================
-- INSTALLATION INSTRUCTIONS
-- ============================================
/*
1. Go to https://supabase.com and create a new project
2. In the SQL Editor, paste this entire schema
3. Run the SQL to create all tables
4. Update your .env file with:
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
5. Install the Supabase client:
   npm install @supabase/supabase-js
6. Update your API routes to use Supabase instead of SQLite
*/
