-- Migration: 008_phase3b_leave_transactions.sql
-- Description: Phase 3B Leave Transactions, Immutable Ledger, Balances, Reservations, Requests & Accrual Logs

-- 1. AUTHORITATIVE EMPLOYEE LEAVE LEDGER (Immutable double-entry-style accounting log)
CREATE TABLE IF NOT EXISTS employee_leave_ledger (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    employee_id VARCHAR(64) NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    leave_type_id VARCHAR(64) NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
    leave_year_id VARCHAR(64) NOT NULL REFERENCES leave_years(id) ON DELETE RESTRICT,
    transaction_type VARCHAR(30) NOT NULL CHECK (
        transaction_type IN (
            'OPENING',
            'ACCRUAL',
            'CARRY_FORWARD',
            'ADJUSTMENT_CREDIT',
            'ADJUSTMENT_DEBIT',
            'LEAVE_CONSUMPTION',
            'LEAVE_REVERSAL',
            'EXPIRY',
            'ENCASHMENT_DEBIT'
        )
    ),
    quantity DECIMAL(6, 2) NOT NULL, -- Positive for credits/reversals, negative for debits/consumption
    effective_date DATE NOT NULL,
    reference_type VARCHAR(50) NOT NULL, -- 'OPENING_POSTING', 'ACCRUAL_RUN', 'MANUAL_ADJUSTMENT', 'LEAVE_REQUEST', 'LEAVE_CANCELLATION', 'YEAR_END_CARRY_FORWARD'
    reference_id VARCHAR(64),
    policy_rule_id VARCHAR(64) REFERENCES leave_policy_rules(id) ON DELETE SET NULL,
    remarks TEXT,
    created_by VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leave_ledger_comp_emp ON employee_leave_ledger(company_id, employee_id, leave_type_id, leave_year_id);
CREATE INDEX IF NOT EXISTS idx_leave_ledger_date ON employee_leave_ledger(company_id, effective_date);
CREATE INDEX IF NOT EXISTS idx_leave_ledger_ref ON employee_leave_ledger(reference_type, reference_id);

-- 2. MATERIALIZED LEAVE BALANCES (Read-Model Cache, completely rebuildable from authoritative ledger)
CREATE TABLE IF NOT EXISTS employee_leave_balances (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    employee_id VARCHAR(64) NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    leave_type_id VARCHAR(64) NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
    leave_year_id VARCHAR(64) NOT NULL REFERENCES leave_years(id) ON DELETE RESTRICT,
    
    opening_balance DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    accrued_balance DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    carry_forward_balance DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    adjustment_credit DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    adjustment_debit DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    consumed_balance DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    reversed_balance DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    expired_balance DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    encashed_balance DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    
    posted_balance DECIMAL(6, 2) NOT NULL DEFAULT 0.00,  -- Sum of all posted ledger transactions
    reserved_balance DECIMAL(6, 2) NOT NULL DEFAULT 0.00, -- Sum of all active pending request reservations
    available_balance DECIMAL(6, 2) NOT NULL DEFAULT 0.00, -- posted_balance - reserved_balance
    
    last_rebuilt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uq_leave_balance_emp_type_year UNIQUE (company_id, employee_id, leave_type_id, leave_year_id)
);

CREATE INDEX IF NOT EXISTS idx_leave_balances_comp_emp ON employee_leave_balances(company_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_balances_year ON employee_leave_balances(leave_year_id);

-- 3. LEAVE REQUESTS MASTER
CREATE TABLE IF NOT EXISTS leave_requests (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    employee_id VARCHAR(64) NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    leave_type_id VARCHAR(64) NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
    leave_year_id VARCHAR(64) NOT NULL REFERENCES leave_years(id) ON DELETE RESTRICT,
    
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    unit VARCHAR(20) NOT NULL DEFAULT 'FULL_DAY' CHECK (unit IN ('FULL_DAY', 'HALF_DAY', 'HOURS')),
    half_day_period VARCHAR(20) DEFAULT 'NONE' CHECK (half_day_period IN ('FIRST_HALF', 'SECOND_HALF', 'NONE')),
    
    requested_units DECIMAL(6, 2) NOT NULL,
    approved_units DECIMAL(6, 2) DEFAULT NULL,
    chargeable_days DECIMAL(6, 2) NOT NULL,
    sandwich_days DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    
    reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (
        status IN ('DRAFT', 'SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED', 'RETURNED', 'CANCELLED')
    ),
    
    current_approver_id VARCHAR(64),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    actioned_at TIMESTAMPTZ,
    actioned_by VARCHAR(64),
    approver_remarks TEXT,
    
    cancellation_reason TEXT,
    cancelled_at TIMESTAMPTZ,
    cancelled_by VARCHAR(64),
    
    leave_policy_id VARCHAR(64) REFERENCES leave_policies(id) ON DELETE SET NULL,
    leave_policy_rule_id VARCHAR(64) REFERENCES leave_policy_rules(id) ON DELETE SET NULL,
    
    calculation_breakdown JSONB, -- Array of date-by-date calculation details
    attachments JSONB,           -- Array of file attachment metadata
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(64),
    
    CONSTRAINT chk_leave_request_dates CHECK (to_date >= from_date)
);

CREATE INDEX IF NOT EXISTS idx_leave_requests_comp_emp ON leave_requests(company_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests(company_id, from_date, to_date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(company_id, status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_approver ON leave_requests(company_id, current_approver_id);

-- 4. PENDING BALANCE RESERVATIONS (Anti-double-spending concurrency lock)
CREATE TABLE IF NOT EXISTS leave_balance_reservations (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    employee_id VARCHAR(64) NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    leave_type_id VARCHAR(64) NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
    leave_year_id VARCHAR(64) NOT NULL REFERENCES leave_years(id) ON DELETE RESTRICT,
    leave_request_id VARCHAR(64) NOT NULL REFERENCES leave_requests(id) ON DELETE CASCADE,
    
    quantity DECIMAL(6, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RELEASED', 'CONSUMED')),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leave_reservations_comp_emp ON leave_balance_reservations(company_id, employee_id, leave_type_id, status);
CREATE INDEX IF NOT EXISTS idx_leave_reservations_req ON leave_balance_reservations(leave_request_id);

-- 5. LEAVE ACCRUAL RUN LOGS (Idempotency & Execution Audit)
CREATE TABLE IF NOT EXISTS leave_accrual_logs (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    accrual_run_key VARCHAR(160) NOT NULL, -- e.g. comp-101:2026-08:POL-STD-2026:CL
    accrual_period VARCHAR(40) NOT NULL,  -- e.g. '2026-08'
    leave_year_id VARCHAR(64) NOT NULL REFERENCES leave_years(id) ON DELETE RESTRICT,
    leave_type_id VARCHAR(64) NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
    posting_date DATE NOT NULL,
    total_employees_processed INT NOT NULL DEFAULT 0,
    total_units_accrued DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'FAILED', 'PARTIAL')),
    created_by VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uq_accrual_log_comp_key UNIQUE (company_id, accrual_run_key)
);

CREATE INDEX IF NOT EXISTS idx_accrual_logs_comp_period ON leave_accrual_logs(company_id, accrual_period);
