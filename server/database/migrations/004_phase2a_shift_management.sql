-- Migration: 004_phase2a_shift_management.sql
-- Description: Phase 2A Shift Master, Breaks, Weekly Off Rules, Employee Shift Assignments, and Shift Roster

-- 1. SHIFTS (Shift Master Definition)
CREATE TABLE IF NOT EXISTS shifts (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    start_time VARCHAR(10) NOT NULL, -- Format: HH:MM (e.g. '09:30', '21:00')
    end_time VARCHAR(10) NOT NULL,   -- Format: HH:MM (e.g. '18:30', '06:00')
    is_overnight BOOLEAN NOT NULL DEFAULT false,
    late_entry_grace_minutes INT NOT NULL DEFAULT 15,
    early_exit_grace_minutes INT NOT NULL DEFAULT 15,
    late_allowed BOOLEAN NOT NULL DEFAULT true,
    early_exit_allowed BOOLEAN NOT NULL DEFAULT true,
    half_day_hours DECIMAL(4,2) NOT NULL DEFAULT 4.50,
    full_day_hours DECIMAL(4,2) NOT NULL DEFAULT 8.00,
    color VARCHAR(20) DEFAULT '#3B82F6',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(64),
    updated_by VARCHAR(64),
    CONSTRAINT uq_shifts_company_code UNIQUE (company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_shifts_company_id ON shifts(company_id);
CREATE INDEX IF NOT EXISTS idx_shifts_code ON shifts(code);
CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status);
CREATE INDEX IF NOT EXISTS idx_shifts_overnight ON shifts(is_overnight);

-- 2. SHIFT BREAKS (Configurable break periods per shift)
CREATE TABLE IF NOT EXISTS shift_breaks (
    id VARCHAR(64) PRIMARY KEY,
    shift_id VARCHAR(64) NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    break_name VARCHAR(100) NOT NULL,
    start_time VARCHAR(10) NOT NULL,
    end_time VARCHAR(10) NOT NULL,
    duration_minutes INT NOT NULL,
    is_paid BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shift_breaks_shift_id ON shift_breaks(shift_id);
CREATE INDEX IF NOT EXISTS idx_shift_breaks_company_id ON shift_breaks(company_id);

-- 3. WEEKLY OFF RULES (Company & Shift Level Weekly Off Definitions)
CREATE TABLE IF NOT EXISTS weekly_off_rules (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    shift_id VARCHAR(64) REFERENCES shifts(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    days_of_week TEXT[] NOT NULL, -- e.g. ARRAY['SUNDAY'] or ARRAY['SATURDAY', 'SUNDAY']
    alternate_saturday BOOLEAN NOT NULL DEFAULT false,
    is_default BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weekly_off_company_id ON weekly_off_rules(company_id);
CREATE INDEX IF NOT EXISTS idx_weekly_off_shift_id ON weekly_off_rules(shift_id);

-- 4. EMPLOYEE SHIFT ASSIGNMENTS (Effective-Dated Shift History)
CREATE TABLE IF NOT EXISTS employee_shift_assignments (
    id VARCHAR(64) PRIMARY KEY,
    employee_id VARCHAR(64) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    shift_id VARCHAR(64) NOT NULL REFERENCES shifts(id) ON DELETE RESTRICT,
    effective_from DATE NOT NULL,
    effective_to DATE, -- NULL represents open-ended / currently ongoing assignment
    assignment_type VARCHAR(30) NOT NULL DEFAULT 'PERMANENT' CHECK (assignment_type IN ('PERMANENT', 'TEMPORARY', 'ROSTER', 'ROTATIONAL')),
    reason VARCHAR(255),
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CANCELLED', 'EXPIRED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(64),
    updated_by VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_emp_shift_assign_employee_id ON employee_shift_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_emp_shift_assign_company_id ON employee_shift_assignments(company_id);
CREATE INDEX IF NOT EXISTS idx_emp_shift_assign_shift_id ON employee_shift_assignments(shift_id);
CREATE INDEX IF NOT EXISTS idx_emp_shift_assign_effective ON employee_shift_assignments(effective_from, effective_to);
CREATE INDEX IF NOT EXISTS idx_emp_shift_assign_status ON employee_shift_assignments(status);

-- 5. SHIFT ROSTER ENTRIES (Scheduled Daily Calendar Roster)
CREATE TABLE IF NOT EXISTS shift_roster_entries (
    id VARCHAR(64) PRIMARY KEY,
    employee_id VARCHAR(64) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    shift_id VARCHAR(64) NOT NULL REFERENCES shifts(id) ON DELETE RESTRICT,
    roster_date DATE NOT NULL,
    is_weekly_off BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(64),
    CONSTRAINT uq_roster_emp_date UNIQUE (employee_id, roster_date)
);

CREATE INDEX IF NOT EXISTS idx_shift_roster_emp_id ON shift_roster_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_shift_roster_company_id ON shift_roster_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_shift_roster_date ON shift_roster_entries(roster_date);
CREATE INDEX IF NOT EXISTS idx_shift_roster_shift_id ON shift_roster_entries(shift_id);
