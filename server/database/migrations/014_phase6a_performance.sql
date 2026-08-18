-- Migration: 014_phase6a_performance.sql
-- Description: Phase 6A Performance Management Module (Cycles, Goal/KRA/KPI Configuration, Employee & Manager Goals, Review Templates, Self/Manager Reviews, Ratings, Finalization, and Immutable Review History)

-- 1. PERFORMANCE REVIEW TEMPLATES
CREATE TABLE IF NOT EXISTS performance_review_templates (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    code VARCHAR(64) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    rating_scale JSONB NOT NULL DEFAULT '[]',
    competencies JSONB NOT NULL DEFAULT '[]',
    goal_weightage_pct DECIMAL(5, 2) NOT NULL DEFAULT 60.00,
    competency_weightage_pct DECIMAL(5, 2) NOT NULL DEFAULT 40.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_perf_template_code UNIQUE (company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_perf_temp_comp ON performance_review_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_perf_temp_active ON performance_review_templates(is_active);

-- 2. PERFORMANCE CYCLES
CREATE TABLE IF NOT EXISTS performance_cycles (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    code VARCHAR(64) NOT NULL,
    name VARCHAR(200) NOT NULL,
    cycle_type VARCHAR(30) NOT NULL DEFAULT 'ANNUAL' CHECK (cycle_type IN ('ANNUAL', 'HALF_YEARLY', 'QUARTERLY', 'PROBATION', 'PROJECT')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    self_review_deadline DATE NOT NULL,
    manager_review_deadline DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'GOAL_SETTING', 'ACTIVE', 'SELF_REVIEW', 'MANAGER_REVIEW', 'FINALIZING', 'COMPLETED', 'ARCHIVED')),
    description TEXT,
    default_template_id VARCHAR(64) REFERENCES performance_review_templates(id) ON DELETE SET NULL,
    created_by VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_perf_cycle_code UNIQUE (company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_perf_cycle_comp ON performance_cycles(company_id);
CREATE INDEX IF NOT EXISTS idx_perf_cycle_status ON performance_cycles(status);

-- 3. GOAL / KRA / KPI CATEGORIES
CREATE TABLE IF NOT EXISTS performance_goal_categories (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    code VARCHAR(64) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    default_weightage DECIMAL(5, 2) NOT NULL DEFAULT 20.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_perf_goal_cat_code UNIQUE (company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_perf_goal_cat_comp ON performance_goal_categories(company_id);

-- 4. PERFORMANCE GOALS / KRAS (Employee and Manager Goals)
CREATE TABLE IF NOT EXISTS performance_goals (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    cycle_id VARCHAR(64) NOT NULL REFERENCES performance_cycles(id) ON DELETE CASCADE,
    employee_id VARCHAR(64) NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    category VARCHAR(100) NOT NULL DEFAULT 'OPERATIONAL',
    title VARCHAR(255) NOT NULL,
    description TEXT,
    measurement_type VARCHAR(30) NOT NULL DEFAULT 'PERCENTAGE' CHECK (measurement_type IN ('PERCENTAGE', 'NUMERIC', 'CURRENCY', 'BOOLEAN', 'MILESTONE')),
    target_value DECIMAL(14, 2) NOT NULL DEFAULT 100.00,
    unit VARCHAR(30) NOT NULL DEFAULT '%',
    current_value DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    weightage DECIMAL(5, 2) NOT NULL DEFAULT 20.00,
    due_date DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    parent_goal_id VARCHAR(64) REFERENCES performance_goals(id) ON DELETE SET NULL,
    is_manager_goal BOOLEAN NOT NULL DEFAULT FALSE,
    self_rating DECIMAL(3, 2),
    self_comment TEXT,
    manager_rating DECIMAL(3, 2),
    manager_comment TEXT,
    final_score DECIMAL(5, 2),
    created_by VARCHAR(64) NOT NULL,
    approved_by VARCHAR(64) REFERENCES employees(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_perf_goals_comp ON performance_goals(company_id);
CREATE INDEX IF NOT EXISTS idx_perf_goals_cycle ON performance_goals(cycle_id);
CREATE INDEX IF NOT EXISTS idx_perf_goals_emp ON performance_goals(employee_id);
CREATE INDEX IF NOT EXISTS idx_perf_goals_parent ON performance_goals(parent_goal_id);
CREATE INDEX IF NOT EXISTS idx_perf_goals_status ON performance_goals(status);

-- 5. PERFORMANCE REVIEWS / APPRAISALS
CREATE TABLE IF NOT EXISTS performance_reviews (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    cycle_id VARCHAR(64) NOT NULL REFERENCES performance_cycles(id) ON DELETE CASCADE,
    employee_id VARCHAR(64) NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    reviewer_id VARCHAR(64) NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    template_id VARCHAR(64) NOT NULL REFERENCES performance_review_templates(id) ON DELETE RESTRICT,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'GOALS_SUBMITTED', 'SELF_REVIEW_PENDING', 'MANAGER_REVIEW_PENDING', 'IN_REVIEW', 'COMPLETED', 'FINALIZED')),
    self_overall_rating DECIMAL(3, 2),
    self_overall_comments TEXT,
    self_strengths TEXT,
    self_improvements TEXT,
    self_submitted_at TIMESTAMPTZ,
    self_competency_ratings JSONB NOT NULL DEFAULT '[]',
    manager_overall_rating DECIMAL(3, 2),
    manager_overall_comments TEXT,
    manager_strengths TEXT,
    manager_improvements TEXT,
    manager_recommendations VARCHAR(50) DEFAULT 'NONE' CHECK (manager_recommendations IN ('NONE', 'PROMOTION', 'SALARY_HIKE', 'BONUS', 'TRAINING', 'PIP', 'ROLE_CHANGE')),
    manager_submitted_at TIMESTAMPTZ,
    manager_competency_ratings JSONB NOT NULL DEFAULT '[]',
    final_rating DECIMAL(3, 2),
    final_score DECIMAL(5, 2),
    final_grade VARCHAR(30),
    final_comments TEXT,
    finalized_by VARCHAR(64),
    finalized_at TIMESTAMPTZ,
    is_finalized BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_cycle_employee_review UNIQUE (cycle_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_perf_rev_comp ON performance_reviews(company_id);
CREATE INDEX IF NOT EXISTS idx_perf_rev_cycle ON performance_reviews(cycle_id);
CREATE INDEX IF NOT EXISTS idx_perf_rev_emp ON performance_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_perf_rev_mgr ON performance_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_perf_rev_status ON performance_reviews(status);
CREATE INDEX IF NOT EXISTS idx_perf_rev_finalized ON performance_reviews(is_finalized);

-- 6. IMMUTABLE PERFORMANCE REVIEW HISTORY
CREATE TABLE IF NOT EXISTS performance_review_history (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    review_id VARCHAR(64) NOT NULL REFERENCES performance_reviews(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    previous_status VARCHAR(30),
    new_status VARCHAR(30) NOT NULL,
    actor_id VARCHAR(64) NOT NULL,
    actor_name VARCHAR(200) NOT NULL,
    actor_role VARCHAR(50) NOT NULL,
    comment TEXT,
    snapshot_data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_perf_hist_comp ON performance_review_history(company_id);
CREATE INDEX IF NOT EXISTS idx_perf_hist_rev ON performance_review_history(review_id);
CREATE INDEX IF NOT EXISTS idx_perf_hist_created ON performance_review_history(created_at);
