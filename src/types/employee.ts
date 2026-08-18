/**
 * HRMS Employee Core Types
 * Phase 1C Specification
 */

export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
export type MaritalStatus = 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED' | 'OTHER';
export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'PROBATION' | 'INTERN' | 'TEMPORARY';
export type EmploymentStatus = 'ACTIVE' | 'ON_LEAVE' | 'PROBATION' | 'NOTICE_PERIOD' | 'SUSPENDED' | 'RESIGNED' | 'TERMINATED' | 'RETIRED';

export type AddressType = 'CURRENT' | 'PERMANENT' | 'OFFICE';
export type BankAccountType = 'SAVINGS' | 'CURRENT' | 'SALARY';
export type TaxRegime = 'OLD' | 'NEW';
export type DocumentType =
  | 'OFFER_LETTER'
  | 'RESUME'
  | 'GOVERNMENT_ID'
  | 'EDUCATIONAL_CERTIFICATE'
  | 'EXPERIENCE_LETTER'
  | 'ADDRESS_PROOF'
  | 'TAX_DECLARATION'
  | 'OTHER';
export type DocumentVerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

// 1. Employee Identity (Master Record)
export interface Employee {
  id: string;
  companyId: string;
  employeeCode: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  displayName: string;
  gender: Gender;
  dateOfBirth: string; // YYYY-MM-DD
  maritalStatus?: MaritalStatus;
  nationality?: string;
  bloodGroup?: string;
  personalEmail?: string;
  workEmail: string;
  mobileNumber: string;
  avatarUrl?: string;
  joiningDate: string; // YYYY-MM-DD
  confirmationDate?: string;
  probationPeriodMonths?: number;
  noticePeriodDays?: number;
  employmentType: EmploymentType;
  status: EmploymentStatus;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

// 2. Organization Assignment (Effective-Dated)
export interface EmployeeAssignment {
  id: string;
  employeeId: string;
  companyId: string;
  branchId: string;
  departmentId: string;
  designationId: string;
  workLocationId: string;
  managerId?: string;
  effectiveFrom: string; // YYYY-MM-DD
  effectiveTo?: string; // YYYY-MM-DD or null for active
  changeReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;

  // Joined display labels
  companyName?: string;
  branchName?: string;
  departmentName?: string;
  designationName?: string;
  workLocationName?: string;
  managerName?: string;
  managerCode?: string;
}

// 3. Addresses
export interface EmployeeAddress {
  id: string;
  employeeId: string;
  type: AddressType;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  isSameAsCurrent?: boolean;
  createdAt: string;
  updatedAt: string;
}

// 4. Emergency Contacts
export interface EmployeeEmergencyContact {
  id: string;
  employeeId: string;
  contactName: string;
  relationship: string;
  phoneNumber: string;
  alternatePhone?: string;
  email?: string;
  address?: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

// 5. Bank Account (Sensitive)
export interface EmployeeBankAccount {
  id: string;
  employeeId: string;
  accountHolderName: string;
  bankName: string;
  accountNumber: string; // Masked if unauthorized: e.g. "••••••••1234"
  ifscCode: string;
  branchName?: string;
  accountType: BankAccountType;
  isPrimary: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

// 6. Statutory Details (Sensitive)
export interface EmployeeStatutoryDetails {
  id: string;
  employeeId: string;
  panNumber?: string; // Masked if unauthorized
  aadhaarNumber?: string; // Masked if unauthorized
  uanNumber?: string;
  pfNumber?: string;
  esiNumber?: string;
  taxRegime?: TaxRegime;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

// 7. Documents
export interface EmployeeDocument {
  id: string;
  employeeId: string;
  companyId: string;
  documentType: DocumentType;
  title: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  storagePath: string;
  issueDate?: string;
  expiryDate?: string;
  verificationStatus: DocumentVerificationStatus;
  verifiedBy?: string;
  verifiedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

// 8. Status History
export interface EmployeeStatusHistory {
  id: string;
  employeeId: string;
  previousStatus: EmploymentStatus;
  newStatus: EmploymentStatus;
  effectiveDate: string;
  reason: string;
  comments?: string;
  createdAt: string;
  createdBy: string;
  createdByName?: string;
}

// Aggregated Full Profile Structure returned by GET /api/v1/employees/:id
export interface EmployeeFullProfile {
  employee: Employee;
  currentAssignment: EmployeeAssignment | null;
  assignmentHistory: EmployeeAssignment[];
  addresses: EmployeeAddress[];
  emergencyContacts: EmployeeEmergencyContact[];
  bankAccount: EmployeeBankAccount | null;
  statutoryDetails: EmployeeStatutoryDetails | null;
  documents: EmployeeDocument[];
  statusHistory: EmployeeStatusHistory[];
  hasSensitiveAccess: boolean;
}

// Directory Item format for Table Listing
export interface EmployeeDirectoryItem {
  id: string;
  companyId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  displayName: string;
  workEmail: string;
  mobileNumber: string;
  avatarUrl?: string;
  joiningDate: string;
  employmentType: EmploymentType;
  status: EmploymentStatus;
  
