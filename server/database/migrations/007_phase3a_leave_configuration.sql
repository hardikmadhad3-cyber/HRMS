-- Migration: 007_phase3a_leave_configuration.sql
-- Description: Phase 3A Leave Configuration & Policy Engine (Years, Types, Policies, Rules, Eligibility, Effective-Dated Assignments)

-- 1. LEAVE YEARS / PERIODS MASTER
CREATE TABLE IF NOT EXISTS leave_years (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'CLOSED')),
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(64),
    CONSTRAINT uq_leave_year_comp_code UNIQUE (company_id, code),
    CONSTRAINT chk_leave_year_dates CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_leave_years_comp ON leave_years(company_id);
CREATE INDEX IF NOT EXISTS idx_leave_years_status ON leave_years(status);
CREATE INDEX IF NOT EXISTS idx_leave_years_dates ON leave_years(start_date, end_date);

-- 2. LEAVE TYPES MASTER
CREATE TABLE IF NOT EXISTS leave_types (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(30) NOT NULL CHECK (category IN ('CASUAL', 'SICK', 'PRIVILEGE', 'UNPAID', 'MATERNITY', 'PATERNITY', 'COMP_OFF', 'BEREAVEMENT', 'SPECIAL')),
    paid_type VARCHAR(20) NOT NULL DEFAULT 'PAID' CHECK (paid_type IN ('PAID', 'UNPAID', 'SPECIAL')),
    unit VARCHAR(20) NOT NULL DEFAULT 'FULL_DAY' CHECK (unit IN ('FULL_DAY', 'HALF_DAY', 'HOURS')),
    color VARCHAR(30) NOT NULL DEFAULT '#3B82F6',
    requires_reason BOOLEAN NOT NULL DEFAULT true,
    requires_attachment BOOLEAN NOT NULL DEFAULT false,
    attachment_threshold_days DECIMAL(4, 1) DEFAULT 2.0,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(64),
    CONSTRAINT uq_leave_type_comp_code UNIQUE (company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_leave_types_comp ON leave_types(company_id);
CREATE INDEX IF NOT EXISTS idx_leave_types_category ON leave_types(category);
CREATE INDEX IF NOT EXISTS idx_leave_types_status ON leave_types(status);

-- 3. LEAVE POLICIES MASTER
CREATE TABLE IF NOT EXISTS leave_policies (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    priority INT NOT NULL DEFAULT 1,
    is_default BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(64),
    CONSTRAINT uq_leave_policy_comp_code UNIQUE (company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_leave_policies_comp ON leave_policies(company_id);
CREATE INDEX IF NOT EXISTS idx_leave_policies_status ON leave_policies(status);

-- 4. LEAVE POLICY RULES (Relational per-leave-type configuration inside policy)
CREATE TABLE IF NOT EXISTS leave_policy_rules (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    leave_policy_id VARCHAR(64) NOT NULL REFERENCES leave_policies(id) ON DELETE CASCADE,
    leave_type_id VARCHAR(64) NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
    
    -- Entitlement & Accrual
    annual_entitlement DECIMAL(6, 2) NOT NULL DEFAULT 0,
    accrual_frequency VARCHAR(30) NOT NULL DEFAULT 'ANNUAL_UPFRONT' CHECK (accrual_frequency IN ('ANNUAL_UPFRONT', 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'NONE')),
    accrual_timing VARCHAR(30) NOT NULL DEFAULT 'START_OF_PERIOD' CHECK (accrual_timing IN ('START_OF_PERIOD', 'END_OF_PERIOD')),
    proration_rule VARCHAR(30) NOT NULL DEFAULT 'PRORATE_BY_DAYS' CHECK (proration_rule IN ('NONE', 'PRORATE_BY_DAYS', 'PRORATE_BY_MONTHS', 'JOINING_MONTH_SPLIT')),
    
    -- Carry Forward
    allow_carry_forward BOOLEAN NOT NULL DEFAULT false,
    max_carry_forward_days DECIMAL(6, 2) NOT NULL DEFAULT 0,
    carry_forward_expiry_months INT DEFAULT 12,
    
    -- Encashment
    allow_encashment BOOLEAN NOT NULL DEFAULT false,
    min_balance_for_encashment DECIMAL(6, 2) DEFAULT 0,
    max_encashment_days_per_year DECIMAL(6, 2) DEFAULT 0,
    
    -- Sandwich & Non-Working Days
    sandwich_rule_enabled BOOLEAN NOT NULL DEFAULT false,
    include_holidays BOOLEAN NOT NULL DEFAULT false,
    include_weekly_offs BOOLEAN NOT NULL DEFAULT false,
    
    -- Limits & Restrictions
    min_days_per_request DECIMAL(4, 2) NOT NULL DEFAULT 0.5,
    max_consecutive_days DECIMAL(6, 2) NOT NULL DEFAULT 30.0,
    max_requests_per_month INT DEFAULT 5,
    max_advance_days INT DEFAULT 90,
    allow_backdated BOOLEAN NOT NULL DEFAULT true,
    max_backdated_days INT NOT NULL DEFAULT 7,
    allow_negative_balance BOOLEAN NOT NULL DEFAULT false,
    negative_balance_limit DECIMAL(6, 2) NOT NULL DEFAULT 0.0,
    
    -- Tenure, Attachment & Demographic criteria
    requires_attachment BOOLEAN NOT NULL DEFAULT false,
    attachment_threshold_days DECIMAL(4, 1) DEFAULT 2.0,
    min_service_days_required INT NOT NULL DEFAULT 0,
    allow_during_probation BOOLEAN NOT NULL DEFAULT true,
    applicable_gender VARCHAR(20) NOT NULL DEFAULT 'ALL' CHECK (applicable_gender IN ('ALL', 'MALE', 'FEMALE', 'OTHER')),
    applicable_marital_status VARCHAR(20) NOT NULL DEFAULT 'ALL' CHECK (applicable_marital_status IN ('ALL', 'SINGLE', 'MARRIED')),
    
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_policy_rule UNIQUE (leave_policy_id, leave_type_id)
);

CREATE INDEX IF NOT EXISTS idx_leave_rules_policy ON leave_policy_rules(leave_policy_id);
CREATE INDEX IF NOT EXISTS idx_leave_rules_type ON leave_policy_rules(leave_type_id);
CREATE INDEX IF NOT EXISTS idx_leave_rules_comp ON leave_policy_rules(company_id);

-- 5. LEAVE POLICY ELIGIBILITY (Department/Designation/Branch/Employment Scope)
CREATE TABLE IF NOT EXISTS leave_policy_eligibility (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    leave_policy_id VARCHAR(64) NOT NULL REFERENCES leave_policies(id) ON DELETE CASCADE,
    employment_types JSONB NOT NULL DEFAULT '[]'::jsonb,
    department_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    designation_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    branch_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    work_location_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    min_service_days INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_policy_eligibility UNIQUE (leave_policy_id)
);

CREATE INDEX IF NOT EXISTS idx_policy_elig_policy ON leave_policy_eligibility(leave_policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_elig_comp ON leave_policy_eligibility(company_id);

-- 6. EMPLOYEE LEAVE POLICY ASSIGNMENTS (Effective-Dated History)
CREATE TABLE IF NOT EXISTS employee_leave_policy_assignments (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    employee_id VARCHAR(64) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_policy_id VARCHAR(64) NOT NULL REFERENCES leave_policies(id) ON DELETE RESTRICT,
    effective_from DATE NOT NULL,
    effective_to DATE,
    assignment_reason VARCHAR(255) NOT NULL DEFAULT 'STANDARD_ASSIGNMENT',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUPERSEDED', 'CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(64),
    CONSTRAINT chk_leave_assign_dates CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE INDEX IF NOT EXISTS idx_leave_assign_emp ON employee_leave_policy_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_assign_comp ON employee_leave_policy_assignments(company_id);
CREATE INDEX IF NOT EXISTS idx_leave_assign_dates ON employee_leave_policy_assignments(effective_from, effective_to);
CREATE INDEX IF NOT EXISTS idx_leave_assign_status ON employee_leave_policy_assignments(status);
