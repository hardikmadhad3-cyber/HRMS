-- Migration: 003_phase1c_employee_core.sql
-- Description: Phase 1C Employee Core tables, effective-dated assignments, addresses, bank, statutory, documents, and history

-- 1. EMPLOYEES (Stable Employee Master Identity)
CREATE TABLE IF NOT EXISTS employees (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    employee_code VARCHAR(50) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    gender VARCHAR(20) NOT NULL CHECK (gender IN ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY')),
    date_of_birth DATE NOT NULL,
    marital_status VARCHAR(20) CHECK (marital_status IN ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'OTHER')),
    nationality VARCHAR(100) DEFAULT 'Indian',
    blood_group VARCHAR(10),
    personal_email VARCHAR(255),
    work_email VARCHAR(255) NOT NULL,
    mobile_number VARCHAR(50) NOT NULL,
    avatar_url TEXT,
    joining_date DATE NOT NULL,
    confirmation_date DATE,
    probation_period_months INT DEFAULT 3,
    notice_period_days INT DEFAULT 30,
    employment_type VARCHAR(30) NOT NULL DEFAULT 'FULL_TIME' CHECK (employment_type IN ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'PROBATION', 'INTERN', 'TEMPORARY')),
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ON_LEAVE', 'PROBATION', 'NOTICE_PERIOD', 'SUSPENDED', 'RESIGNED', 'TERMINATED', 'RETIRED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(64),
    updated_by VARCHAR(64),
    CONSTRAINT uq_employees_company_code UNIQUE (company_id, employee_code)
);

CREATE INDEX IF NOT EXISTS idx_employees_company_id ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_code ON employees(employee_code);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_work_email ON employees(work_email);
CREATE INDEX IF NOT EXISTS idx_employees_joining_date ON employees(joining_date);

-- 2. EMPLOYEE ASSIGNMENTS (Effective-Dated Organizational Hierarchy)
CREATE TABLE IF NOT EXISTS employee_assignments (
    id VARCHAR(64) PRIMARY KEY,
    employee_id VARCHAR(64) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    branch_id VARCHAR(64) NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    department_id VARCHAR(64) NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    designation_id VARCHAR(64) NOT NULL REFERENCES designations(id) ON DELETE RESTRICT,
    work_location_id VARCHAR(64) NOT NULL REFERENCES work_locations(id) ON DELETE RESTRICT,
    manager_id VARCHAR(64) REFERENCES employees(id) ON DELETE SET NULL,
    effective_from DATE NOT NULL,
    effective_to DATE, -- NULL indicates current active assignment
    change_reason VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_emp_assign_employee_id ON employee_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_emp_assign_company_id ON employee_assignments(company_id);
CREATE INDEX IF NOT EXISTS idx_emp_assign_effective ON employee_assignments(effective_from, effective_to);
CREATE INDEX IF NOT EXISTS idx_emp_assign_dept ON employee_assignments(department_id);
CREATE INDEX IF NOT EXISTS idx_emp_assign_desig ON employee_assignments(designation_id);
CREATE INDEX IF NOT EXISTS idx_emp_assign_manager ON employee_assignments(manager_id);

-- 3. EMPLOYEE ADDRESSES
CREATE TABLE IF NOT EXISTS employee_addresses (
    id VARCHAR(64) PRIMARY KEY,
    employee_id VARCHAR(64) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('CURRENT', 'PERMANENT', 'OFFICE')),
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'India',
    postal_code VARCHAR(20) NOT NULL,
    is_same_as_current BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emp_addr_employee_id ON employee_addresses(employee_id);

-- 4. EMPLOYEE EMERGENCY CONTACTS
CREATE TABLE IF NOT EXISTS employee_emergency_contacts (
    id VARCHAR(64) PRIMARY KEY,
    employee_id VARCHAR(64) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    contact_name VARCHAR(255) NOT NULL,
    relationship VARCHAR(50) NOT NULL,
    phone_number VARCHAR(50) NOT NULL,
    alternate_phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    is_primary BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emp_emg_employee_id ON employee_emergency_contacts(employee_id);

-- 5. EMPLOYEE BANK ACCOUNTS (Sensitive Information)
CREATE TABLE IF NOT EXISTS employee_bank_accounts (
    id VARCHAR(64) PRIMARY KEY,
    employee_id VARCHAR(64) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    account_holder_name VARCHAR(255) NOT NULL,
    bank_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    ifsc_code VARCHAR(20) NOT NULL,
    branch_name VARCHAR(255),
    account_type VARCHAR(20) NOT NULL DEFAULT 'SAVINGS' CHECK (account_type IN ('SAVINGS', 'CURRENT', 'SALARY')),
    is_primary BOOLEAN NOT NULL DEFAULT true,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(64),
    updated_by VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_emp_bank_employee_id ON employee_bank_accounts(employee_id);

-- 6. EMPLOYEE STATUTORY DETAILS (Sensitive Information)
CREATE TABLE IF NOT EXISTS employee_statutory_details (
    id VARCHAR(64) PRIMARY KEY,
    employee_id VARCHAR(64) NOT NULL REFERENCES employees(id) ON DELETE CASCADE UNIQUE,
    pan_number VARCHAR(30),
    aadhaar_number VARCHAR(30),
    uan_number VARCHAR(30),
    pf_number VARCHAR(50),
    esi_number VARCHAR(50),
    tax_regime VARCHAR(20) DEFAULT 'NEW' CHECK (tax_regime IN ('OLD', 'NEW')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(64),
    updated_by VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_emp_statutory_employee_id ON employee_statutory_details(employee_id);

-- 7. EMPLOYEE DOCUMENTS (Document Metadata & File References)
CREATE TABLE IF NOT EXISTS employee_documents (
    id VARCHAR(64) PRIMARY KEY,
    employee_id VARCHAR(64) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('OFFER_LETTER', 'RESUME', 'GOVERNMENT_ID', 'EDUCATIONAL_CERTIFICATE', 'EXPERIENCE_LETTER', 'ADDRESS_PROOF', 'TAX_DECLARATION', 'OTHER')),
    title VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes INT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    storage_path TEXT NOT NULL,
    issue_date DATE,
    expiry_date DATE,
    verification_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED')),
    verified_by VARCHAR(64),
    verified_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_emp_docs_employee_id ON employee_documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_emp_docs_company_id ON employee_documents(company_id);

-- 8. EMPLOYEE STATUS HISTORY (Controlled Lifecycle Auditing)
CREATE TABLE IF NOT EXISTS employee_status_history (
    id VARCHAR(64) PRIMARY KEY,
    employee_id VARCHAR(64) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    previous_status VARCHAR(30) NOT NULL,
    new_status VARCHAR(30) NOT NULL,
    effective_date DATE NOT NULL,
    reason VARCHAR(255) NOT NULL,
    comments TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(64) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_emp_stat_hist_employee_id ON employee_status_history(employee_id);
