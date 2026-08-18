import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users,
  Clock,
  CalendarDays,
  CreditCard,
  Briefcase,
  GraduationCap,
  Award,
  Receipt,
  Package,
  LogOut,
  CheckCircle2,
  FileBarChart2,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { PermissionKey } from '../../types/auth.js';

interface SidebarProps {
  isOpen: boolean;
  onCloseMobile: () => void;
}

interface NavGroup {
  label: string;
  icon: React.ElementType;
  permission?: PermissionKey;
  items: {
    label: string;
    path: string;
    permission?: PermissionKey;
  }[];
}

export function Sidebar({ isOpen, onCloseMobile }: SidebarProps) {
  const { hasPermission } = useAuth();
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    Organization: true,
    Employees: true,
    Attendance: true,
    Administration: true,
  });

  const toggleGroup = (groupLabel: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupLabel]: !prev[groupLabel] }));
  };

  const navGroups: NavGroup[] = [
    {
      label: 'Organization',
      icon: Building2,
      permission: PermissionKey.ORGANIZATION_VIEW,
      items: [
        { label: 'Companies', path: '/organization/companies', permission: PermissionKey.ORGANIZATION_VIEW },
        { label: 'Branches', path: '/organization/branches', permission: PermissionKey.ORGANIZATION_VIEW },
        { label: 'Departments', path: '/organization/departments', permission: PermissionKey.ORGANIZATION_VIEW },
        { label: 'Designations', path: '/organization/designations', permission: PermissionKey.ORGANIZATION_VIEW },
        { label: 'Work Locations', path: '/organization/work-locations', permission: PermissionKey.ORGANIZATION_VIEW },
        { label: 'Holiday Calendar', path: '/organization/holidays', permission: PermissionKey.ORGANIZATION_VIEW },
      ],
    },
    {
      label: 'Employees',
      icon: Users,
      permission: PermissionKey.EMPLOYEE_VIEW,
      items: [
        { label: 'Employee Directory', path: '/employees', permission: PermissionKey.EMPLOYEE_VIEW },
        { label: 'Add Employee Wizard', path: '/employees/new', permission: PermissionKey.EMPLOYEE_MANAGE },
      ],
    },
    {
      label: 'Attendance',
      icon: Clock,
      permission: PermissionKey.ATTENDANCE_VIEW,
      items: [
        { label: 'Shifts & Roster', path: '/attendance/shifts', permission: PermissionKey.ATTENDANCE_VIEW },
        { label: 'Daily Attendance', path: '/attendance/daily', permission: PermissionKey.ATTENDANCE_VIEW },
        { label: 'Monthly Matrix', path: '/attendance/monthly', permission: PermissionKey.ATTENDANCE_VIEW },
        { label: 'Overtime', path: '/attendance/overtime', permission: PermissionKey.ATTENDANCE_VIEW },
        { label: 'Period Finalization', path: '/attendance/periods', permission: PermissionKey.ATTENDANCE_VIEW },
        { label: 'My Check-In/Out', path: '/me/attendance', permission: PermissionKey.ATTENDANCE_RECORD },
        { label: 'Regularization', path: '/attendance/regularization', permission: PermissionKey.ATTENDANCE_VIEW },
      ],
    },
    {
      label: 'Leave',
      icon: CalendarDays,
      permission: PermissionKey.LEAVE_VIEW,
      items: [
        { label: 'Leave Overview', path: '/leave', permission: PermissionKey.LEAVE_VIEW },
        { label: 'Apply Leave', path: '/me/leave/new', permission: PermissionKey.LEAVE_APPLY },
        { label: 'Leave Requests', path: '/leave/requests', permission: PermissionKey.LEAVE_VIEW },
        { label: 'Balances & Ledger', path: '/leave/balances', permission: PermissionKey.LEAVE_VIEW },
        { label: 'Leave Types', path: '/leave/types', permission: PermissionKey.LEAVE_VIEW },
        { label: 'Leave Policies', path: '/leave/policies', permission: PermissionKey.LEAVE_VIEW },
        { label: 'Policy Assignments', path: '/leave/assignments', permission: PermissionKey.LEAVE_VIEW },
      ],
    },
    {
      label: 'Payroll',
      icon: CreditCard,
      permission: PermissionKey.PAYROLL_VIEW,
      items: [
        { label: 'Configuration Hub', path: '/payroll', permission: PermissionKey.PAYROLL_VIEW },
        { label: 'Salary Components', path: '/payroll?tab=components', permission: PermissionKey.PAYROLL_VIEW },
        { label: 'Salary Structures', path: '/payroll?tab=structures', permission: PermissionKey.PAYROLL_VIEW },
        { label: 'Payroll Calendars', path: '/payroll?tab=calendars', permission: PermissionKey.PAYROLL_VIEW },
        { label: 'Compensation Directory', path: '/payroll?tab=compensations', permission: PermissionKey.PAYROLL_COMPENSATION_VIEW },
        { label: 'Payroll Runs', path: '/payroll/runs', permission: PermissionKey.PAYROLL_MANAGE },
        { label: 'Payslips Directory', path: '/payroll/payslips', permission: PermissionKey.PAYROLL_VIEW },
        { label: 'My Payslips', path: '/me/payslips', permission: PermissionKey.PAYROLL_PAYSLIP_SELF_VIEW },
      ],
    },
    {
      label: 'Recruitment & Onboarding',
      icon: Briefcase,
      permission: PermissionKey.RECRUITMENT_VIEW,
      items: [
        { label: 'Overview & Metrics', path: '/recruitment?tab=dashboard', permission: PermissionKey.RECRUITMENT_VIEW },
        { label: 'Job Requisitions', path: '/recruitment?tab=requisitions', permission: PermissionKey.RECRUITMENT_VIEW },
        { label: 'Candidate Pool', path: '/recruitment?tab=candidates', permission: PermissionKey.RECRUITMENT_VIEW },
        { label: 'Application Pipeline', path: '/recruitment?tab=pipeline', permission: PermissionKey.RECRUITMENT_VIEW },
        { label: 'Interviews & Scorecards', path: '/recruitment?tab=interviews', permission: PermissionKey.RECRUITMENT_VIEW },
        { label: 'Job Offers', path: '/recruitment?tab=offers', permission: PermissionKey.RECRUITMENT_VIEW },
        { label: 'Employee Onboarding', path: '/recruitment?tab=onboarding', permission: PermissionKey.ONBOARDING_MANAGE },
      ],
    },
    {
      label: 'Performance',
      icon: Award,
      permission: PermissionKey.PERFORMANCE_VIEW,
      items: [
<<<<<<< HEAD
        { label: 'Overview & Metrics', path: '/performance?tab=dashboard', permission: PermissionKey.PERFORMANCE_VIEW },
        { label: 'Appraisal Cycles', path: '/performance?tab=cycles', permission: PermissionKey.PERFORMANCE_VIEW },
        { label: 'Goals & KRAs', path: '/performance?tab=goals', permission: PermissionKey.PERFORMANCE_VIEW },
        { label: 'Appraisals', path: '/performance?tab=reviews', permission: PermissionKey.PERFORMANCE_VIEW },
        { label: 'Framework Templates', path: '/performance?tab=templates', permission: PermissionKey.PERFORMANCE_VIEW },
=======
        { label: 'Review Cycles', path: '/performance/cycles', permission: PermissionKey.PERFORMANCE_VIEW },
        { label: 'Goals & KPIs', path: '/performance/goals', permission: PermissionKey.PERFORMANCE_VIEW },
>>>>>>> 4a1448526a9835d6aa52ec14365c16a1afc6f77f
      ],
    },
    {
      label: 'Expenses & Assets',
      icon: Receipt,
      items: [
        { label: 'Expense Claims', path: '/expenses', permission: PermissionKey.EXPENSE_APPLY },
        { label: 'Asset Master', path: '/assets', permission: PermissionKey.ASSET_VIEW },
        { label: 'Offboarding & Exit', path: '/offboarding', permission: PermissionKey.OFFBOARDING_VIEW },
      ],
    },
    {
      label: 'Administration',
      icon: ShieldCheck,
      permission: PermissionKey.ADMIN_USERS_MANAGE,
      items: [
        { label: 'User Management', path: '/administration/users', permission: PermissionKey.ADMIN_USERS_MANAGE },
        { label: 'Roles & Permissions', path: '/administration/roles', permission: PermissionKey.ADMIN_ROLES_MANAGE },
        { label: 'System Settings', path: '/administration/settings', permission: PermissionKey.ADMIN_SETTINGS_MANAGE },
        { label: 'Audit Trail', path: '/administration/audit', permission: PermissionKey.ADMIN_AUDIT_VIEW },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 top-14 bg-slate-900/50 z-30 md:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:static top-14 md:top-0 left-0 h-[calc(100vh-3.5rem)] md:h-full w-64 bg-[#17365D] text-slate-200 z-40 md:z-20 flex flex-col transition-transform duration-200 shadow-2xl md:shadow-none shrink-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Mobile Close Header */}
        <div className="p-3.5 flex items-center justify-between border-b border-slate-700/60 md:hidden">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#2F75B5] text-white flex items-center justify-center text-xs font-bold">
              HR
            </div>
            <span className="font-bold text-sm text-white">HRMS Enterprise</span>
          </div>
          <button onClick={onCloseMobile} className="p-1 rounded text-slate-400 hover:text-white cursor-pointer" aria-label="Close sidebar">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Content */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 text-xs">
          {/* Main Dashboard Link */}
          <NavLink
            to="/dashboard"
            onClick={onCloseMobile}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-md font-medium transition-colors ${
                isActive
                  ? 'bg-[#2F75B5] text-white font-semibold shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`
            }
          >
            <LayoutDashboard className="w-4 h-4 text-blue-300" />
            <span>Dashboard</span>
          </NavLink>

          {/* Approvals Link */}
          <NavLink
            to="/approvals"
            onClick={onCloseMobile}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-md font-medium transition-colors ${
                isActive
                  ? 'bg-[#2F75B5] text-white font-semibold shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`
            }
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Approval Inbox</span>
          </NavLink>

          {/* Report Center Link */}
          {hasPermission(PermissionKey.REPORTS_VIEW) && (
            <NavLink
              to="/reports"
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-md font-medium transition-colors ${
                  isActive
                    ? 'bg-[#2F75B5] text-white font-semibold shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`
              }
            >
              <FileBarChart2 className="w-4 h-4 text-purple-300" />
              <span>Report Center</span>
            </NavLink>
          )}

          <div className="my-2 border-t border-slate-700/50" />

          {/* Collapsible Module Groups */}
          {navGroups.map((group) => {
            // Check group-level permission
            if (group.permission && !hasPermission(group.permission)) {
              return null;
            }

            // Filter permitted items inside group
            const permittedItems = group.items.filter(
              (item) => !item.permission || hasPermission(item.permission)
            );

            if (permittedItems.length === 0) return null;

            const isExpanded = !!expandedGroups[group.label];
            const GroupIcon = group.icon;

            return (
              <div key={group.label} className="space-y-0.5">
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-md text-slate-300 hover:bg-slate-800/60 hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-2.5 font-medium">
                    <GroupIcon className="w-4 h-4 text-slate-400" />
                    <span>{group.label}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>

                {isExpanded && (
                  <div className="pl-8 space-y-0.5 border-l border-slate-700/40 ml-4 py-0.5">
                    {permittedItems.map((item) => (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={onCloseMobile}
                        className={({ isActive }) =>
                          `block px-2.5 py-1.5 rounded-md text-[11.5px] transition-colors ${
                            isActive
                              ? 'bg-[#2F75B5]/30 text-blue-200 font-semibold border-l-2 border-[#2F75B5] -ml-px'
                              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'
                          }`
                        }
                      >
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-700/60 text-[10px] text-slate-400 flex items-center justify-between">
          <span>HRMS Enterprise v1.0</span>
          <span className="px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-300 font-mono">
            Phase 0
          </span>
        </div>
      </aside>
    </>
  );
}
