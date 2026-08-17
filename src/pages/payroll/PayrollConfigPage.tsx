import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Coins,
  Layers,
  Calendar,
  UserCheck,
  Plus,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  Percent,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
  Edit2,
  Trash2,
  Eye,
  CalendarDays,
  ShieldCheck,
  Building,
  FileCheck,
} from 'lucide-react';
import { SalaryComponentsTab } from './SalaryComponentsTab.js';
import { SalaryStructuresTab } from './SalaryStructuresTab.js';
import { PayrollCalendarsTab } from './PayrollCalendarsTab.js';
import { EmployeeCompensationTab } from './EmployeeCompensationTab.js';
import { PayrollRunsPage } from './PayrollRunsPage.js';
import { useAuth } from '../../context/AuthContext.js';
import { PermissionKey } from '../../types/auth.js';

export function PayrollConfigPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'runs';
  const { hasPermission } = useAuth();

  const handleTabChange = (tabKey: string) => {
    setSearchParams({ tab: tabKey });
  };

  const tabs = [
    {
      id: 'runs',
      label: 'Payroll Runs & Engine',
      icon: FileCheck,
      description: 'Gross-to-net calculation engine, finalized attendance & LOP audit',
      permission: PermissionKey.PAYROLL_VIEW,
    },
    {
      id: 'components',
      label: 'Salary Components',
      icon: Coins,
      description: 'Earnings, deductions, formula bases & tax metadata',
      permission: PermissionKey.PAYROLL_VIEW,
    },
    {
      id: 'structures',
      label: 'Salary Structures',
      icon: Layers,
      description: 'Relational pay formulas, component breakdown & factor rules',
      permission: PermissionKey.PAYROLL_VIEW,
    },
    {
      id: 'calendars',
      label: 'Payroll Calendars',
      icon: Calendar,
      description: 'Pay frequencies, monthly/bi-weekly cycles & period statuses',
      permission: PermissionKey.PAYROLL_VIEW,
    },
    {
      id: 'compensations',
      label: 'Employee Compensation',
      icon: UserCheck,
      description: 'Effective-dated salary assignments & component overrides',
      permission: PermissionKey.PAYROLL_COMPENSATION_VIEW,
    },
  ];

  return (
    <div className="space-y-6" id="payroll-config-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Payroll Hub</h1>
          <p className="text-sm text-slate-500 mt-1">
            Enterprise gross-to-net calculation engine, compensation architecture, salary structures & effective-dated assignments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            Phase 4B Calculation Engine Active
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`payroll-tab-${tab.id}`}
                onClick={() => handleTabChange(tab.id)}
                className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Icon
                  className={`-ml-0.5 mr-2 h-5 w-5 ${
                    isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-500'
                  }`}
                />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Panels */}
      <div className="mt-4">
        {currentTab === 'runs' && <PayrollRunsPage />}
        {currentTab === 'components' && <SalaryComponentsTab />}
        {currentTab === 'structures' && <SalaryStructuresTab />}
        {currentTab === 'calendars' && <PayrollCalendarsTab />}
        {currentTab === 'compensations' && <EmployeeCompensationTab />}
      </div>
    </div>
  );
}
