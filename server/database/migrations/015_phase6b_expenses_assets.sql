-- ============================================================================
-- MIGRATION: 015_phase6b_expenses_assets.sql
-- Description: Phase 6B Expenses & Assets Schema
-- Multi-Company Isolation, Real Foreign Keys, Approval Lifecycle, Asset Tracking
-- ============================================================================

-- 1. EXPENSE CATEGORIES
CREATE TABLE IF NOT EXISTS expense_categories (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    max_limit_per_claim NUMERIC(14, 2),
    requires_receipt BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_expense_category_company_code UNIQUE (company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_expense_categories_company ON expense_categories(company_id);

-- 2. EXPENSE CLAIMS
CREATE TABLE IF NOT EXISTS expense_claims (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    claim_number VARCHAR(64) NOT NULL,
    employee_id VARCHAR(64) NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    submitted_at TIMESTAMP WITH TIME ZONE,
    manager_id VARCHAR(64) REFERENCES employees(id),
    manager_approved_at TIMESTAMP WITH TIME ZONE,
    manager_approved_by VARCHAR(64),
    manager_remarks TEXT,
    finance_approved_at TIMESTAMP WITH TIME ZONE,
    finance_approved_by VARCHAR(64),
    finance_remarks TEXT,
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejected_by VARCHAR(64),
    rejection_reason TEXT,
    returned_at TIMESTAMP WITH TIME ZONE,
    returned_by VARCHAR(64),
    return_reason TEXT,
    payment_date DATE,
    payment_reference VARCHAR(128),
    receipts_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_expense_claim_company_number UNIQUE (company_id, claim_number)
);

CREATE INDEX IF NOT EXISTS idx_expense_claims_company_emp ON expense_claims(company_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_expense_claims_company_status ON expense_claims(company_id, status);

-- 3. EXPENSE CLAIM ITEMS
CREATE TABLE IF NOT EXISTS expense_claim_items (
    id VARCHAR(64) PRIMARY KEY,
    claim_id VARCHAR(64) NOT NULL REFERENCES expense_claims(id) ON DELETE CASCADE,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    category_id VARCHAR(64) NOT NULL REFERENCES expense_categories(id) ON DELETE RESTRICT,
    expense_date DATE NOT NULL,
    amount NUMERIC(14, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    tax_amount NUMERIC(14, 2) DEFAULT 0.00,
    description TEXT NOT NULL,
    merchant_name VARCHAR(255),
    receipt_attachment_url TEXT,
    receipt_file_name VARCHAR(255),
    receipt_file_size INTEGER,
    receipt_mime_type VARCHAR(100),
    is_receipt_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_expense_claim_items_claim ON expense_claim_items(claim_id);
CREATE INDEX IF NOT EXISTS idx_expense_claim_items_company ON expense_claim_items(company_id);

-- 4. EXPENSE CLAIM HISTORY (Immutable Audit Ledger)
CREATE TABLE IF NOT EXISTS expense_claim_history (
    id VARCHAR(64) PRIMARY KEY,
    claim_id VARCHAR(64) NOT NULL REFERENCES expense_claims(id) ON DELETE CASCADE,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    action VARCHAR(64) NOT NULL,
    actor_id VARCHAR(64) NOT NULL,
    actor_name VARCHAR(255) NOT NULL,
    actor_role VARCHAR(64) NOT NULL,
    from_status VARCHAR(32),
    to_status VARCHAR(32),
    remarks TEXT,
    snapshot_data JSONB,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_expense_claim_history_claim ON expense_claim_history(claim_id);

-- 5. ASSET CATEGORIES
CREATE TABLE IF NOT EXISTS asset_categories (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    depreciation_years NUMERIC(5, 2),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_asset_category_company_code UNIQUE (company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_asset_categories_company ON asset_categories(company_id);

-- 6. ASSET MASTER
CREATE TABLE IF NOT EXISTS asset_master (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    asset_code VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category_id VARCHAR(64) NOT NULL REFERENCES asset_categories(id) ON DELETE RESTRICT,
    serial_number VARCHAR(128),
    model_number VARCHAR(128),
    manufacturer VARCHAR(128),
    purchase_date DATE,
    purchase_cost NUMERIC(14, 2),
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    warranty_expiry_date DATE,
    status VARCHAR(32) NOT NULL DEFAULT 'AVAILABLE',
    condition VARCHAR(32) NOT NULL DEFAULT 'NEW',
    location VARCHAR(255),
    current_employee_id VARCHAR(64) REFERENCES employees(id) ON DELETE SET NULL,
    assigned_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_asset_master_company_code UNIQUE (company_id, asset_code)
);

CREATE INDEX IF NOT EXISTS idx_asset_master_company_status ON asset_master(company_id, status);
CREATE INDEX IF NOT EXISTS idx_asset_master_current_emp ON asset_master(company_id, current_employee_id);

-- 7. ASSET ASSIGNMENTS
CREATE TABLE IF NOT EXISTS asset_assignments (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    asset_id VARCHAR(64) NOT NULL REFERENCES asset_master(id) ON DELETE CASCADE,
    employee_id VARCHAR(64) NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    assigned_date DATE NOT NULL,
    assigned_condition VARCHAR(32) NOT NULL,
    assigned_by VARCHAR(64) NOT NULL,
    assignment_notes TEXT,
    return_date DATE,
    return_condition VARCHAR(32),
    returned_to VARCHAR(64),
    return_notes TEXT,
    is_returned BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_asset_assignments_asset ON asset_assignments(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_assignments_emp ON asset_assignments(company_id, employee_id);

-- 8. ASSET ASSIGNMENT HISTORY (Condition and movement audit)
CREATE TABLE IF NOT EXISTS asset_assignment_history (
    id VARCHAR(64) PRIMARY KEY,
    asset_id VARCHAR(64) NOT NULL REFERENCES asset_master(id) ON DELETE CASCADE,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    action VARCHAR(64) NOT NULL,
    actor_id VARCHAR(64) NOT NULL,
    actor_name VARCHAR(255) NOT NULL,
    employee_id VARCHAR(64),
    details TEXT NOT NULL,
    condition VARCHAR(32),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_asset_assignment_history_asset ON asset_assignment_history(asset_id);
