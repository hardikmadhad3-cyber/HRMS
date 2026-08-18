import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.js';
import { NotificationProvider } from './context/NotificationContext.js';
import { ProtectedRoute } from './components/common/ProtectedRoute.js';
import { AppShell } from './components/shell/AppShell.js';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage.js';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage.js';

// Application Pages
import { DashboardPage } from './pages/dashboard/DashboardPage.js';
import { CompaniesPage } from './pages/organization/CompaniesPage.js';
import { BranchesPage } from './pages/organization/BranchesPage.js';
import { DepartmentsPage } from './pages/organization/DepartmentsPage.js';
import { DesignationsPage } from './pages/organization/DesignationsPage.js';
import { WorkLocationsPage } from './pages/organization/WorkLocationsPage.js';
import { HolidaysPage } from './pages/organization/HolidaysPage.js';

// Employee Module (Phase 1C)
import { EmployeeDirectoryPage } from './pages/employees/EmployeeDirectoryPage.js';
import { AddEmployeeWizardPage } from './pages/employees/AddEmployeeWizardPage.js';
import { EmployeeProfilePage } from './pages/employees/EmployeeProfilePage.js';

// Attendance & Shift Management (Phase 2A & 2B & 3C)
import { ShiftManagementPage } from './pages/attendance/ShiftManagementPage.js';
import { DailyAttendancePage } from './pages/attendance/DailyAttendancePage.js';
import { MonthlyAttendancePage } from './pages/attendance/MonthlyAttendancePage.js';
import { MyAttendancePage } from './pages/attendance/MyAttendancePage.js';
import { AttendanceRegularizationPage } from './pages/attendance/AttendanceRegularizationPage.js';
import { PeriodManagementPage } from './pages/attendance/PeriodManagementPage.js';

// Leave Management (Phase 3A & 3B)
import { LeaveDashboardPage } from './pages/leave/LeaveDashboardPage.js';
import { LeaveTypesPage } from './pages/leave/LeaveTypesPage.js';
import { LeavePoliciesPage } from './pages/leave/LeavePoliciesPage.js';
import { LeavePolicyEditorPage } from './pages/leave/LeavePolicyEditorPage.js';
import { LeaveAssignmentsPage } from './pages/leave/LeaveAssignmentsPage.js';
import { ApplyLeavePage } from './pages/leave/ApplyLeavePage.js';
import { LeaveRequestsPage } from './pages/leave/LeaveRequestsPage.js';
import { LeaveBalancesPage } from './pages/leave/LeaveBalancesPage.js';

// Payroll Module (Phase 4A, 4B & 4C)
import { PayrollConfigPage } from './pages/payroll/PayrollConfigPage.js';
import { PayrollRunsPage } from './pages/payroll/PayrollRunsPage.js';
import { PayslipsListPage } from './pages/payroll/PayslipsListPage.js';

// Recruitment & Onboarding Module (Phase 5)
import { RecruitmentHubPage } from './pages/recruitment/RecruitmentHubPage.js';

<<<<<<< HEAD
// Performance Management Module (Phase 6A)
import { PerformanceHubPage } from './pages/performance/PerformanceHubPage.js';

// Expenses & Assets Module (Phase 6B)
import { ExpensesHubPage } from './pages/expenses/ExpensesHubPage.js';
import { AssetsHubPage } from './pages/assets/AssetsHubPage.js';

// Offboarding Module (Phase 6C)
import { OffboardingHubPage } from './pages/offboarding/OffboardingHubPage.js';

=======
>>>>>>> 4a1448526a9835d6aa52ec14365c16a1afc6f77f
// Admin Pages
import { UserManagementPage } from './pages/admin/UserManagementPage.js';
import { RolesPermissionsPage } from './pages/admin/RolesPermissionsPage.js';
import { SystemSettingsPage } from './pages/admin/SystemSettingsPage.js';
import { AuditLogPage } from './pages/admin/AuditLogPage.js';

// Approvals & Reports
import { ApprovalInboxPage } from './pages/approvals/ApprovalInboxPage.js';
import { ReportCenterPage } from './pages/reports/ReportCenterPage.js';

// Common Pages
import { UnauthorizedPage } from './pages/common/UnauthorizedPage.js';
import { NotFoundPage } from './pages/common/NotFoundPage.js';
import { RoutePlaceholder } from './components/common/RoutePlaceholder.js';

