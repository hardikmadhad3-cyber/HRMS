-- Migration: 006_phase2c_attendance_finalization.sql
-- Description: Phase 2C Overtime Management, Attendance Periods, Finalization Engine, and Payroll-Ready Attendance Summary

-- 1. OVERTIME POLICIES (Company-Level Overtime Rules)
CREATE TABLE IF NOT EXISTS overtime_policies (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    min_qualifying_minutes INT NOT NULL DEFAULT 30,
    rounding_interval_minutes INT NOT NULL DEFAULT 15,
    max_daily_ot_minutes INT NOT NULL DEFAULT 240,
    max_monthly_ot_minutes INT NOT NULL DEFAULT 3600,
    pre_approval_required BOOLEAN NOT NULL DEFAULT false,
    post_approval_allowed BOOLEAN NOT NULL DEFAULT true,
    weekly_off_eligible BOOLEAN NOT NULL DEFAULT true,
    holiday_eligible BOOLEAN NOT NULL DEFAULT true,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(64),
    CONSTRAINT uq_ot_policy_comp_code UNIQUE (company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_ot_policies_comp ON overtime_policies(company_id);

-- 2. OVERTIME REQUESTS & RECORDS (Employee & Manager Workflow)
CREATE TABLE IF NOT EXISTS overtime_requests (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    employee_id VARCHAR(64) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    daily_attendance_id VARCHAR(64) REFERENCES daily_attendance(id) ON DELETE SET NULL,
    calculated_minutes INT NOT NULL DEFAULT 0,
    requested_minutes INT NOT NULL DEFAULT 0,
    approved_minutes INT NOT NULL DEFAULT 0,
    reason VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
    approver_id VARCHAR(64) REFERENCES employees(id) ON DELETE SET NULL,
    approver_comments TEXT,
    actioned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(64),
    CONSTRAINT uq_ot_req_emp_date UNIQUE (employee_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_ot_req_company ON overtime_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_ot_req_emp ON overtime_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_ot_req_date ON overtime_requests(attendance_date);
CREATE INDEX IF NOT EXISTS idx_ot_req_status ON overtime_requests(status);
CREATE INDEX IF NOT EXISTS idx_ot_req_approver ON overtime_requests(approver_id);

-- 3. ATTENDANCE PERIODS (Monthly Attendance Cycle Master)
CREATE TABLE IF NOT EXISTS attendance_periods (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    year INT NOT NULL,
    month INT NOT NULL CHECK (month >= 1 AND month <= 12),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'REVIEW', 'FINALIZED', 'LOCKED')),
    finalized_at TIMESTAMPTZ,
    finalized_by VARCHAR(64),
    reopened_at TIMESTAMPTZ,
    reopened_by VARCHAR(64),
    reopen_reason TEXT,
    lock_version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(64),
    CONSTRAINT uq_att_period_comp_code UNIQUE (company_id, code),
    CONSTRAINT uq_att_period_comp_ym UNIQUE (company_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_att_periods_comp ON attendance_periods(company_id);
CREATE INDEX IF NOT EXISTS idx_att_periods_status ON attendance_periods(status);
CREATE INDEX IF NOT EXISTS idx_att_periods_date ON attendance_periods(start_date, end_date);

-- 4. ATTENDANCE PERIOD SUMMARIES (Payroll-Ready Attendance Summary Snapshot)
CREATE TABLE IF NOT EXISTS attendance_period_summaries (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    period_id VARCHAR(64) NOT NULL REFERENCES attendance_periods(id) ON DELETE CASCADE,
    employee_id VARCHAR(64) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    calendar_days INT NOT NULL DEFAULT 0,
    scheduled_work_days INT NOT NULL DEFAULT 0,
    present_days DECIMAL(5, 2) NOT NULL DEFAULT 0,
    absent_days DECIMAL(5, 2) NOT NULL DEFAULT 0,
    half_days INT NOT NULL DEFAULT 0,
    weekly_off_days INT NOT NULL DEFAULT 0,
    holiday_days INT NOT NULL DEFAULT 0,
    paid_leave_days DECIMAL(5, 2) NOT NULL DEFAULT 0,
    unpaid_leave_days DECIMAL(5, 2) NOT NULL DEFAULT 0,
    loss_of_pay_days DECIMAL(5, 2) NOT NULL DEFAULT 0,
    payable_days DECIMAL(5, 2) NOT NULL DEFAULT 0,
    late_arrivals_count INT NOT NULL DEFAULT 0,
    early_exits_count INT NOT NULL DEFAULT 0,
    total_late_minutes INT NOT NULL DEFAULT 0,
    total_early_exit_minutes INT NOT NULL DEFAULT 0,
    total_gross_work_minutes INT NOT NULL DEFAULT 0,
    total_net_work_minutes INT NOT NULL DEFAULT 0,
    calculated_overtime_minutes INT NOT NULL DEFAULT 0,
    approved_overtime_minutes INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'FINALIZED')),
    finalized_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_att_summary_period_emp UNIQUE (period_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_att_sum_company ON attendance_period_summaries(company_id);
CREATE INDEX IF NOT EXISTS idx_att_sum_period ON attendance_period_summaries(period_id);
CREATE INDEX IF NOT EXISTS idx_att_sum_emp ON attendance_period_summaries(employee_id);
CREATE INDEX IF NOT EXISTS idx_att_sum_status ON attendance_period_summaries(status);

-- 5. EXTEND DAILY ATTENDANCE WITH OVERTIME ATTRIBUTES (IF NOT EXISTS)
ALTER TABLE daily_attendance ADD COLUMN IF NOT EXISTS calculated_overtime_minutes INT NOT NULL DEFAULT 0;
ALTER TABLE daily_attendance ADD COLUMN IF NOT EXISTS approved_overtime_minutes INT NOT NULL DEFAULT 0;
ALTER TABLE daily_attendance ADD COLUMN IF NOT EXISTS overtime_request_id VARCHAR(64);
