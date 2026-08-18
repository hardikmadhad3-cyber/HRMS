import { PermissionKey } from '../types/auth.js';

export interface RouteConfig {
  path: string;
  title: string;
  subtitle?: string;
  category: string;
  requiredPermission?: PermissionKey;
  phase: 'Phase 0 (Foundation)' | 'Phase 1 (Core HR)' | 'Phase 2 (Time)' | 'Phase 3 (Leave)' | 'Phase 4 (Payroll)' | 'Phase 5 (Lifecycle)';
  isImplemented: boolean;
}

export const ROUTE_REGISTRY: RouteConfig[] = [
  // Dashboard
  { path: '/dashboard', title: 'Dashboard', subtitle: 'Operational HR Summary & Metrics', category: 'Main', phase: 'Phase 0 (Foundation)', isImplemented: true },

  // Organization
  { path: '/organization/companies', title: 'Companies', subtitle: 'Multi-Company Legal Entities Master', category: 'Organization', requiredPermission: PermissionKey.ORGANIZATION_VIEW, phase: 'Phase 0 (Foundation)', isImplemented: true },
  { path: '/organization/branches', title: 'Branches & Offices', subtitle: 'Operating Locations Master', category: 'Organization', requiredPermission: PermissionKey.ORGANIZATION_VIEW, phase: 'Phase 0 (Foundation)', isImplemented: true },
  { path: '/organization/departments', title: 'Departments', subtitle: 'Organizational Classification Structure', category: 'Organization', requiredPermission: PermissionKey.ORGANIZATION_VIEW, phase: 'Phase 0 (Foundation)', isImplemented: true },
  { path: '/organization/designations', title: 'Designations & Grades', subtitle: 'Job Positions & Designation Hierarchy', category: 'Organization', requiredPermission: PermissionKey.ORGANIZATION_VIEW, phase: 'Phase 0 (Foundation)', isImplemented: true },
  { path: '/organization/work-locations', title: 'Work Locations', subtitle: 'Worksite Locations & Address Details', category: 'Organization', requiredPermission: PermissionKey.ORGANIZATION_VIEW, phase: 'Phase 0 (Foundation)', isImplemented: true },
  { path: '/organization/holidays', title: 'Holiday Calendar', subtitle: 'Annual Holiday Schedules & Days Off', category: 'Organization', requiredPermission: PermissionKey.ORGANIZATION_VIEW, phase: 'Phase 0 (Foundation)', isImplemented: true },

  // Employees
  { path: '/employees', title: 'Employee List', subtitle: 'Employee Master Records & Directory', category: 'Employees', requiredPermission: PermissionKey.EMPLOYEE_VIEW, phase: 'Phase 1 (Core HR)', isImplemented: false },
  { path: '/employees/new', title: 'Add Employee Wizard', subtitle: 'New Employee Onboarding Wizard', category: 'Employees', requiredPermission: PermissionKey.EMPLOYEE_MANAGE, phase: 'Phase 1 (Core HR)', isImplemented: false },

  // Attendance & Shift
  { path: '/attendance/daily', title: 'Daily Attendance', subtitle: 'Daily Attendance Log & Exception Review', category: 'Attendance', requiredPermission: PermissionKey.ATTENDANCE_VIEW, phase: 'Phase 2 (Time)', isImplemented: false },
  { path: '/attendance/monthly', title: 'Monthly Attendance Matrix', subtitle: 'Monthly Presence & Working Hours Matrix', category: 'Attendance', requiredPermission: PermissionKey.ATTENDANCE_VIEW, phase: 'Phase 2 (Time)', isImplemented: false },
  { path: '/me/attendance', title: 'My Check-In / Out', subtitle: 'Self-Service Time Punching', category: 'Attendance', requiredPermission: PermissionKey.ATTENDANCE_RECORD, phase: 'Phase 2 (Time)', isImplemented: false },
  { path: '/attendance/regularization', title: 'Regularization', subtitle: 'Attendance Correction Requests', category: 'Attendance', requiredPermission: PermissionKey.ATTENDANCE_VIEW, phase: 'Phase 2 (Time)', isImplemented: false },
  { path: '/attendance/shifts', title: 'Shift Master & Roster', subtitle: 'Shift Configurations & Rotations', category: 'Attendance', requiredPermission: PermissionKey.ATTENDANCE_MANAGE, phase: 'Phase 2 (Time)', isImplemented: false },

  // Leave
  { path: '/leave', title: 'Leave Dashboard', subtitle: 'Leave Overview & Team Absence Calendar', category: 'Leave', requiredPermission: PermissionKey.LEAVE_VIEW, phase: 'Phase 3 (Leave)', isImplemented: true },
  { path: '/me/leave/new', title: 'Apply Leave', subtitle: 'Submit New Leave Request', category: 'Leave', requiredPermission: PermissionKey.LEAVE_APPLY, phase: 'Phase 3 (Leave)', isImplemented: true },
  { path: '/leave/settings', title: 'Leave Policies', subtitle: 'Leave Types, Policies & Allocations', category: 'Leave', requiredPermission: PermissionKey.LEAVE_MANAGE, phase: 'Phase 3 (Leave)', isImplemented: true },
  { path: '/leave/balances', title: 'Leave Balances & Ledger', subtitle: 'Auditable Leave Balance Movements', category: 'Leave', requiredPermission: PermissionKey.LEAVE_VIEW, phase: 'Phase 3 (Leave)', isImplemented: true },

  // Payroll
  { path: '/payroll/components', title: 'Salary Components', subtitle: 'Earnings & Deductions Master', category: 'Payroll', requiredPermission: PermissionKey.PAYROLL_MANAGE, phase: 'Phase 4 (Payroll)', isImplemented: false },
  { path: '/payroll/salary-structures', title: 'Salary Structures', subtitle: 'Employee Compensation Structures', category: 'Payroll', requiredPermission: PermissionKey.PAYROLL_MANAGE, phase: 'Phase 4 (Payroll)', isImplemented: false },
  { path: '/payroll/runs', title: 'Payroll Runs', subtitle: 'Payroll Processing & Finalization Engine', category: 'Payroll', requiredPermission: PermissionKey.PAYROLL_MANAGE, phase: 'Phase 4 (Payroll)', isImplemented: false },

  // Self-Service (ESS)
  { path: '/me/profile', title: 'My Profile', subtitle: 'Personal HR Information', category: 'Self Service', phase: 'Phase 1 (Core HR)', isImplemented: false },
  { path: '/me/requests', title: 'My Requests', subtitle: 'Consolidated Request Tracking', category: 'Self Service', phase: 'Phase 1 (Core HR)', isImplemented: false },

  // Recruitment & Onboarding
  { path: '/recruitment/jobs', title: 'Job Openings', subtitle: 'Recruitment Openings & Pipelines', category: 'Recruitment', requiredPermission: PermissionKey.RECRUITMENT_VIEW, phase: 'Phase 5 (Lifecycle)', isImplemented: false },
  { path: '/onboarding', title: 'Onboarding Checklists', subtitle: 'Joining Tasks & New Hire Progress', category: 'Recruitment', requiredPermission: PermissionKey.ONBOARDING_MANAGE, phase: 'Phase 5 (Lifecycle)', isImplemented: false },

  // Performance
  { path: '/performance/cycles', title: 'Review Cycles', subtitle: 'Performance Appraisal Cycles', category: 'Performance', requiredPermission: PermissionKey.PERFORMANCE_VIEW, phase: 'Phase 5 (Lifecycle)', isImplemented: false },
  { path: '/performance/goals', title: 'Goals & KPIs', subtitle: 'Employee Goals & Objectives Tracking', category: 'Performance', requiredPermission: PermissionKey.PERFORMANCE_VIEW, phase: 'Phase 5 (Lifecycle)', isImplemented: false },

  // Expenses & Assets & Offboarding
  { path: '/expenses', title: 'Expense Claims', subtitle: 'Employee Business Expense Claims', category: 'Expenses', requiredPermission: PermissionKey.EXPENSE_APPLY, phase: 'Phase 5 (Lifecycle)', isImplemented: false },
  { path: '/assets', title: 'Asset Master', subtitle: 'Company Asset Inventory & Custody', category: 'Assets', requiredPermission: PermissionKey.ASSET_VIEW, phase: 'Phase 5 (Lifecycle)', isImplemented: false },
  { path: '/offboarding', title: 'Exit & Offboarding', subtitle: 'Resignation & Exit Clearance Workflows', category: 'Offboarding', requiredPermission: PermissionKey.OFFBOARDING_VIEW, phase: 'Phase 5 (Lifecycle)', isImplemented: false },

  // Approvals, Reports & Admin
  { path: '/approvals', title: 'Approval Inbox', subtitle: 'Pending Workflow Approvals Queue', category: 'Approvals', phase: 'Phase 0 (Foundation)', isImplemented: true },
  { path: '/reports', title: 'Report Center', subtitle: 'Operational & Executive Reports Catalog', category: 'Reports', requiredPermission: PermissionKey.REPORTS_VIEW, phase: 'Phase 0 (Foundation)', isImplemented: true },
  { path: '/administration/users', title: 'User Management', subtitle: 'System Access & Login Accounts', category: 'Administration', requiredPermission: PermissionKey.ADMIN_USERS_MANAGE, phase: 'Phase 0 (Foundation)', isImplemented: true },
  { path: '/administration/roles', title: 'Roles & Permissions', subtitle: 'RBAC Access Matrix Configuration', category: 'Administration', requiredPermission: PermissionKey.ADMIN_ROLES_MANAGE, phase: 'Phase 0 (Foundation)', isImplemented: true },
  { path: '/administration/settings', title: 'System Settings', subtitle: 'Cross-Module Configuration Defaults', category: 'Administration', requiredPermission: PermissionKey.ADMIN_SETTINGS_MANAGE, phase: 'Phase 0 (Foundation)', isImplemented: true },
  { path: '/administration/audit', title: 'Audit Log', subtitle: 'Security & Business Event Trail', category: 'Administration', requiredPermission: PermissionKey.ADMIN_AUDIT_VIEW, phase: 'Phase 0 (Foundation)', isImplemented: true },
];
