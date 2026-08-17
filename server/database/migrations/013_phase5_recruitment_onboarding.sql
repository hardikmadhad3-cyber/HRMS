-- Migration: 013_phase5_recruitment_onboarding.sql
-- Description: Phase 5 Recruitment & Onboarding Module (Requisitions, Openings, Candidates, Applications, Interviews, Offers, Onboarding Checklists & Employee Handoff)

-- 1. JOB REQUISITIONS
CREATE TABLE IF NOT EXISTS job_requisitions (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    requisition_number VARCHAR(64) NOT NULL,
    title VARCHAR(200) NOT NULL,
    department_id VARCHAR(64) NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    designation_id VARCHAR(64) NOT NULL REFERENCES designations(id) ON DELETE RESTRICT,
    branch_id VARCHAR(64) REFERENCES branches(id) ON DELETE RESTRICT,
    work_location_id VARCHAR(64) NOT NULL REFERENCES work_locations(id) ON DELETE RESTRICT,
    openings_count INT NOT NULL DEFAULT 1,
    filled_count INT NOT NULL DEFAULT 0,
    min_experience_years DECIMAL(4, 1) NOT NULL DEFAULT 0,
    max_experience_years DECIMAL(4, 1) NOT NULL DEFAULT 0,
    min_salary DECIMAL(14, 2) NOT NULL DEFAULT 0,
    max_salary DECIMAL(14, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    employment_type VARCHAR(30) NOT NULL DEFAULT 'FULL_TIME',
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'ON_HOLD', 'CLOSED')),
    hiring_manager_id VARCHAR(64) REFERENCES employees(id) ON DELETE SET NULL,
    recruiter_id VARCHAR(64) REFERENCES employees(id) ON DELETE SET NULL,
    job_description TEXT,
    required_skills JSONB NOT NULL DEFAULT '[]',
    target_hire_date DATE,
    created_by VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_requisition_number UNIQUE (company_id, requisition_number)
);

CREATE INDEX IF NOT EXISTS idx_job_reqs_comp ON job_requisitions(company_id);
CREATE INDEX IF NOT EXISTS idx_job_reqs_status ON job_requisitions(status);
CREATE INDEX IF NOT EXISTS idx_job_reqs_dept ON job_requisitions(department_id);

-- 2. CANDIDATES
CREATE TABLE IF NOT EXISTS candidates (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(200) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    current_company VARCHAR(200),
    current_designation VARCHAR(100),
    current_ctc DECIMAL(14, 2) DEFAULT 0,
    expected_ctc DECIMAL(14, 2) DEFAULT 0,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    experience_years DECIMAL(4, 1) NOT NULL DEFAULT 0,
    notice_period_days INT NOT NULL DEFAULT 30,
    skills JSONB NOT NULL DEFAULT '[]',
    resume_url TEXT,
    source VARCHAR(50) NOT NULL DEFAULT 'DIRECT',
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED', 'HIRED', 'BLACKLISTED')),
    employee_id VARCHAR(64) REFERENCES employees(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_candidate_email_company UNIQUE (company_id, email)
);

CREATE INDEX IF NOT EXISTS idx_candidates_comp ON candidates(company_id);
CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);
CREATE INDEX IF NOT EXISTS idx_candidates_emp ON candidates(employee_id);

-- 3. APPLICATIONS
CREATE TABLE IF NOT EXISTS applications (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    candidate_id VARCHAR(64) NOT NULL REFERENCES candidates(id) ON DELETE RESTRICT,
    requisition_id VARCHAR(64) NOT NULL REFERENCES job_requisitions(id) ON DELETE RESTRICT,
    application_number VARCHAR(64) NOT NULL,
    applied_date DATE NOT NULL,
    stage VARCHAR(30) NOT NULL DEFAULT 'SOURCED' CHECK (stage IN ('SOURCED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED', 'WITHDRAWN')),
    status VARCHAR(30) NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'SHORTLISTED', 'INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED', 'OFFERED', 'OFFER_ACCEPTED', 'OFFER_DECLINED', 'HIRED', 'REJECTED', 'WITHDRAWN')),
    source VARCHAR(50) NOT NULL DEFAULT 'DIRECT',
    rating INT CHECK (rating BETWEEN 1 AND 5),
    rejection_reason TEXT,
    recruiter_id VARCHAR(64) REFERENCES employees(id) ON DELETE SET NULL,
    hiring_manager_id VARCHAR(64) REFERENCES employees(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_app_candidate_req UNIQUE (candidate_id, requisition_id),
    CONSTRAINT uq_app_number_comp UNIQUE (company_id, application_number)
);

