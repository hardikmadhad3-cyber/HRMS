-- Migration: 010_phase4a_payroll_configuration.sql
-- Description: Phase 4A Payroll Configuration (Components, Structures, Calendars, Periods, Effective-Dated Compensation Assignments & Component Overrides)

-- 1. SALARY COMPONENTS MASTER (Earnings & Deductions)
CREATE TABLE IF NOT EXISTS salary_components (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('EARNING', 'DEDUCTION')),
    nature VARCHAR(30) NOT NULL DEFAULT 'FIXED' CHECK (nature IN ('FIXED', 'VARIABLE', 'FORMULA', 'REIMBURSEMENT', 'STATUTORY')),
    calculation_base VARCHAR(40) NOT NULL DEFAULT 'FLAT_AMOUNT' CHECK (calculation_base IN ('FLAT_AMOUNT', 'PERCENTAGE_OF_BASIC', 'PERCENTAGE_OF_GROSS', 'PERCENTAGE_OF_CTC', 'FORMULA')),
    default_formula TEXT,
    rounding_rule VARCHAR(30) NOT NULL DEFAULT 'ROUND_NEAREST' CHECK (rounding_rule IN ('NONE', 'ROUND_NEAREST', 'ROUND_UP', 'ROUND_DOWN')),
    
    -- Taxability & Statutory Compliance Flags
    is_taxable BOOLEAN NOT NULL DEFAULT true,
    is_pf_eligible BOOLEAN NOT NULL DEFAULT false,
    is_esi_eligible BOOLEAN NOT NULL DEFAULT false,
    is_pt_eligible BOOLEAN NOT NULL DEFAULT false,
    is_tds_applicable BOOLEAN NOT NULL DEFAULT true,
    is_lop_affected BOOLEAN NOT NULL DEFAULT true,
    
    display_order INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(64),
    CONSTRAINT uq_salary_component_comp_code UNIQUE (company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_salary_components_comp ON salary_components(company_id);
CREATE INDEX IF NOT EXISTS idx_salary_components_type ON salary_components(type);
CREATE INDEX IF NOT EXISTS idx_salary_components_active ON salary_components(is_active);

-- 2. SALARY STRUCTURES MASTER
CREATE TABLE IF NOT EXISTS salary_structures (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    pay_frequency VARCHAR(20) NOT NULL DEFAULT 'MONTHLY' CHECK (pay_frequency IN ('MONTHLY', 'BI_WEEKLY', 'SEMI_MONTHLY', 'WEEKLY')),
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(64),
    CONSTRAINT uq_salary_structure_comp_code UNIQUE (company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_salary_structures_comp ON salary_structures(company_id);
CREATE INDEX IF NOT EXISTS idx_salary_structures_active ON salary_structures(is_active);

-- 3. SALARY STRUCTURE COMPONENTS (Relational child items)
CREATE TABLE IF NOT EXISTS salary_structure_components (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    salary_structure_id VARCHAR(64) NOT NULL REFERENCES salary_structures(id) ON DELETE CASCADE,
    salary_component_id VARCHAR(64) NOT NULL REFERENCES salary_components(id) ON DELETE RESTRICT,
    calculation_type VARCHAR(40) NOT NULL DEFAULT 'FLAT_AMOUNT' CHECK (calculation_type IN ('FLAT_AMOUNT', 'PERCENTAGE_OF_BASIC', 'PERCENTAGE_OF_GROSS', 'PERCENTAGE_OF_CTC', 'FORMULA')),
    factor_value DECIMAL(12, 4) NOT NULL DEFAULT 0.0000,
    formula_expression TEXT,
    base_component_id VARCHAR(64) REFERENCES salary_components(id) ON DELETE SET NULL,
    is_mandatory BOOLEAN NOT NULL DEFAULT true,
    allow_override BOOLEAN NOT NULL DEFAULT false,
    display_order INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_struct_comp UNIQUE (salary_structure_id, salary_component_id)
);

CREATE INDEX IF NOT EXISTS idx_struct_comps_struct ON salary_structure_components(salary_structure_id);
CREATE INDEX IF NOT EXISTS idx_struct_comps_comp ON salary_structure_components(salary_component_id);

-- 4. PAYROLL CALENDARS MASTER
CREATE TABLE IF NOT EXISTS payroll_calendars (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    year INT NOT NULL,
    pay_frequency VARCHAR(20) NOT NULL DEFAULT 'MONTHLY' CHECK (pay_frequency IN ('MONTHLY', 'BI_WEEKLY', 'SEMI_MONTHLY', 'WEEKLY')),
    start_month INT NOT NULL DEFAULT 1 CHECK (start_month BETWEEN 1 AND 12),
    end_month INT NOT NULL DEFAULT 12 CHECK (end_month BETWEEN 1 AND 12),
    cycle_start_day INT NOT NULL DEFAULT 1 CHECK (cycle_start_day BETWEEN 1 AND 31),
    cycle_end_day INT NOT NULL DEFAULT 31 CHECK (cycle_end_day BETWEEN 1 AND 31),
    pay_day INT NOT NULL DEFAULT 1 CHECK (pay_day BETWEEN 1 AND 31),
    cutoff_day INT NOT NULL DEFAULT 25 CHECK (cutoff_day BETWEEN 1 AND 31),
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(64),
    CONSTRAINT uq_payroll_calendar_comp_code UNIQUE (company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_payroll_cal_comp ON payroll_calendars(company_id);
CREATE INDEX IF NOT EXISTS idx_payroll_cal_year ON payroll_calendars(year);

-- 5. PAYROLL PERIODS (Child periods for calendar)
CREATE TABLE IF NOT EXISTS payroll_periods (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    payroll_calendar_id VARCHAR(64) NOT NULL REFERENCES payroll_calendars(id) ON DELETE CASCADE,
    period_number INT NOT NULL,
    period_code VARCHAR(30) NOT NULL,
    period_name VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    pay_date DATE NOT NULL,
    cutoff_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'UPCOMING' CHECK (status IN ('UPCOMING', 'OPEN', 'PROCESSING', 'CLOSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_payroll_period_code UNIQUE (payroll_calendar_id, period_code),
    CONSTRAINT chk_payroll_period_dates CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_payroll_periods_cal ON payroll_periods(payroll_calendar_id);
CREATE INDEX IF NOT EXISTS idx_payroll_periods_dates ON payroll_periods(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_payroll_periods_status ON payroll_periods(status);

-- 6. EMPLOYEE COMPENSATION ASSIGNMENTS (Effective-Dated Headers)
CREATE TABLE IF NOT EXISTS employee_compensation_assignments (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    employee_id VARCHAR(64) NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    salary_structure_id VARCHAR(64) NOT NULL REFERENCES salary_structures(id) ON DELETE RESTRICT,
    annual_ctc DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    monthly_gross DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    pay_frequency VARCHAR(20) NOT NULL DEFAULT 'MONTHLY' CHECK (pay_frequency IN ('MONTHLY', 'BI_WEEKLY', 'SEMI_MONTHLY', 'WEEKLY')),
    effective_from DATE NOT NULL,
    effective_to DATE,
    change_reason VARCHAR(40) NOT NULL DEFAULT 'NEW_HIRE' CHECK (change_reason IN ('NEW_HIRE', 'PROMOTION', 'ANNUAL_REVISION', 'PERFORMANCE_APPRAISAL', 'MARKET_ADJUSTMENT', 'CORRECTION', 'STRUCTURE_MIGRATION')),
    remarks TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUPERSEDED', 'CANCELLED', 'DRAFT')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(64),
    CONSTRAINT chk_comp_assignment_dates CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE INDEX IF NOT EXISTS idx_comp_assign_emp ON employee_compensation_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_comp_assign_comp ON employee_compensation_assignments(company_id);
CREATE INDEX IF NOT EXISTS idx_comp_assign_dates ON employee_compensation_assignments(effective_from, effective_to);
CREATE INDEX IF NOT EXISTS idx_comp_assign_status ON employee_compensation_assignments(status);

-- 7. EMPLOYEE COMPENSATION COMPONENT OVERRIDES (Child table)
CREATE TABLE IF NOT EXISTS employee_compensation_overrides (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    compensation_assignment_id VARCHAR(64) NOT NULL REFERENCES employee_compensation_assignments(id) ON DELETE CASCADE,
    salary_component_id VARCHAR(64) NOT NULL REFERENCES salary_components(id) ON DELETE RESTRICT,
    calculation_type VARCHAR(40) NOT NULL DEFAULT 'FLAT_AMOUNT' CHECK (calculation_type IN ('FLAT_AMOUNT', 'PERCENTAGE_OF_BASIC', 'PERCENTAGE_OF_GROSS', 'PERCENTAGE_OF_CTC', 'FORMULA')),
    override_value DECIMAL(12, 4) NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_emp_comp_override UNIQUE (compensation_assignment_id, salary_component_id)
);

CREATE INDEX IF NOT EXISTS idx_comp_override_assign ON employee_compensation_overrides(compensation_assignment_id);
CREATE INDEX IF NOT EXISTS idx_comp_override_comp ON employee_compensation_overrides(salary_component_id);
