import React from 'react';
import { PageHeader } from '../../components/shell/PageHeader.js';
import { ShieldCheck, Plus, Check } from 'lucide-react';
import { UserRole, PermissionKey } from '../../types/auth.js';

export function RolesPermissionsPage() {
  const roles = [
    { name: UserRole.SUPER_ADMIN, desc: 'Full System & Technical Administration', usersCount: 2 },
    { name: UserRole.HR_ADMIN, desc: 'Employee, Attendance, Leave & Operations Access', usersCount: 4 },
    { name: UserRole.PAYROLL_MANAGER, desc: 'Salary, Components, Structures & Payroll Processing', usersCount: 2 },
    { name: UserRole.MANAGER, desc: 'Direct Team Approvals & Attendance Review', usersCount: 12 },
    { name: UserRole.EMPLOYEE, desc: 'Employee Self-Service (ESS) Personal View', usersCount: 48 },
  ];

  return (
    <div>
      <PageHeader
        title="Roles & Permission Matrix"
        subtitle="Role-Based Access Control (RBAC) Configuration"
        breadcrumbs={[
          { label: 'HRMS Portal', path: '/dashboard' },
          { label: 'Administration' },
          { label: 'Roles & Permissions' },
        ]}
        primaryAction={{
          label: 'Create Custom Role',
          icon: <Plus className="w-3.5 h-3.5" />,
          onClick: () => alert('Create Role modal placeholder'),
        }}
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs">
          <h3 className="font-bold text-[#17365D] text-sm mb-3">Configured RBAC Roles</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {roles.map((r) => (
              <div key={r.name} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#17365D]">{r.name}</span>
                  <span className="px-1.5 py-0.5 bg-blue-100 text-[#17365D] font-bold rounded text-[10px]">
                    {r.usersCount} Users
                  </span>
                </div>
                <p className="text-slate-500 text-[11px] leading-relaxed">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