CREATE INDEX IF NOT EXISTS idx_apps_comp ON applications(company_id);
CREATE INDEX IF NOT EXISTS idx_apps_cand ON applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_apps_req ON applications(requisition_id);
CREATE INDEX IF NOT EXISTS idx_apps_stage ON applications(stage);

-- 4. RECRUITMENT INTERVIEWS & SCORECARDS
CREATE TABLE IF NOT EXISTS recruitment_interviews (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    application_id VARCHAR(64) NOT NULL REFERENCES applications(id) ON DELETE RESTRICT,
    candidate_id VARCHAR(64) NOT NULL REFERENCES candidates(id) ON DELETE RESTRICT,
    round_number INT NOT NULL DEFAULT 1,
    round_name VARCHAR(100) NOT NULL,
    interview_type VARCHAR(30) NOT NULL DEFAULT 'VIDEO',
    scheduled_start_time TIMESTAMPTZ NOT NULL,
    scheduled_end_time TIMESTAMPTZ NOT NULL,
    meeting_link TEXT,
    location VARCHAR(200),
    interviewer_ids JSONB NOT NULL DEFAULT '[]',
    status VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED', 'NO_SHOW')),
    
    -- Scorecard & Evaluation Feedback
    feedback_submitted BOOLEAN NOT NULL DEFAULT FALSE,
    feedback_rating INT CHECK (feedback_rating BETWEEN 1 AND 5),
    feedback_recommendation VARCHAR(30) CHECK (feedback_recommendation IN ('STRONG_YES', 'YES', 'NEUTRAL', 'NO', 'STRONG_NO')),
    feedback_strengths TEXT,
    feedback_weaknesses TEXT,
    feedback_notes TEXT,
    feedback_submitted_at TIMESTAMPTZ,
    feedback_submitted_by VARCHAR(64),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interviews_comp ON recruitment_interviews(company_id);
CREATE INDEX IF NOT EXISTS idx_interviews_app ON recruitment_interviews(application_id);
CREATE INDEX IF NOT EXISTS idx_interviews_cand ON recruitment_interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interviews_status ON recruitment_interviews(status);

-- 5. JOB OFFERS
CREATE TABLE IF NOT EXISTS job_offers (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    application_id VARCHAR(64) NOT NULL REFERENCES applications(id) ON DELETE RESTRICT,
    candidate_id VARCHAR(64) NOT NULL REFERENCES candidates(id) ON DELETE RESTRICT,
    requisition_id VARCHAR(64) NOT NULL REFERENCES job_requisitions(id) ON DELETE RESTRICT,
    offer_number VARCHAR(64) NOT NULL,
    version INT NOT NULL DEFAULT 1,
    
    designation_id VARCHAR(64) NOT NULL REFERENCES designations(id) ON DELETE RESTRICT,
    department_id VARCHAR(64) NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    branch_id VARCHAR(64) REFERENCES branches(id) ON DELETE RESTRICT,
    work_location_id VARCHAR(64) NOT NULL REFERENCES work_locations(id) ON DELETE RESTRICT,
    
    joining_date DATE NOT NULL,
    annual_ctc DECIMAL(14, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    basic_salary DECIMAL(14, 2) NOT NULL,
    hra_salary DECIMAL(14, 2) NOT NULL DEFAULT 0,
    special_allowance DECIMAL(14, 2) NOT NULL DEFAULT 0,
    variable_bonus DECIMAL(14, 2) NOT NULL DEFAULT 0,
    probation_months INT NOT NULL DEFAULT 3,
    notice_period_days INT NOT NULL DEFAULT 30,
    
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'WITHDRAWN')),
    issued_date DATE,
    expiry_date DATE,
    accepted_at TIMESTAMPTZ,
    declined_reason TEXT,
    
    created_by VARCHAR(64) NOT NULL,
    approved_by VARCHAR(64),
    notes TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_offer_number_comp UNIQUE (company_id, offer_number)
);

