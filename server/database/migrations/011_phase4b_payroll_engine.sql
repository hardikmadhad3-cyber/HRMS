-- Migration: 011_phase4b_payroll_engine.sql
-- Description: Phase 4B Payroll Calculation Engine (Payroll Runs, Employees, Calculation & Component Results, Proration, Overtime, LOP, and Exceptions)

-- 1. PAYROLL RUNS (Master execution header)
CREATE TABLE IF NOT EXISTS payroll_runs (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    payroll_period_id VARCHAR(64) NOT NULL REFERENCES payroll_periods(id) ON DELETE RESTRICT,
    attendance_snapshot_id VARCHAR(64) NOT NULL REFERENCES time_leave_period_snapshots(id) ON DELETE RESTRICT,
    run_number INT NOT NULL DEFAULT 1,
    run_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'CALCULATING', 'CALCULATED', 'REVIEW', 'APPROVED', 'FINALIZED', 'CANCELLED')),
    
    -- Aggregated Financial Totals
    total_employees INT NOT NULL DEFAULT 0,
    total_gross_earnings DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    total_gross_deductions DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    total_net_pay DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    total_lop_days DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
    total_ot_hours DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
    exceptions_count INT NOT NULL DEFAULT 0,
    
    -- Execution Auditing & Review
    calculated_at TIMESTAMPTZ,
    calculated_by VARCHAR(64),
    approved_at TIMESTAMPTZ,
    approved_by VARCHAR(64),
    notes TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(64),
    
    CONSTRAINT uq_payroll_run_comp_period_num UNIQUE (company_id, payroll_period_id, run_number)
);

CREATE INDEX IF NOT EXISTS idx_payroll_runs_comp ON payroll_runs(company_id);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_period ON payroll_runs(payroll_period_id);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_status ON payroll_runs(status);

-- 2. PAYROLL RUN EMPLOYEES (Per-employee calculation item with immutable snapshots)
CREATE TABLE IF NOT EXISTS payroll_run_employees (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    payroll_run_id VARCHAR(64) NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
    employee_id VARCHAR(64) NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    compensation_assignment_id VARCHAR(64) REFERENCES employee_compensation_assignments(id) ON DELETE SET NULL,
    salary_structure_id VARCHAR(64) REFERENCES salary_structures(id) ON DELETE SET NULL,
    
    -- Contractual Baseline Values
    annual_ctc DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    monthly_gross DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    
    -- Authoritative Attendance Facts (from Phase 3C Finalized Snapshot)
    period_calendar_days INT NOT NULL DEFAULT 30,
    present_days DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    paid_leave_days DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    unpaid_leave_days DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    uncovered_absence_days DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    loss_of_pay_days DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    payable_days DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    proration_factor DECIMAL(7, 4) NOT NULL DEFAULT 1.0000,
    
    -- Overtime Facts & Computation
    approved_ot_minutes INT NOT NULL DEFAULT 0,
    approved_ot_hours DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    ot_rate_per_hour DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    ot_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    
    -- Financial Calculation Outputs
    base_gross_earnings DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    prorated_gross_earnings DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    lop_deduction_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    gross_earnings DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    gross_deductions DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    net_pay DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    
    status VARCHAR(30) NOT NULL DEFAULT 'CALCULATED' CHECK (status IN ('DRAFT', 'CALCULATED', 'HAS_EXCEPTIONS', 'EXCLUDED')),
    
    -- Immutable Historical Snapshots
    compensation_snapshot JSONB NOT NULL DEFAULT '{}',
    attendance_snapshot JSONB NOT NULL DEFAULT '{}',
    calculation_explanation JSONB NOT NULL DEFAULT '{}',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uq_run_employee UNIQUE (payroll_run_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_run_emp_run ON payroll_run_employees(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_run_emp_emp ON payroll_run_employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_run_emp_comp ON payroll_run_employees(company_id);

-- 3. PAYROLL COMPONENT RESULTS (Granular line-item breakdown with formulas)
CREATE TABLE IF NOT EXISTS payroll_component_results (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    payroll_run_id VARCHAR(64) NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
    payroll_run_employee_id VARCHAR(64) NOT NULL REFERENCES payroll_run_employees(id) ON DELETE CASCADE,
    employee_id VARCHAR(64) NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    salary_component_id VARCHAR(64) REFERENCES salary_components(id) ON DELETE SET NULL,
    
    component_code VARCHAR(50) NOT NULL,
    component_name VARCHAR(100) NOT NULL,
    component_type VARCHAR(20) NOT NULL CHECK (component_type IN ('EARNING', 'DEDUCTION')),
    component_nature VARCHAR(30) NOT NULL DEFAULT 'FIXED',
    calculation_base VARCHAR(40) NOT NULL,
    
    base_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    factor_value DECIMAL(12, 4) NOT NULL DEFAULT 0.0000,
    is_override BOOLEAN NOT NULL DEFAULT false,
    
    original_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    is_lop_affected BOOLEAN NOT NULL DEFAULT true,
    prorated_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    final_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    
    formula_derivation TEXT,
    display_order INT NOT NULL DEFAULT 1,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comp_res_run_emp ON payroll_component_results(payroll_run_employee_id);
CREATE INDEX IF NOT EXISTS idx_comp_res_run ON payroll_component_results(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_comp_res_emp ON payroll_component_results(employee_id);

-- 4. PAYROLL EXCEPTIONS (Audit & validation warnings/blockers)
CREATE TABLE IF NOT EXISTS payroll_exceptions (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    payroll_run_id VARCHAR(64) NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
    payroll_run_employee_id VARCHAR(64) REFERENCES payroll_run_employees(id) ON DELETE CASCADE,
    employee_id VARCHAR(64) REFERENCES employees(id) ON DELETE SET NULL,
    
    exception_type VARCHAR(50) NOT NULL CHECK (
        exception_type IN (
            'MISSING_COMPENSATION',
            'MISSING_ATTENDANCE_SNAPSHOT',
            'ZERO_PAYABLE_DAYS',
            'NEGATIVE_NET_PAY',
            'COMPONENT_FORMULA_ERROR',
            'UNFINALIZED_ATTENDANCE_PERIOD',
            'INACTIVE_STRUCTURE',
            'SALARY_OVERRIDE_CONFLICT'
        )
    ),
    severity VARCHAR(20) NOT NULL DEFAULT 'WARNING' CHECK (severity IN ('BLOCKING', 'WARNING')),
    message TEXT NOT NULL,
    details JSONB,
    
    is_resolved BOOLEAN NOT NULL DEFAULT false,
    resolved_at TIMESTAMPTZ,
    resolved_by VARCHAR(64),
    resolution_note TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payroll_exc_run ON payroll_exceptions(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_exc_emp ON payroll_exceptions(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_exc_type ON payroll_exceptions(exception_type);
