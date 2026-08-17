-- Migration: 002_phase1b_organization.sql
-- Description: Phase 1B Organization Master Data tables, relationships, indexes, and constraints

-- 1. COMPANIES (Legal Entities)
CREATE TABLE IF NOT EXISTS companies (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    locale VARCHAR(20) NOT NULL DEFAULT 'en-US',
    timezone VARCHAR(50) NOT NULL DEFAULT 'America/New_York',
    tax_identifier VARCHAR(100),
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50),
    address TEXT NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(64),
    updated_by VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_companies_code ON companies(code);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);

-- 2. BRANCHES (Operating Branches per Company)
CREATE TABLE IF NOT EXISTS branches (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    timezone_override VARCHAR(50),
    address TEXT NOT NULL,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'USA',
    postal_code VARCHAR(20),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    contact_person VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(64),
    updated_by VARCHAR(64),
    CONSTRAINT uq_branches_company_code UNIQUE (company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_branches_company_id ON branches(company_id);
CREATE INDEX IF NOT EXISTS idx_branches_code ON branches(code);
CREATE INDEX IF NOT EXISTS idx_branches_status ON branches(status);

-- 3. DEPARTMENTS (Department Structure with Hierarchy Support)
CREATE TABLE IF NOT EXISTS departments (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    parent_department_id VARCHAR(64) REFERENCES departments(id) ON DELETE RESTRICT,
    department_head_id VARCHAR(64),
    department_head_name VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(64),
    updated_by VARCHAR(64),
    CONSTRAINT uq_departments_company_code UNIQUE (company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_departments_company_id ON departments(company_id);
CREATE INDEX IF NOT EXISTS idx_departments_code ON departments(code);
CREATE INDEX IF NOT EXISTS idx_departments_parent_id ON departments(parent_department_id);
CREATE INDEX IF NOT EXISTS idx_departments_status ON departments(status);

-- 4. DESIGNATIONS (Job Titles & Grade Levels)
CREATE TABLE IF NOT EXISTS designations (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    grade_level VARCHAR(50),
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(64),
    updated_by VARCHAR(64),
    CONSTRAINT uq_designations_company_code UNIQUE (company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_designations_company_id ON designations(company_id);
CREATE INDEX IF NOT EXISTS idx_designations_code ON designations(code);
CREATE INDEX IF NOT EXISTS idx_designations_status ON designations(status);

-- 5. WORK LOCATIONS (Physical & Remote Worksites)
CREATE TABLE IF NOT EXISTS work_locations (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    branch_id VARCHAR(64) REFERENCES branches(id) ON DELETE SET NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    country VARCHAR(100) NOT NULL DEFAULT 'USA',
    postal_code VARCHAR(20),
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(64),
    updated_by VARCHAR(64),
    CONSTRAINT uq_work_locations_company_code UNIQUE (company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_work_locations_company_id ON work_locations(company_id);
CREATE INDEX IF NOT EXISTS idx_work_locations_branch_id ON work_locations(branch_id);
CREATE INDEX IF NOT EXISTS idx_work_locations_code ON work_locations(code);
CREATE INDEX IF NOT EXISTS idx_work_locations_status ON work_locations(status);

-- 6. HOLIDAY CALENDAR (Company & Location-specific Holidays)
CREATE TABLE IF NOT EXISTS holidays (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    work_location_id VARCHAR(64) REFERENCES work_locations(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'PUBLIC' CHECK (type IN ('PUBLIC', 'OPTIONAL', 'RESTRICTED', 'COMPANY')),
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(64),
    updated_by VARCHAR(64),
    CONSTRAINT uq_holidays_company_date_name UNIQUE (company_id, date, name)
);

CREATE INDEX IF NOT EXISTS idx_holidays_company_id ON holidays(company_id);
CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);
CREATE INDEX IF NOT EXISTS idx_holidays_location_id ON holidays(work_location_id);
