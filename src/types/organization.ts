/**
 * HRMS Organization Master Types
 * Aligned with HRMS SRS Section 5 & Document 2, 3, 4, 5
 */

export interface Company {
  id: string;
  code: string;
  name: string;
  legalName: string;
  status: 'ACTIVE' | 'INACTIVE';
  currency: string;
  locale: string;
  timezone: string;
  taxIdentifier?: string;
  contactEmail: string;
  contactPhone?: string;
  address: string;
  logoUrl?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface Branch {
  id: string;
  companyId: string;
  code: string;
  name: string;
  timezoneOverride?: string;
  address: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  status: 'ACTIVE' | 'INACTIVE';
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface Department {
  id: string;
  companyId: string;
  code: string;
  name: string;
  parentDepartmentId?: string;
  parentDepartmentName?: string;
  departmentHeadId?: string;
  departmentHeadName?: string;
  employeeCount?: number;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface Designation {
  id: string;
  companyId: string;
  code: string;
  name: string;
  gradeLevel?: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  employeeCount?: number;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface WorkLocation {
  id: string;
  companyId: string;
  branchId?: string;
  branchName?: string;
  code: string;
  name: string;
  address: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
  timezone?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface Holiday {
  id: string;
  companyId: string;
  workLocationId?: string;
  workLocationName?: string;
  name: string;
  date: string;
  type: 'PUBLIC' | 'OPTIONAL' | 'RESTRICTED' | 'COMPANY';
  applicableLocationId?: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

