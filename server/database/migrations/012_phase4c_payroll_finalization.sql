-- Migration: 012_phase4c_payroll_finalization.sql
-- Description: Phase 4C Payroll Finalization, Locking, Versioned Snapshots, Payslips Data Model & Register

-- 1. PAYSLIPS (Materialized, versioned payslips with immutable breakdowns and YTD totals)
CREATE TABLE IF NOT EXISTS payslips (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    payroll_run_id VARCHAR(64) NOT NULL REFERENCES payroll_runs(id) ON DELETE RESTRICT,
    payroll_run_employee_id VARCHAR(64) NOT NULL REFERENCES payroll_run_employees(id) ON DELETE RESTRICT,
    payroll_period_id VARCHAR(64) NOT NULL REFERENCES payroll_periods(id) ON DELETE RESTRICT,
    employee_id VARCHAR(64) NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    
    -- Identifier & Versioning
    payslip_number VARCHAR(64) NOT NULL,
    version INT NOT NULL DEFAULT 1,
    issue_date DATE NOT NULL,
    pay_date DATE NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    
    -- Period Reference Details
    period_name VARCHAR(100) NOT NULL,
    period_code VARCHAR(50) NOT NULL,
    period_start_date DATE NOT NULL,
    period_end_date DATE NOT NULL,
    
    -- Attendance & Compensation Facts
    annual_ctc DECIMAL(14, 2) NOT NULL,
    monthly_gross DECIMAL(14, 2) NOT NULL,
    calendar_days INT NOT NULL,
    payable_days DECIMAL(5, 2) NOT NULL,
    loss_of_pay_days DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    approved_ot_hours DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    
    -- Net Financial Totals
    gross_earnings DECIMAL(14, 2) NOT NULL,
    gross_deductions DECIMAL(14, 2) NOT NULL,
    net_pay DECIMAL(14, 2) NOT NULL,
    net_pay_in_words TEXT NOT NULL,
    
    -- Year-To-Date (YTD) Aggregations
    ytd_gross_earnings DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    ytd_gross_deductions DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    ytd_net_pay DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    ytd_tax_deducted DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    ytd_pf_deducted DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    
    -- Publication & Security
    status VARCHAR(30) NOT NULL DEFAULT 'GENERATED' CHECK (status IN ('GENERATED', 'PUBLISHED', 'WITHHELD', 'CANCELLED')),
    published_at TIMESTAMPTZ,
    published_by VARCHAR(64),
    viewed_at TIMESTAMPTZ,
    downloaded_at TIMESTAMPTZ,
    download_token VARCHAR(128) UNIQUE,
    
    -- Immutable Snapshots
    employee_snapshot JSONB NOT NULL DEFAULT '{}',
    organization_snapshot JSONB NOT NULL DEFAULT '{}',
    earnings_breakdown JSONB NOT NULL DEFAULT '[]',
    deductions_breakdown JSONB NOT NULL DEFAULT '[]',
    notes TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uq_payslip_run_emp UNIQUE (payroll_run_id, employee_id),
    CONSTRAINT uq_payslip_number_comp UNIQUE (company_id, payslip_number)
);

CREATE INDEX IF NOT EXISTS idx_payslips_comp ON payslips(company_id);
CREATE INDEX IF NOT EXISTS idx_payslips_emp ON payslips(employee_id);
CREATE INDEX IF NOT EXISTS idx_payslips_run ON payslips(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payslips_period ON payslips(payroll_period_id);
CREATE INDEX IF NOT EXISTS idx_payslips_status ON payslips(status);
CREATE INDEX IF NOT EXISTS idx_payslips_token ON payslips(download_token);

-- 2. PAYROLL PERIOD SNAPSHOTS (Immutable versioned snapshots of finalized payroll runs)
CREATE TABLE IF NOT EXISTS payroll_period_snapshots (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    payroll_period_id VARCHAR(64) NOT NULL REFERENCES payroll_periods(id) ON DELETE RESTRICT,
    payroll_run_id VARCHAR(64) NOT NULL REFERENCES payroll_runs(id) ON DELETE RESTRICT,
    snapshot_version INT NOT NULL DEFAULT 1,
    status VARCHAR(30) NOT NULL DEFAULT 'FINALIZED' CHECK (status IN ('FINALIZED', 'SUPERSEDED', 'REOPENED')),
    
    finalized_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finalized_by VARCHAR(64) NOT NULL,
    finalized_by_name VARCHAR(120),
    
    total_employees INT NOT NULL,
    total_gross_earnings DECIMAL(14, 2) NOT NULL,
    total_gross_deductions DECIMAL(14, 2) NOT NULL,
    total_net_pay DECIMAL(14, 2) NOT NULL,
    total_lop_days DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
    total_ot_hours DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
    
    run_summary JSONB NOT NULL DEFAULT '{}',
    employee_results JSONB NOT NULL DEFAULT '[]',
    
    reopen_reason TEXT,
    reopened_at TIMESTAMPTZ,
    reopened_by VARCHAR(64),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uq_payroll_period_snapshot UNIQUE (company_id, payroll_period_id, snapshot_version)
);

CREATE INDEX IF NOT EXISTS idx_period_snaps_comp ON payroll_period_snapshots(company_id);
CREATE INDEX IF NOT EXISTS idx_period_snaps_period ON payroll_period_snapshots(payroll_period_id);
CREATE INDEX IF NOT EXISTS idx_period_snaps_run ON payroll_period_snapshots(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_period_snaps_status ON payroll_period_snapshots(status);
