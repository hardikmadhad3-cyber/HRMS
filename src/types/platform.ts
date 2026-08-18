/**
 * HRMS Phase 7: Platform Services, Reporting, Notifications & Administration Types
 */

import { PermissionKey, UserRole } from './auth.js';

// ==========================================
// 1. In-App Notifications
// ==========================================

export type NotificationCategory =
  | 'APPROVAL'
  | 'ATTENDANCE'
  | 'LEAVE'
  | 'PAYROLL'
  | 'RECRUITMENT'
  | 'PERFORMANCE'
  | 'EXPENSE'
  | 'ASSET'
  | 'OFFBOARDING'
  | 'SYSTEM';

export type NotificationSeverity = 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL';

export interface InAppNotification {
  id: string;
  companyId: string;
  recipientUserId: string;
  recipientEmployeeId?: string;
  category: NotificationCategory;
  eventType: string;
  title: string;
  message: string;
  linkUrl?: string;
  severity: NotificationSeverity;
  isRead: boolean;
  readAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface NotificationFilter {
  isRead?: boolean;
  category?: NotificationCategory;
  limit?: number;
  offset?: number;
}

// ==========================================
// 2. Operational Reports
// ==========================================

export type ReportCategoryKey =
  | 'HEADCOUNT'
  | 'EMPLOYEE_DIRECTORY'
  | 'ATTENDANCE'
  | 'LATE_EARLY'
  | 'LEAVE_BALANCE'
  | 'LEAVE_TRANSACTIONS'
  | 'OVERTIME'
  | 'PAYROLL_REGISTER'
  | 'RECRUITMENT'
  | 'PERFORMANCE'
  | 'EXPENSES'
  | 'ASSETS'
  | 'OFFBOARDING';

export interface ReportDefinition {
  key: ReportCategoryKey;
  title: string;
  category: string;
  description: string;
  requiredPermission: PermissionKey;
  supportedFormats: Array<'PREVIEW' | 'CSV' | 'JSON'>;
}

export interface ReportFilterCriteria {
  companyId: string;
  reportKey: ReportCategoryKey;
  startDate?: string;
  endDate?: string;
  departmentId?: string;
  designationId?: string;
  branchId?: string;
  workLocationId?: string;
  status?: string;
  employeeId?: string;
  exportFormat?: 'PREVIEW' | 'CSV' | 'JSON';
  page?: number;
  pageSize?: number;
}

export interface ReportExecutionResult<T = Record<string, unknown>> {
  reportKey: ReportCategoryKey;
  title: string;
  companyId: string;
  generatedAt: string;
  generatedBy: string;
  filters: ReportFilterCriteria;
  summaryMetrics: Record<string, number | string>;
  columns: Array<{ key: string; label: string; type?: 'string' | 'number' | 'date' | 'currency' | 'badge' }>;
  rows: T[];
  totalRows: number;
  page: number;
  pageSize: number;
  totalPages: number;
  csvContent?: string;
}

// ==========================================
// 3. System Settings & Custom RBAC
// ==========================================

export interface SystemSetting {
  id: string;
  companyId: string;
  key: string;
  settingKey?: string;
  value: any;
  settingValue?: string;
  category: 'SECURITY' | 'ATTENDANCE' | 'LEAVE' | 'PAYROLL' | 'NOTIFICATIONS' | 'GENERAL';
  description?: string;
  dataType?: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON';
  isPublic?: boolean;
  isEncrypted?: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface CustomRole {
  id: string;
  companyId?: string;
  code: string;
  roleKey?: string;
  name: string;
  description: string;
  isSystem?: boolean;
  isSystemRole?: boolean;
  permissions: PermissionKey[];
  userCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type CustomRoleDefinition = CustomRole;

export interface GranularPermission {
  key: PermissionKey;
  name: string;
  description: string;
  module: string;
}

export interface UserCompanyAccessEntry {
  id: string;
  userId: string;
  companyId: string;
  companyName: string;
  companyCode: string;
  isDefault: boolean;
  grantedAt: string;
  grantedBy: string;
}