CREATE INDEX IF NOT EXISTS idx_offers_comp ON job_offers(company_id);
CREATE INDEX IF NOT EXISTS idx_offers_app ON job_offers(application_id);
CREATE INDEX IF NOT EXISTS idx_offers_cand ON job_offers(candidate_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON job_offers(status);

-- 6. CANDIDATE STATUS HISTORY
CREATE TABLE IF NOT EXISTS candidate_status_history (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    candidate_id VARCHAR(64) NOT NULL REFERENCES candidates(id) ON DELETE RESTRICT,
    application_id VARCHAR(64) NOT NULL REFERENCES applications(id) ON DELETE RESTRICT,
    previous_stage VARCHAR(30),
    new_stage VARCHAR(30) NOT NULL,
    previous_status VARCHAR(30),
    new_status VARCHAR(30) NOT NULL,
    reason TEXT,
    changed_by VARCHAR(64) NOT NULL,
    changed_by_name VARCHAR(120),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_csh_comp ON candidate_status_history(company_id);
CREATE INDEX IF NOT EXISTS idx_csh_app ON candidate_status_history(application_id);

-- 7. ONBOARDING TEMPLATES
CREATE TABLE IF NOT EXISTS onboarding_templates (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    template_name VARCHAR(150) NOT NULL,
    description TEXT,
    department_id VARCHAR(64) REFERENCES departments(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    tasks JSONB NOT NULL DEFAULT '[]',
    required_documents JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onb_temp_comp ON onboarding_templates(company_id);

-- 8. EMPLOYEE ONBOARDINGS
CREATE TABLE IF NOT EXISTS employee_onboardings (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    candidate_id VARCHAR(64) NOT NULL REFERENCES candidates(id) ON DELETE RESTRICT,
    application_id VARCHAR(64) NOT NULL REFERENCES applications(id) ON DELETE RESTRICT,
    job_offer_id VARCHAR(64) NOT NULL REFERENCES job_offers(id) ON DELETE RESTRICT,
    template_id VARCHAR(64) REFERENCES onboarding_templates(id) ON DELETE SET NULL,
    onboarding_number VARCHAR(64) NOT NULL,
    
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(200) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    
    department_id VARCHAR(64) NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    designation_id VARCHAR(64) NOT NULL REFERENCES designations(id) ON DELETE RESTRICT,
    branch_id VARCHAR(64) NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    work_location_id VARCHAR(64) NOT NULL REFERENCES work_locations(id) ON DELETE RESTRICT,
    joining_date DATE NOT NULL,
    
    status VARCHAR(30) NOT NULL DEFAULT 'NOT_STARTED' CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    overall_progress INT NOT NULL DEFAULT 0,
    
    employee_id VARCHAR(64) REFERENCES employees(id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ,
    completed_by VARCHAR(64),
    
    joining_details JSONB NOT NULL DEFAULT '{}',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_onboarding_number_comp UNIQUE (company_id, onboarding_number)
);

CREATE INDEX IF NOT EXISTS idx_onb_comp ON employee_onboardings(company_id);
CREATE INDEX IF NOT EXISTS idx_onb_cand ON employee_onboardings(candidate_id);
CREATE INDEX IF NOT EXISTS idx_onb_status ON employee_onboardings(status);
CREATE INDEX IF NOT EXISTS idx_onb_emp ON employee_onboardings(employee_id);

-- 9. ONBOARDING TASKS
CREATE TABLE IF NOT EXISTS onboarding_tasks (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    onboarding_id VARCHAR(64) NOT NULL REFERENCES employee_onboardings(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(30) NOT NULL DEFAULT 'HR' CHECK (category IN ('HR', 'IT', 'FINANCE', 'WORKSPACE', 'COMPLIANCE', 'TRAINING')),
    due_date DATE NOT NULL,
    assignee_id VARCHAR(64) REFERENCES employees(id) ON DELETE SET NULL,
    assignee_name VARCHAR(120),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'WAIVED')),
    completed_at TIMESTAMPTZ,
    completed_by VARCHAR(64),
    completed_by_name VARCHAR(120),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onb_tasks_comp ON onboarding_tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_onb_tasks_onb ON onboarding_tasks(onboarding_id);
CREATE INDEX IF NOT EXISTS idx_onb_tasks_status ON onboarding_tasks(status);

-- 10. ONBOARDING DOCUMENTS
CREATE TABLE IF NOT EXISTS onboarding_documents (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    onboarding_id VARCHAR(64) NOT NULL REFERENCES employee_onboardings(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    document_name VARCHAR(200) NOT NULL,
    file_url TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUBMITTED', 'VERIFIED', 'REJECTED')),
    rejection_reason TEXT,
    submitted_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,
    verified_by VARCHAR(64),
    verified_by_name VARCHAR(120),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onb_docs_comp ON onboarding_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_onb_docs_onb ON onboarding_documents(onboarding_id);
CREATE INDEX IF NOT EXISTS idx_onb_docs_status ON onboarding_documents(status);
