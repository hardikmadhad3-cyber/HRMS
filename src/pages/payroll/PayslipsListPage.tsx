import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  Download,
  Eye,
  Calendar,
  DollarSign,
  Building2,
  CheckCircle2,
  Clock,
  Printer,
  Sparkles,
} from 'lucide-react';
import { Payslip, PayslipStatus } from '../../types/payroll.js';
import { EmployeePayslipViewModal } from './EmployeePayslipViewModal.js';
import { useAuth } from '../../context/AuthContext.js';
import { PermissionKey, UserRole } from '../../types/auth.js';

export function PayslipsListPage() {
  const { user, hasPermission } = useAuth();
  const isEmployeeOnly = user?.role === UserRole.EMPLOYEE;

  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Drilldown modal
  const [viewPayslipId, setViewPayslipId] = useState<string | null>(null);

  const fetchPayslips = async () => {
    try {
      setLoading(true);
      setError(null);

      const endpoint = isEmployeeOnly
        ? '/api/payroll/me/payslips'
        : '/api/payroll/payslips';

      const res = await fetch(endpoint, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load payslips');
      }
      setPayslips(json.data);
    } catch (err: any) {
      setError(err.message || 'Error loading payslips');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayslips();
  }, [user]);

  const filteredPayslips = payslips.filter((p) => {
    if (selectedStatus !== 'ALL' && p.status !== selectedStatus) return false;
    if (selectedYear !== 'ALL') {
      const yr = new Date(p.periodStartDate).getFullYear().toString();
      if (yr !== selectedYear) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = p.employeeSnapshot?.fullName?.toLowerCase().includes(q);
      const matchCode = p.employeeSnapshot?.employeeCode?.toLowerCase().includes(q);
      const matchPs = p.payslipNumber?.toLowerCase().includes(q);
      const matchPeriod = p.periodName?.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchPs && !matchPeriod) return false;
    }
    return true;
  });

  const totalDisbursed = filteredPayslips.reduce((acc, p) => acc + (p.netPay || 0), 0);

  return (
    <div className="space-y-6" id="payslips-list-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {isEmployeeOnly ? 'My Payslips & Compensation History' : 'Employee Payslips Directory'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isEmployeeOnly
              ? 'View and securely download your official finalized salary slips and year-to-date statements.'
              : 'Enterprise payslip registry, publication tracking, and secure employee distribution.'}
          </p>
        </div>
      </div>

      {/* Metrics Header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Total Payslips</span>
            <div className="text-xl font-bold text-slate-900">{filteredPayslips.length}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">
              {isEmployeeOnly ? 'Net Payout Received' : 'Total Net Disbursed'}
            </span>
            <div className="text-xl font-bold text-emerald-700 font-mono">
              ${totalDisbursed.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-slate-100 text-slate-700 rounded-lg">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Latest Pay Period</span>
            <div className="text-sm font-bold text-slate-900 mt-0.5">
              {payslips.length > 0 ? payslips[0].periodName : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by period, payslip #, or name..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value={PayslipStatus.PUBLISHED}>Published</option>
            <option value={PayslipStatus.GENERATED}>Generated</option>
          </select>
        </div>
      </div>

      {/* Payslips Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-sm">
            <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-3" />
            Loading payslips...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 text-sm">{error}</div>
        ) : filteredPayslips.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700">No payslips found</p>
            <p className="text-xs text-slate-400 mt-1">
              Finalized payroll runs generate official payslips automatically.
            </p>
          </div>
        ) : (
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase tracking-wider border-b border-slate-200 text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Payslip #</th>
                <th className="py-3.5 px-4">Period</th>
                {!isEmployeeOnly && <th className="py-3.5 px-4">Employee</th>}
                <th className="py-3.5 px-4">Issue / Pay Date</th>
                <th className="py-3.5 px-4 text-center">Days (Pay/Cal)</th>
                <th className="py-3.5 px-4 text-right">Gross</th>
                <th className="py-3.5 px-4 text-right">Deductions</th>
                <th className="py-3.5 px-4 text-right">Net Take-Home</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredPayslips.map((ps) => (
                <tr key={ps.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-mono font-semibold text-indigo-600">
                    {ps.payslipNumber}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{ps.periodName}</div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {ps.periodStartDate} to {ps.periodEndDate}
                    </div>
                  </td>
                  {!isEmployeeOnly && (
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{ps.employeeSnapshot.fullName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {ps.employeeSnapshot.employeeCode} • {ps.employeeSnapshot.departmentName}
                      </div>
                    </td>
                  )}
                  <td className="py-3 px-4 font-mono text-slate-600">
                    <div>Pay: {ps.payDate}</div>
                    <div className="text-[10px] text-slate-400">Issued: {ps.issueDate}</div>
                  </td>
                  <td className="py-3 px-4 text-center font-medium text-slate-800">
                    {ps.payableDays} / {ps.calendarDays}
                    {ps.lossOfPayDays > 0 && (
                      <div className="text-[10px] text-rose-600 font-semibold">
                        -{ps.lossOfPayDays} LOP
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-900 font-medium">
                    ${ps.grossEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-rose-600 font-medium">
                    -${ps.grossDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-indigo-700 text-sm">
                    ${ps.netPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {ps.status === PayslipStatus.PUBLISHED ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        Published
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock className="w-3 h-3" />
                        Generated
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => setViewPayslipId(ps.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Slip
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Payslip View Modal */}
      {viewPayslipId && (
        <EmployeePayslipViewModal
          payslipId={viewPayslipId}
          isOpen={!!viewPayslipId}
          onClose={() => setViewPayslipId(null)}
        />
      )}
    </div>
  );
}
