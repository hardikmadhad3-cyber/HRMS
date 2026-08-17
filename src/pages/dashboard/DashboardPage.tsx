import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { PageHeader } from '../../components/shell/PageHeader.js';
import { apiClient } from '../../services/apiClient.js';
import { UserRole, PermissionKey } from '../../types/auth.js';
import {
  Users,
  CheckCircle2,
  Clock,
  UserX,
  Building2,
  ArrowUpRight,
  ShieldCheck,
  TrendingUp,
  CalendarDays,
  FileCheck,
  Receipt,
} from 'lucide-react';

export function DashboardPage() {
  const { user, activeCompanyId, hasPermission } = useAuth();
  const [metrics, setMetrics] = useState<any>({
    headcount: 56,
    presentToday: 48,
    absentToday: 3,
    onLeaveToday: 5,
    lateArrivalsToday: 2,
    newJoinersThisMonth: 4,
    pendingApprovalsCount: 7,
    noticePeriodCount: 1,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadMetrics() {
      setLoading(true);
      const res = await apiClient.get<any>('/api/v1/dashboard/summary', activeCompanyId);
      if (res.success && res.data) {
        setMetrics(res.data);
      }
      setLoading(false);
    }
    loadMetrics();
  }, [activeCompanyId]);

  // Define candidate shortcuts with their strict permissions
  const candidateShortcuts = [
    {
      label: 'Company Master',
      path: '/organization/companies',
      icon: Building2,
      permission: PermissionKey.ORGANIZATION_VIEW,
    },
    {
      label: 'User Management',
      path: '/administration/users',
      icon: Users,
      permission: PermissionKey.ADMIN_USERS_MANAGE,
    },
    {
      label: 'Audit Trail',
      path: '/administration/audit',
      icon: ShieldCheck,
      permission: PermissionKey.ADMIN_AUDIT_VIEW,
    },
    {
      label: 'Approval Inbox',
      path: '/approvals',
      icon: FileCheck,
      permission: PermissionKey.ATTENDANCE_APPROVE,
    },
    {
      label: 'My Check-In / Attendance',
      path: '/me/attendance',
      icon: Clock,
      permission: PermissionKey.ATTENDANCE_RECORD,
    },
    {
      label: 'Apply for Leave',
      path: '/me/leave/new',
      icon: CalendarDays,
      permission: PermissionKey.LEAVE_APPLY,
    },
    {
      label: 'Expense Claims',
      path: '/expenses',
      icon: Receipt,
      permission: PermissionKey.EXPENSE_APPLY,
    },
  ];

  // Strictly filter shortcuts by user permissions
  const permittedShortcuts = candidateShortcuts.filter((s) => hasPermission(s.permission));

  const isEmployee = user?.role === UserRole.EMPLOYEE;

  return (
    <div>
      <PageHeader
        title="HRMS Dashboard"
        subtitle={`Role: ${user?.role} — Active Company Context`}
        breadcrumbs={[{ label: 'HRMS Portal' }, { label: 'Dashboard' }]}
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                {isEmployee ? 'Department Members' : 'Total Headcount'}
              </p>
              <h3 className="text-2xl font-bold text-[#17365D] mt-1">{isEmployee ? 12 : metrics.headcount}</h3>
              <p className="text-[10px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span>+{metrics.newJoinersThisMonth} new joiners this month</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#2F75B5] flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                {isEmployee ? 'My Status Today' : 'Present Today'}
              </p>
              <h3 className="text-2xl font-bold text-emerald-700 mt-1">{isEmployee ? 'Checked In' : metrics.presentToday}</h3>
              <p className="text-[10px] text-slate-500 mt-1">
                {isEmployee ? 'Shift: 09:00 AM - 06:00 PM' : `${metrics.lateArrivalsToday} late arrivals recorded`}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                {isEmployee ? 'My Leave Balance' : 'On Leave / Absent'}
              </p>
              <h3 className="text-2xl font-bold text-amber-700 mt-1">
                {isEmployee ? '18 Days' : metrics.onLeaveToday + metrics.absentToday}
              </h3>
              <p className="text-[10px] text-slate-500 mt-1">
                {isEmployee ? 'Paid / Casual Leave Available' : `${metrics.onLeaveToday} on leave, ${metrics.absentToday} absent`}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <UserX className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                {isEmployee ? 'My Open Requests' : 'Pending Approvals'}
              </p>
              <h3 className="text-2xl font-bold text-purple-700 mt-1">
                {isEmployee ? 1 : metrics.pendingApprovalsCount}
              </h3>
              <p className="text-[10px] text-slate-500 mt-1">
                {isEmployee ? '1 leave application in review' : 'Leave, attendance & expense claims'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Role-Specific Content Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Action Queue / Overview Panel */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-[#17365D] text-sm">
                  {isEmployee
                    ? 'My Personal HR Dashboard (Employee Self-Service)'
                    : 'System Status & Operational Queue'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Phase 0 Foundation Architecture & Security Context
                </p>
              </div>
              <span className="text-[11px] bg-blue-50 text-[#2F75B5] font-semibold px-2 py-0.5 rounded border border-blue-200">
                Active Tenant
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    ✓
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">Multi-Company Architecture Configured</p>
                    <p className="text-slate-500 text-[11px]">
                      REST API endpoints enforce company isolation on queries.
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-slate-400">STATUS OK</span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">Role-Based Access Control (RBAC)</p>
                    <p className="text-slate-500 text-[11px]">
                      Server permissions guard read/write operations for protected routes.
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-slate-400">ENFORCED</span>
              </div>
            </div>
          </div>

          {/* Quick Nav Shortcuts Panel (Strictly Authorized) */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-4">
            <h3 className="font-bold text-[#17365D] text-sm border-b border-slate-100 pb-2">
              {isEmployee ? 'My Quick Actions' : 'Authorized Quick Actions'}
            </h3>
            <div className="space-y-2 text-xs">
              {permittedShortcuts.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No authorized shortcuts available.</p>
              ) : (
                permittedShortcuts.map((shortcut) => {
                  const Icon = shortcut.icon;
                  return (
                    <Link
                      key={shortcut.path}
                      to={shortcut.path}
                      className="flex items-center justify-between p-2.5 rounded hover:bg-slate-50 border border-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-[#2F75B5]" />
                        <span className="font-medium text-slate-700">{shortcut.label}</span>
                      </div>
                      <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