  // Flattened current assignment
  branchId?: string;
  branchName?: string;
  departmentId?: string;
  departmentName?: string;
  designationId?: string;
  designationName?: string;
  workLocationId?: string;
  workLocationName?: string;
  managerId?: string;
  managerName?: string;
  managerCode?: string;
}

// DTOs for Creation / Update
export interface CreateEmployeeDTO {
  // Step 1: Basic Info
  employeeCode: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  displayName?: string;
  gender: Gender;
  dateOfBirth: string;
  maritalStatus?: MaritalStatus;
  nationality?: string;
  bloodGroup?: string;

  // Step 2: Employment & Organization
  joiningDate: string;
  employmentType: EmploymentType;
  probationPeriodMonths?: number;
  noticePeriodDays?: number;
  companyId?: string; // Derived from request context, but validated
  branchId: string;
  departmentId: string;
  designationId: string;
  workLocationId: string;
  managerId?: string;

  // Step 3: Contact & Address
  workEmail: string;
  personalEmail?: string;
  mobileNumber: string;
  currentAddress?: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    country?: string;
    postalCode: string;
  };
  permanentAddress?: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    country?: string;
    postalCode: string;
    isSameAsCurrent?: boolean;
  };
  emergencyContact?: {
    contactName: string;
    relationship: string;
    phoneNumber: string;
    alternatePhone?: string;
    email?: string;
  };

  // Step 4: Bank Details (Optional)
  bankAccount?: {
    accountHolderName: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    branchName?: string;
    accountType?: BankAccountType;
  };

  // Step 5: Statutory Details (Optional)
  statutoryDetails?: {
    panNumber?: string;
    aadhaarNumber?: string;
    uanNumber?: string;
    pfNumber?: string;
    esiNumber?: string;
    taxRegime?: TaxRegime;
  };

  // Step 6: Initial Documents (Optional)
  documents?: Array<{
    documentType: DocumentType;
    title: string;
    fileName: string;
    fileSizeBytes: number;
    mimeType: string;
    storagePath?: string;
    issueDate?: string;
    expiryDate?: string;
    notes?: string;
  }>;
}

export interface UpdateEmployeeDTO {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  displayName?: string;
  gender?: Gender;
  dateOfBirth?: string;
  maritalStatus?: MaritalStatus;
  nationality?: string;
  bloodGroup?: string;
  workEmail?: string;
  personalEmail?: string;
  mobileNumber?: string;
  avatarUrl?: string;
  joiningDate?: string;
  confirmationDate?: string;
  probationPeriodMonths?: number;
  noticePeriodDays?: number;
  employmentType?: EmploymentType;

  // Addresses update
  addresses?: Array<{
    type: AddressType;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    country?: string;
    postalCode: string;
    isSameAsCurrent?: boolean;
  }>;

  // Emergency contact update
  emergencyContacts?: Array<{
    contactName: string;
    relationship: string;
    phoneNumber: string;
    alternatePhone?: string;
    email?: string;
    isPrimary?: boolean;
  }>;

  // Bank account update
  bankAccount?: {
    accountHolderName: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    branchName?: string;
    accountType?: BankAccountType;
  };

  // Statutory update
  statutoryDetails?: {
    panNumber?: string;
    aadhaarNumber?: string;
    uanNumber?: string;
    pfNumber?: string;
    esiNumber?: string;
    taxRegime?: TaxRegime;
  };
}

export type EmployeeProfileDTO = EmployeeFullProfile;

export type AssignmentChangeReason =
  | 'PROMOTION'
  | 'TRANSFER'
  | 'DEPARTMENT_CHANGE'
  | 'DESIGNATION_CHANGE'
  | 'MANAGER_CHANGE'
  | 'LOCATION_CHANGE'
  | 'ANNUAL_INCREMENT'
  | 'RESTRUCTURE'
  | 'OTHER';

export interface CreateAssignmentChangeDTO {
  branchId: string;
  departmentId: string;
  designationId: string;
  workLocationId: string;
  managerId?: string;
  effectiveFrom: string; // YYYY-MM-DD
  changeReason: AssignmentChangeReason | string;
  notes?: string;
}

export interface UpdateEmployeeStatusDTO {
  status: EmploymentStatus;
  effectiveDate: string; // YYYY-MM-DD
  reason: string;
  comments?: string;
}

export interface EmployeeFilterOptions {
  search?: string;
  branchId?: string;
  departmentId?: string;
  designationId?: string;
  workLocationId?: string;
  employmentType?: EmploymentType;
  status?: EmploymentStatus;
  managerId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
