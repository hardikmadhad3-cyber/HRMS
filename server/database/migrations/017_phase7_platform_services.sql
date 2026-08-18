-- ============================================================================
-- Migration 017: Phase 7 — Reporting, Notifications & Admin Hardening
-- Multi-Company Platform Services, Notification Engine, Audit & RBAC Hardening
-- ============================================================================

-- 1. In-App Notifications
CREATE TABLE IF NOT EXISTS in_app_notifications (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    recipient_user_id VARCHAR(64) NOT NULL,
    recipient_employee_id VARCHAR(64),
    category VARCHAR(64) NOT NULL, -- APPROVAL, ATTENDANCE, LEAVE, PAYROLL, RECRUITMENT, PERFORMANCE, EXPENSE, ASSET, OFFBOARDING, SYSTEM
    event_type VARCHAR(64) NOT NULL, -- REQUEST_SUBMITTED, APPROVED, REJECTED, EXCEPTION_TRIGGERED, PAYSLIP_READY, etc.
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link_url VARCHAR(255),
    severity VARCHAR(32) DEFAULT 'INFO', -- INFO, SUCCESS, WARNING, CRITICAL
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    metadata_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON in_app_notifications(recipient_user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_company ON in_app_notifications(company_id);

-- 2. System Settings (Company-scoped and Global Defaults)
CREATE TABLE IF NOT EXISTS system_settings (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    setting_key VARCHAR(128) NOT NULL,
    setting_value TEXT NOT NULL,
    category VARCHAR(64) NOT NULL, -- SECURITY, ATTENDANCE, LEAVE, PAYROLL, NOTIFICATIONS, GENERAL
    description TEXT,
    is_encrypted BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(64) NOT NULL,
    CONSTRAINT uq_company_setting_key UNIQUE(company_id, setting_key)
);

CREATE INDEX IF NOT EXISTS idx_settings_company_cat ON system_settings(company_id, category);

-- 3. Custom RBAC Roles & Granular Permission Matrix
CREATE TABLE IF NOT EXISTS custom_roles (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    role_key VARCHAR(64) NOT NULL,
    name VARCHAR(128) NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_company_role_key UNIQUE(company_id, role_key)
);

CREATE TABLE IF NOT EXISTS role_permissions (
    id VARCHAR(64) PRIMARY KEY,
    role_key VARCHAR(64) NOT NULL,
    permission_key VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_role_permission UNIQUE(role_key, permission_key)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_key);

-- 4. User Multi-Company Access Ledger
CREATE TABLE IF NOT EXISTS user_company_access (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    is_default BOOLEAN DEFAULT FALSE,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    granted_by VARCHAR(64) NOT NULL,
    CONSTRAINT uq_user_company UNIQUE(user_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_user_comp_access_user ON user_company_access(user_id);

-- 5. Operational Report Execution & Export Audit Logs
CREATE TABLE IF NOT EXISTS report_execution_logs (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    report_key VARCHAR(64) NOT NULL,
    report_title VARCHAR(128) NOT NULL,
    executed_by VARCHAR(64) NOT NULL,
    executed_by_name VARCHAR(128) NOT NULL,
    parameters_json JSONB,
    row_count INTEGER NOT NULL DEFAULT 0,
    export_format VARCHAR(32) NOT NULL, -- JSON, CSV, PDF, PREVIEW
    execution_time_ms INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_report_logs_comp ON report_execution_logs(company_id, created_at DESC);