import { PermissionKey } from './types/auth.js';

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Unauthenticated Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            {/* Main Application Shell Layout */}
            <Route
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              {/* Root Redirect to Dashboard */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              {/* Dashboard */}
              <Route path="/dashboard" element={<DashboardPage />} />

              {/* Organization Module */}
              <Route
                path="/organization/companies"
                element={
                  <ProtectedRoute requiredPermission={PermissionKey.ORGANIZATION_VIEW}>
                    <CompaniesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/organization/branches"
                element={
                  <ProtectedRoute requiredPermission={PermissionKey.ORGANIZATION_VIEW}>
                    <BranchesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/organization/departments"
                element={
                  <ProtectedRoute requiredPermission={PermissionKey.ORGANIZATION_VIEW}>
                    <DepartmentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/organization/designations"
                element={
                  <ProtectedRoute requiredPermission={PermissionKey.ORGANIZATION_VIEW}>
                    <DesignationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/organization/work-locations"
                element={
                  <ProtectedRoute requiredPermission={PermissionKey.ORGANIZATION_VIEW}>
                    <WorkLocationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/organization/locations"
                element={<Navigate to="/organization/work-locations" replace />}
              />
              <Route
                path="/organization/holidays"
                element={
                  <ProtectedRoute requiredPermission={PermissionKey.ORGANIZATION_VIEW}>
                    <HolidaysPage />
                  </ProtectedRoute>
                }
              />

              {/* Administration Module */}
              <Route
                path="/administration/users"
                element={
                  <ProtectedRoute requiredPermission={PermissionKey.ADMIN_USERS_MANAGE}>
                    <UserManagementPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/administration/roles"
                element={
                  <ProtectedRoute requiredPermission={PermissionKey.ADMIN_ROLES_MANAGE}>
                    <RolesPermissionsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/administration/settings"
                element={
                  <ProtectedRoute requiredPermission={PermissionKey.ADMIN_SETTINGS_MANAGE}>
                    <SystemSettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/administration/audit"
                element={
                  <ProtectedRoute requiredPermission={PermissionKey.ADMIN_AUDIT_VIEW}>
                    <AuditLogPage />
                  </ProtectedRoute>
                }
              />

              {/* Admin legacy route redirects */}
              <Route path="/admin/users" element={<Navigate to="/administration/users" replace />} />
              <Route path="/admin/roles" element={<Navigate to="/administration/roles" replace />} />
              <Route path="/admin/settings" element={<Navigate to="/administration/settings" replace />} />
              <Route path="/admin/audit" element={<Navigate to="/administration/audit" replace />} />

              {/* Approval Inbox & Reports */}
              <Route path="/approvals" element={<ApprovalInboxPage />} />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute requiredPermission={PermissionKey.REPORTS_VIEW}>
                    <ReportCenterPage />
                  </ProtectedRoute>
                }
              />

              {/* Employee Module Routes (Phase 1C) */}
              <Route
                path="/employees"
                element={
                  <ProtectedRoute requiredPermission={PermissionKey.EMPLOYEE_VIEW}>
                    <EmployeeDirectoryPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/employees/new"
                element={
                  <ProtectedRoute requiredPermission={PermissionKey.EMPLOYEE_MANAGE}>
                    <AddEmployeeWizardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/employees/:id"
                element={
                  <ProtectedRoute requiredPermission={PermissionKey.EMPLOYEE_VIEW}>
                    <EmployeeProfilePage />
                  </ProtectedRoute>
                }
              />

              {/* Attendance & Shift Management Routes (Phase 2A & 2B) */}
              <Route
                path="/attendance/daily"
                element={
                  <ProtectedRoute requiredPermission={PermissionKey.ATTENDANCE_VIEW}>
                    <DailyAttendancePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/attendance/monthly"
                element={
                  <ProtectedRoute requiredPermission={PermissionKey.ATTENDANCE_VIEW}>
                    <MonthlyAttendancePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/attendance/my-attendance"
                element={<MyAttendancePage />}
              />
              <Route
                path="/me/attendance"
                element={<MyAttendancePage />}
              />
              <Route
                path="/attendance/regularizations"
                element={
                  <ProtectedRoute requiredPermission={PermissionKey.ATTENDANCE_VIEW}>
                    <AttendanceRegularizationPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/attendance/regularization" element={<Navigate to="/attendance/regularizations" replace />} />
              <Route
                path="/attendance/overtime"
                element={
                  <ProtectedRoute requiredPermission={PermissionKey.ATTENDANCE_VIEW}>
                    <RoutePlaceholder
                      title="Overtime Management"
                      description="Overtime calculation policies and approval workflows."
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/attendance/periods"
                element={
                  <ProtectedRoute requiredPermission={PermissionKey.ATTENDANCE_VIEW}>
                    <PeriodManagementPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/attendance/period-lock" element={<Navigate to="/attendance/periods" replace />} />
              <Route path="/attendance/reconciliation" element={<Navigate to="/attendance/periods" replace />} />
              <Route
                path="/attendance/shifts"
                element={
                  <ProtectedRoute requiredPermission={PermissionKey.ATTENDANCE_VIEW}>
                    <ShiftManagementPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/attendance" element={<Navigate to="/attendance/daily" replace />} />

              {/* Leave Management Module Routes (Phase 3A & 3B) */}
              <Route
                path="/leave"
                element={
                  <ProtectedRoute requiredPermission={PermissionKey.LEAVE_VIEW}>
                    <LeaveDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/leave/types"
                element={
                  <ProtectedRoute requiredPermission={PermissionKey.LEAVE_VIEW}>
                    <LeaveTypesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/leave/policies"
                element={
                  <ProtectedRoute requiredPermission={PermissionKey.LEAVE_VIEW}>
                    <LeavePoliciesPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/leave/settings" element={<Navigate to="/leave/policies" replace />} />
              <Route
                path="/leave/policies/new"
                element={
                  <ProtectedRoute requiredPermission={PermissionKey.LEAVE_MANAGE}>
                    <LeavePolicyEditorPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/leave/policies/:id"
                element={
                  <ProtectedRoute requiredPermission={PermissionKey.LEAVE_MANAGE}>
                    <LeavePolicyEditorPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/leave/assignments"
                element={
                  <ProtectedRoute requiredPermission={PermissionKey.LEAVE_VIEW}>
                    <LeaveAssignmentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/leave/balances"
                element={
                  <ProtectedRoute requiredPermission={PermissionKey.LEAVE_VIEW}>
                    <LeaveBalancesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/leave/requests"
                element={
                  <ProtectedRoute requiredPermission={PermissionKey.LEAVE_VIEW}>
                    <LeaveRequestsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/leave/apply"
                element={
                  <ProtectedRoute requiredPermission={PermissionKey.LEAVE_APPLY}>
                    <ApplyLeavePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/me/leave/new"
                element={
                  <ProtectedRoute requiredPermission={PermissionKey.LEAVE_APPLY}>
                    <ApplyLeavePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/me/leave"
                element={
                  <ProtectedRoute requiredPermission={PermissionKey.LEAVE_VIEW}>
                    <LeaveRequestsPage />
                  </ProtectedRoute>
                }
              />
              {/* Payroll Configuration & Management Routes (Phase 4A) */}
              <Route
                path="/payroll"
                element={
                  <ProtectedRoute requiredPermission={PermissionKey.PAYROLL_VIEW}>
                    <PayrollConfigPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/payroll/components"
                element={
                  <ProtectedRoute requiredPermission={PermissionKey.PAYROLL_VIEW}>
                    <PayrollConfigPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/payroll/salary-structures"
                element={
                  <ProtectedRoute requiredPermission={PermissionKey.PAYROLL_VIEW}>
                    <PayrollConfigPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/payroll/calendars"
                element={
                  <ProtectedRoute requiredPermission={PermissionKey.PAYROLL_VIEW}>
                    <PayrollConfigPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/payroll/compensation"
                element={
                  <ProtectedRoute requiredPermission={PermissionKey.PAYROLL_COMPENSATION_VIEW}>
                    <PayrollConfigPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/payroll/runs"
                element={
                  <ProtectedRoute requiredPermission={PermissionKey.PAYROLL_VIEW}>
                    <PayrollRunsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/payroll/payslips"
                element={
                  <ProtectedRoute requiredPermission={PermissionKey.PAYROLL_VIEW}>
                    <PayslipsListPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/me/payslips"
                element={
                  <ProtectedRoute requiredPermission={PermissionKey.PAYROLL_PAYSLIP_SELF_VIEW}>
                    <PayslipsListPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/me/*"
                element={
                  <RoutePlaceholder
                    title="Employee Self Service (ESS)"
                    description="Phase 1-3 scope — My Profile, Attendance Punches, Leave Requests & Payslips."
                  />
                }
              />
              {/* Recruitment & Onboarding Routes (Phase 5) */}
              <Route
                path="/recruitment"
                element={
                  <ProtectedRoute requiredPermission={PermissionKey.RECRUITMENT_VIEW}>
                    <RecruitmentHubPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/recruitment/jobs" element={<Navigate to="/recruitment?tab=requisitions" replace />} />
              <Route path="/recruitment/candidates" element={<Navigate to="/recruitment?tab=candidates" replace />} />
              <Route path="/recruitment/pipeline" element={<Navigate to="/recruitment?tab=pipeline" replace />} />
              <Route path="/recruitment/interviews" element={<Navigate to="/recruitment?tab=interviews" replace />} />
              <Route path="/recruitment/offers" element={<Navigate to="/recruitment?tab=offers" replace />} />
              <Route
                path="/recruitment/*"
                element={
                  <ProtectedRoute requiredPermission={PermissionKey.RECRUITMENT_VIEW}>
                    <RecruitmentHubPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/onboarding"
                element={<Navigate to="/recruitment?tab=onboarding" replace />}
              />
              <Route
                path="/onboarding/*"
                element={<Navigate to="/recruitment?tab=onboarding" replace />}
              />
              <Route
<<<<<<< HEAD
                path="/performance"
                element={
                  <ProtectedRoute requiredPermission={PermissionKey.PERFORMANCE_VIEW}>
                    <PerformanceHubPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/performance/cycles"
                element={<Navigate to="/performance?tab=cycles" replace />}
              />
              <Route
                path="/performance/goals"
                element={<Navigate to="/performance?tab=goals" replace />}
              />
              <Route
                path="/performance/reviews"
                element={<Navigate to="/performance?tab=reviews" replace />}
              />
              <Route
                path="/performance/templates"
                element={<Navigate to="/performance?tab=templates" replace />}
              />
              <Route
                path="/performance/*"
                element={
                  <ProtectedRoute requiredPermission={PermissionKey.PERFORMANCE_VIEW}>
                    <PerformanceHubPage />
                  </ProtectedRoute>
                }
              />
              {/* Expenses Module (Phase 6B) */}
              <Route
                path="/expenses"
                element={
                  <ProtectedRoute requiredPermission={PermissionKey.EXPENSE_APPLY}>
                    <ExpensesHubPage />
                  </ProtectedRoute>
=======
                path="/performance/*"
                element={
                  <RoutePlaceholder
                    title="Performance Management"
                    description="Phase 5 scope — Review cycles, 360 feedback, goals & KPI tracking."
                  />
>>>>>>> 4a1448526a9835d6aa52ec14365c16a1afc6f77f
                }
              />
              <Route
                path="/expenses/*"
                element={
<<<<<<< HEAD
                  <ProtectedRoute requiredPermission={PermissionKey.EXPENSE_APPLY}>
                    <ExpensesHubPage />
                  </ProtectedRoute>
                }
              />

              {/* Assets Module (Phase 6B) */}
              <Route
                path="/assets"
                element={
                  <ProtectedRoute requiredPermission={PermissionKey.ASSET_VIEW}>
                    <AssetsHubPage />
                  </ProtectedRoute>
=======
                  <RoutePlaceholder
                    title="Expense Claims"
                    description="Phase 5 scope — Travel & expense claim submissions and approvals."
                  />
>>>>>>> 4a1448526a9835d6aa52ec14365c16a1afc6f77f
                }
              />
              <Route
                path="/assets/*"
                element={
<<<<<<< HEAD
                  <ProtectedRoute requiredPermission={PermissionKey.ASSET_VIEW}>
                    <AssetsHubPage />
                  </ProtectedRoute>
                }
              />

              {/* Offboarding Module (Phase 6C) */}
              <Route
                path="/offboarding"
                element={
                  <ProtectedRoute requiredPermission={PermissionKey.OFFBOARDING_VIEW}>
                    <OffboardingHubPage />
                  </ProtectedRoute>
=======
                  <RoutePlaceholder
                    title="Asset Management"
                    description="Phase 5 scope — Hardware & software asset allocation and tracking."
                  />
>>>>>>> 4a1448526a9835d6aa52ec14365c16a1afc6f77f
                }
              />
              <Route
                path="/offboarding/*"
                element={
<<<<<<< HEAD
                  <ProtectedRoute requiredPermission={PermissionKey.OFFBOARDING_VIEW}>
                    <OffboardingHubPage />
                  </ProtectedRoute>
=======
                  <RoutePlaceholder
                    title="Exit & Offboarding"
                    description="Phase 5 scope — Resignation processing, exit interview & clearance."
                  />
>>>>>>> 4a1448526a9835d6aa52ec14365c16a1afc6f77f
                }
              />
            </Route>

            {/* 404 Catch All */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
}
