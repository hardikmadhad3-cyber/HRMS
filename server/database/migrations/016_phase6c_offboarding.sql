-- ============================================================================
-- MIGRATION: 016_phase6c_offboarding.sql
-- Description: Phase 6C Offboarding & Separation Schema
-- Multi-Company Isolation, Real Foreign Keys, Clearance Checklist, Audit History
-- ============================================================================

-- 1. OFFBOARDING REQUESTS
CREATE TABLE IF NOT EXISTS offboarding_requests (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    request_number VARCHAR(64) NOT NULL,
    employee_id VARCHAR(64) NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    separation_type VARCHAR(64) NOT NULL,
    reason TEXT NOT NULL,
    submission_date DATE NOT NULL,
    proposed_last_working_date DATE NOT NULL,
    official_last_working_date DATE NOT NULL,
    notice_period_days INTEGER NOT NULL DEFAULT 30,
    notice_period_waived_days INTEGER DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'INITIATED',
    approved_by VARCHAR(64),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    manager_clearance_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    it_clearance_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    hr_clearance_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    finance_clearance_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    all_clearances_completed BOOLEAN NOT NULL DEFAULT false,
    exit_interview_completed BOOLEAN NOT NULL DEFAULT false,
    final_status_transition_done BOOLEAN NOT NULL DEFAULT false,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_offboarding_company_number UNIQUE (company_id, request_number)
);

CREATE INDEX IF NOT EXISTS idx_offboarding_company_emp ON offboarding_requests(company_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_offboarding_company_status ON offboarding_requests(company_id, status);

-- 2. OFFBOARDING CLEARANCE ITEMS (Departmental checklist tasks)
CREATE TABLE IF NOT EXISTS offboarding_clearance_items (
    id VARCHAR(64) PRIMARY KEY,
    offboarding_id VARCHAR(64) NOT NULL REFERENCES offboarding_requests(id) ON DELETE CASCADE,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    department VARCHAR(32) NOT NULL,
    item_key VARCHAR(64) NOT NULL,
    item_title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    cleared_by VARCHAR(64),
    cleared_at TIMESTAMP WITH TIME ZONE,
    remarks TEXT,
    related_asset_id VARCHAR(64) REFERENCES asset_master(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_offboarding_clearance_req ON offboarding_clearance_items(offboarding_id);
CREATE INDEX IF NOT EXISTS idx_offboarding_clearance_dept ON offboarding_clearance_items(department, status);

-- 3. EXIT INTERVIEWS
CREATE TABLE IF NOT EXISTS exit_interviews (
    id VARCHAR(64) PRIMARY KEY,
    offboarding_id VARCHAR(64) NOT NULL REFERENCES offboarding_requests(id) ON DELETE CASCADE,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id VARCHAR(64) NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    interview_date DATE NOT NULL,
    conducted_by VARCHAR(64) NOT NULL,
    primary_reason_for_leaving VARCHAR(255) NOT NULL,
    overall_experience_rating INTEGER NOT NULL CHECK (overall_experience_rating BETWEEN 1 AND 5),
    manager_feedback_rating INTEGER NOT NULL CHECK (manager_feedback_rating BETWEEN 1 AND 5),
    company_culture_rating INTEGER NOT NULL CHECK (company_culture_rating BETWEEN 1 AND 5),
    compensation_feedback TEXT,
    suggestions_for_improvement TEXT,
    would_recommend_company BOOLEAN NOT NULL DEFAULT true,
    confidential_notes TEXT,
    completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_exit_interview_offboarding UNIQUE (offboarding_id)
);

CREATE INDEX IF NOT EXISTS idx_exit_interviews_company ON exit_interviews(company_id);

-- 4. OFFBOARDING HISTORY (Audit ledger)
CREATE TABLE IF NOT EXISTS offboarding_history (
    id VARCHAR(64) PRIMARY KEY,
    offboarding_id VARCHAR(64) NOT NULL REFERENCES offboarding_requests(id) ON DELETE CASCADE,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    action VARCHAR(64) NOT NULL,
    actor_id VARCHAR(64) NOT NULL,
    actor_name VARCHAR(255) NOT NULL,
    actor_role VARCHAR(64) NOT NULL,
    details TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_offboarding_history_req ON offboarding_history(offboarding_id);
