/**
 * HRMS Role and Permission Type Definitions
 * Aligned with HRMS Document 1 (SRS Section 8) and Document 5 (Screen Permission Matrix)
 */

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  HR_ADMIN = 'HR_ADMIN',
  PAYROLL_MANAGER = 'PAYROLL_MANAGER',
  MANAGER = 'MANAGER',
  RECRUITER = 'RECRUITER',
  EMPLOYEE = 'EMPLOYEE',
}

export enum PermissionKey {
  // Master Data & Organization
  ORGANIZATION_VIEW = 'org:view',
  ORGANIZATION_MANAGE = 'org:manage',
  
  // Employee Management
  EMPLOYEE_VIEW = 'emp:view',
  EMPLOYEE_MANAGE = 'emp:manage',
  EMPLOYEE_SENSITIVE_VIEW = 'emp:sensitive:view',
  
  // Time & Attendance & Shifts
  ATTENDANCE_VIEW = 'att:view',
  ATTENDANCE_RECORD = 'att:record',
  ATTENDANCE_APPROVE = 'att:approve',
  ATTENDANCE_MANAGE = 'att:manage',
  SHIFT_VIEW = 'shift:view',
  SHIFT_MANAGE = 'shift:manage',
  SHIFT_ASSIGN = 'shift:assign',
  OVERTIME_VIEW = 'ot:view',
  OVERTIME_APPLY = 'ot:apply',
  OVERTIME_APPROVE = 'ot:approve',
  OVERTIME_MANAGE = 'ot:manage',
  ATTENDANCE_PERIOD_VIEW = 'att:period:view',
  ATTENDANCE_PERIOD_MANAGE = 'att:period:manage',
  ATTENDANCE_PERIOD_FINALIZE = 'att:period:finalize',
  ATTENDANCE_PERIOD_REOPEN = 'att:period:reopen',
  
  // Leave Management
  LEAVE_VIEW = 'leave:view',
  LEAVE_APPLY = 'leave:apply',
  LEAVE_APPROVE = 'leave:approve',
  LEAVE_MANAGE = 'leave:manage',
  
  // Payroll Management (Strict Security)
  PAYROLL_VIEW = 'pay:view',
  PAYROLL_COMPENSATION_VIEW = 'pay:comp:view',
  PAYROLL_MANAGE = 'pay:manage',
  PAYROLL_FINALIZE = 'pay:finalize',
  PAYROLL_PAYSLIP_SELF_VIEW = 'pay:payslip:self:view',
  
  // Recruitment & Onboarding
  RECRUITMENT_VIEW = 'rec:view',
  RECRUITMENT_MANAGE = 'rec:manage',
  ONBOARDING_MANAGE = 'onb:manage',
  
  // Performance
  PERFORMANCE_VIEW = 'perf:view',
  PERFORMANCE_MANAGE = 'perf:manage',
  
  // Expenses & Assets
  EXPENSE_APPLY = 'exp:apply',
  EXPENSE_APPROVE = 'exp:approve',
  ASSET_VIEW = 'ast:view',
  ASSET_MANAGE = 'ast:manage',
  
  // Offboarding
  OFFBOARDING_VIEW = 'off:view',
  OFFBOARDING_MANAGE = 'off:manage',
  
  // Reports & Administration
  REPORTS_VIEW = 'rpt:view',
  REPORTS_EXPORT = 'rpt:export',
  ADMIN_USERS_MANAGE = 'admin:users:manage',
  ADMIN_ROLES_MANAGE = 'admin:roles:manage',
  ADMIN_SETTINGS_MANAGE = 'admin:settings:manage',
  ADMIN_AUDIT_VIEW = 'admin:audit:view',
}

export interface UserPermission {
  key: PermissionKey;
  description: string;
  module: string;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  employeeId?: string;
  employeeCode?: string;
  role: UserRole;
  permissions: PermissionKey[];
  companyIds: string[];
  activeCompanyId: string;
  departmentId?: string;
  designationId?: string;
  isActive: boolean;
  lastLoginAt?: string;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  activeCompanyId: string | null;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}
