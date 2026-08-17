-- Migration: 009_phase3c_leave_attendance_integration.sql
-- Description: Phase 3C Leave ↔ Attendance Reconciliation, Authoritative LOP, Period Integration, and Payroll-Ready Time & Leave Snapshot

-- 1. LEAVE ATTENDANCE RECONCILIATIONS (Daily Authoritative Integration Record)
CREATE TABLE IF NOT EXISTS leave_attendance_reconciliations (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    employee_id VARCHAR(64) NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    attendance_date DATE NOT NULL,
    daily_attendance_id VARCHAR(64) REFERENCES daily_attendance(id) ON DELETE SET NULL,
    leave_request_id VARCHAR(64) REFERENCES leave_requests(id) ON DELETE SET NULL,
    leave_type_id VARCHAR(64) REFERENCES leave_types(id) ON DELETE SET NULL,
    leave_policy_id VARCHAR(64) REFERENCES leave_policies(id) ON DELETE SET NULL,
    leave_year_id VARCHAR(64) REFERENCES leave_years(id) ON DELETE SET NULL,
    unit VARCHAR(20) NOT NULL DEFAULT 'FULL_DAY' CHECK (unit IN ('FULL_DAY', 'HALF_DAY', 'HOURS')),
    half_day_period VARCHAR(20) DEFAULT 'NONE' CHECK (half_day_period IN ('FIRST_HALF', 'SECOND_HALF', 'NONE')),
    
    -- Reconciled coverage classification
    reconciled_coverage VARCHAR(30) NOT NULL CHECK (
        reconciled_coverage IN ('NONE', 'PAID', 'UNPAID', 'PARTIAL', 'CONFLICT')
    ),
    
    -- Calculated time units
    paid_leave_units DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    unpaid_leave_units DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    uncovered_absence_units DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    loss_of_pay_units DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    payable_units DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    
    -- Conflict detection
    has_conflict BOOLEAN NOT NULL DEFAULT false,
    conflict_type VARCHAR(50), -- e.g. 'LEAVE_ATTENDANCE_CONFLICT', 'OVERLAPPING_HALF_DAY'
    conflict_details TEXT,
    
    -- Lifecycle & versioning
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUPERSEDED', 'CANCELLED')),
    version INT NOT NULL DEFAULT 1,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(64),
    
    CONSTRAINT uq_leave_att_recon UNIQUE (company_id, employee_id, attendance_date, version)
);

CREATE INDEX IF NOT EXISTS idx_leave_att_recon_comp_date ON leave_attendance_reconciliations(company_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_leave_att_recon_emp ON leave_attendance_reconciliations(company_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_att_recon_req ON leave_attendance_reconciliations(leave_request_id);
CREATE INDEX IF NOT EXISTS idx_leave_att_recon_status ON leave_attendance_reconciliations(status);

-- 2. TIME & LEAVE PERIOD SNAPSHOTS (Immutable versioned payroll-ready final archives)
CREATE TABLE IF NOT EXISTS time_leave_period_snapshots (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    period_id VARCHAR(64) NOT NULL REFERENCES attendance_periods(id) ON DELETE CASCADE,
    version INT NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'FINALIZED' CHECK (status IN ('FINALIZED', 'LOCKED')),
    finalized_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finalized_by VARCHAR(64),
    reconciled_by VARCHAR(64),
    reconciliation_version INT NOT NULL DEFAULT 1,
    summaries_count INT NOT NULL DEFAULT 0,
    summaries JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uq_time_leave_snapshot_ver UNIQUE (company_id, period_id, version)
);

CREATE INDEX IF NOT EXISTS idx_time_leave_snap_comp_period ON time_leave_period_snapshots(company_id, period_id);
CREATE INDEX IF NOT EXISTS idx_time_leave_snap_ver ON time_leave_period_snapshots(period_id, version);

-- 3. EXTEND DAILY ATTENDANCE WITH RECONCILED ATTRIBUTES
ALTER TABLE daily_attendance ADD COLUMN IF NOT EXISTS reconciled_leave_status VARCHAR(30);
ALTER TABLE daily_attendance ADD COLUMN IF NOT EXISTS leave_coverage VARCHAR(30);
ALTER TABLE daily_attendance ADD COLUMN IF NOT EXISTS paid_leave_units DECIMAL(5, 2) DEFAULT 0.00;
ALTER TABLE daily_attendance ADD COLUMN IF NOT EXISTS unpaid_leave_units DECIMAL(5, 2) DEFAULT 0.00;
ALTER TABLE daily_attendance ADD COLUMN IF NOT EXISTS loss_of_pay_units DECIMAL(5, 2) DEFAULT 0.00;
ALTER TABLE daily_attendance ADD COLUMN IF NOT EXISTS reconciled_payable_units DECIMAL(5, 2) DEFAULT 0.00;
ALTER TABLE daily_attendance ADD COLUMN IF NOT EXISTS leave_request_id VARCHAR(64);
ALTER TABLE daily_attendance ADD COLUMN IF NOT EXISTS leave_type_id VARCHAR(64);
ALTER TABLE daily_attendance ADD COLUMN IF NOT EXISTS leave_type_code VARCHAR(50);
ALTER TABLE daily_attendance ADD COLUMN IF NOT EXISTS leave_coverage_note VARCHAR(255);
ALTER TABLE daily_attendance ADD COLUMN IF NOT EXISTS reconciliation_id VARCHAR(64);
ALTER TABLE daily_attendance ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMPTZ;
