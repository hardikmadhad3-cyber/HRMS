-- Migration: 005_phase2b_attendance_engine.sql
-- Description: Phase 2B Attendance Punches, Daily Attendance Calculation Engine, and Attendance Regularization

-- 1. ATTENDANCE PUNCHES (Raw Immutable Event Log)
CREATE TABLE IF NOT EXISTS attendance_punches (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    employee_id VARCHAR(64) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    punch_time TIMESTAMPTZ NOT NULL,
    punch_type VARCHAR(20) NOT NULL CHECK (punch_type IN ('CHECK_IN', 'CHECK_OUT')),
    source VARCHAR(30) NOT NULL DEFAULT 'WEB' CHECK (source IN ('WEB', 'MOBILE', 'ESS', 'BIOMETRIC', 'MANUAL', 'SYSTEM')),
    device_id VARCHAR(100),
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    location_address VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_punches_company_id ON attendance_punches(company_id);
CREATE INDEX IF NOT EXISTS idx_punches_employee_id ON attendance_punches(employee_id);
CREATE INDEX IF NOT EXISTS idx_punches_time ON attendance_punches(punch_time);
CREATE INDEX IF NOT EXISTS idx_punches_emp_time ON attendance_punches(employee_id, punch_time);

-- 2. DAILY ATTENDANCE (Deterministic Daily Result Store)
CREATE TABLE IF NOT EXISTS daily_attendance (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    employee_id VARCHAR(64) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    shift_id VARCHAR(64) REFERENCES shifts(id) ON DELETE SET NULL,
    scheduled_start VARCHAR(10),
    scheduled_end VARCHAR(10),
    first_check_in TIMESTAMPTZ,
    last_check_out TIMESTAMPTZ,
    gross_work_minutes INT NOT NULL DEFAULT 0,
    break_minutes INT NOT NULL DEFAULT 0,
    net_work_minutes INT NOT NULL DEFAULT 0,
    late_minutes INT NOT NULL DEFAULT 0,
    early_exit_minutes INT NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'ABSENT' CHECK (
        status IN ('PRESENT', 'ABSENT', 'HALF_DAY', 'HOLIDAY', 'WEEKLY_OFF', 'ON_LEAVE', 'INCOMPLETE', 'MISSING_PUNCH')
    ),
    calculation_status VARCHAR(30) NOT NULL DEFAULT 'CALCULATED' CHECK (
        calculation_status IN ('CALCULATED', 'REGULARIZED', 'FINALIZED')
    ),
    is_late BOOLEAN NOT NULL DEFAULT false,
    is_early_exit BOOLEAN NOT NULL DEFAULT false,
    is_half_day BOOLEAN NOT NULL DEFAULT false,
    is_holiday BOOLEAN NOT NULL DEFAULT false,
    is_weekly_off BOOLEAN NOT NULL DEFAULT false,
    is_on_leave BOOLEAN NOT NULL DEFAULT false,
    has_exception BOOLEAN NOT NULL DEFAULT false,
    exception_type VARCHAR(50), -- e.g. 'MISSING_OUT', 'MISSING_IN', 'LATE_ARRIVAL', 'EARLY_EXIT', 'LATE_AND_EARLY'
    regularization_id VARCHAR(64),
    calculation_version INT NOT NULL DEFAULT 1,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_daily_att_emp_date UNIQUE (employee_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_att_company_id ON daily_attendance(company_id);
CREATE INDEX IF NOT EXISTS idx_daily_att_employee_id ON daily_attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_daily_att_date ON daily_attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_daily_att_company_date ON daily_attendance(company_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_daily_att_status ON daily_attendance(status);
CREATE INDEX IF NOT EXISTS idx_daily_att_exception ON daily_attendance(has_exception);

-- 3. ATTENDANCE REGULARIZATION REQUESTS (Employee Punch Correction Workflow)
CREATE TABLE IF NOT EXISTS attendance_regularization_requests (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    employee_id VARCHAR(64) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    requested_check_in TIMESTAMPTZ,
    requested_check_out TIMESTAMPTZ,
    reason VARCHAR(100) NOT NULL,
    reason_details TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (
        status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')
    ),
    approver_id VARCHAR(64) REFERENCES employees(id) ON DELETE SET NULL,
    approver_comments TEXT,
    actioned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_att_reg_company_id ON attendance_regularization_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_att_reg_employee_id ON attendance_regularization_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_att_reg_date ON attendance_regularization_requests(attendance_date);
CREATE INDEX IF NOT EXISTS idx_att_reg_status ON attendance_regularization_requests(status);
CREATE INDEX IF NOT EXISTS idx_att_reg_approver_id ON attendance_regularization_requests(approver_id);
