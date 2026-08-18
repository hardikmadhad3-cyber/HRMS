import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  FileSpreadsheet,
  Search,
  Filter,
  Users,
  DollarSign,
  TrendingDown,
  Building2,
  Eye,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { PayrollRegisterSummary, PayrollRegisterItem } from '../../types/payroll.js';
import { EmployeePayslipViewModal } from './EmployeePayslipViewModal.js';

interface PayrollRegisterModalProps {
  runId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function PayrollRegisterModal({
  runId,
  isOpen,
  onClose,
}: PayrollRegisterModalProps) {
  const [register, setRegister] = useState<PayrollRegisterSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');

  // Selected payslip modal state
  const [viewPayslipId, setViewPayslipId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && runId) {
      const fetchRegister = async () => {
        try {
          setLoading(true);
          setError(null);
          const res = await fetch(`/api/payroll/runs/${runId}/register`, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
            },
          });
          const json = await res.json();
          if (!res.ok || !json.success) {
            throw new Error(json.error || 'Failed to load payroll register');
          }
          setRegister(json.data);
        } catch (err: any) {
          setError(err.message || 'Error loading register');
        } finally {
          setLoading(false);
        }
      };
      fetchRegister();
    }
  }, [isOpen, runId]);

  if (!isOpen) return null;

  const filteredItems = (register?.items || []).filter((item) => {
    if (selectedDept !== 'ALL' && item.departmentName !== selectedDept) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = item.employeeName.toLowerCase().includes(q);
      const matchCode = item.employeeCode.toLowerCase().includes(q);
      const matchPs = item.payslipNumber.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchPs) return false;
    }
    return true;
  });

  const handleExportCsv = () => {
    if (!register) return;
    const headers = [
      'Payslip No',
      'Employee Code',
      'Employee Name',
      'Department',
      'Designation',
      'Calendar Days',
      'Payable Days',
      'LOP Days',
      'OT Hours',
      'Basic Earned',
      'HRA Earned',
      'Allowances Earned',
      'OT Earned',
      'Gross Earnings',
      'PF Deduction',
      'Tax/PT Deduction',
      'Other Deductions',
      'Total Deductions',
      'Net Pay',
    ];

    const rows = filteredItems.map((i) => [
      i.payslipNumber,
      i.employeeCode,
      `"${i.employeeName}"`,
      `"${i.departmentName}"`,
      `"${i.designationName}"`,
      i.calendarDays,
      i.payableDays,
      i.lossOfPayDays,
      i.approvedOtHours,
      i.basicEarned.toFixed(2),
      i.hraEarned.toFixed(2),
      i.allowancesEarned.toFixed(2),
      i.otEarned.toFixed(2),
      i.totalGrossEarnings.toFixed(2),
      i.pfDeduction.toFixed(2),
      i.taxOrPtDeduction.toFixed(2),
      i.otherDeductions.toFixed(2),
      i.totalGrossDeductions.toFixed(2),
      i.netPay.toFixed(2),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `payroll-register-${register.periodCode}-run-${register.runNumber}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="font-semibold text-base">
                Payroll Register Summary
                {register && (
                  <span className="text-xs text-slate-400 ml-2 font-normal">
                    Period: {register.periodName} ({register.periodCode}) — Run #{register.runNumber}
                  </span>
                )}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={!register || filteredItems.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-medium transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {loading ? (
            <div className="py-20 text-center text-slate-400 text-sm">
              <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-3" />
              Generating payroll register table...
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 text-rose-700 rounded-lg text-sm text-center border border-rose-200">
              {error}
            </div>
          ) : register ? (
            <>
              {/* Financial Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-xs text-slate-500 font-medium">Total Employees</span>
                  <div className="text-xl font-bold text-slate-900 mt-0.5">{register.totalEmployees}</div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-xs text-slate-500 font-medium">Total Gross Earnings</span>
                  <div className="text-xl font-bold text-slate-900 mt-0.5">
                    ${register.totalGrossEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-xs text-slate-500 font-medium">Total Deductions</span>
                  <div className="text-xl font-bold text-rose-600 mt-0.5">
                    -${register.totalGrossDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <span className="text-xs text-indigo-700 font-semibold">Total Net Disbursement</span>
                  <div className="text-xl font-extrabold text-indigo-900 mt-0.5">
                    ${register.totalNetPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Department Aggregation Cards */}
              {register.departmentSummaries.length > 0 && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-2">
                    Department Cost Breakdown
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {register.departmentSummaries.map((dept, idx) => (
                      <div key={idx} className="bg-white p-2.5 rounded border border-slate-200 text-xs">
                        <div className="font-semibold text-slate-900 flex justify-between">
                          <span>{dept.departmentName}</span>
                          <span className="text-slate-500 font-normal">({dept.employeeCount} staff)</span>
                        </div>
                        <div className="flex justify-between text-slate-600 mt-1">
                          <span>Net:</span>
                          <span className="font-bold text-indigo-700 font-mono">
                            ${dept.totalNetPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Filter / Search Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search employee or payslip..."
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none"
                  >
                    <option value="ALL">All Departments</option>
                    {register.departmentSummaries.map((d, i) => (
                      <option key={i} value={d.departmentName}>
                        {d.departmentName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Register Table */}
              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-semibold uppercase tracking-wider border-b border-slate-200 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Employee</th>
                      <th className="py-2.5 px-3">Department</th>
                      <th className="py-2.5 px-3 text-center">Days (Pay/Cal)</th>
                      <th className="py-2.5 px-3 text-right">Basic</th>
                      <th className="py-2.5 px-3 text-right">HRA</th>
                      <th className="py-2.5 px-3 text-right">Allowances</th>
                      <th className="py-2.5 px-3 text-right">Gross</th>
                      <th className="py-2.5 px-3 text-right">Deductions</th>
                      <th className="py-2.5 px-3 text-right">Net Pay</th>
                      <th className="py-2.5 px-3 text-center">Payslip</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="py-8 text-center text-slate-400">
                          No matching payroll records found
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-900">{item.employeeName}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{item.employeeCode}</div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            <div>{item.departmentName}</div>
                            <div className="text-[10px] text-slate-400">{item.designationName}</div>
                          </td>
                          <td className="py-2.5 px-3 text-center font-medium">
                            <span>{item.payableDays} / {item.calendarDays}</span>
                            {item.lossOfPayDays > 0 && (
                              <div className="text-[10px] text-rose-600 font-semibold">-{item.lossOfPayDays} LOP</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700">${item.basicEarned.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700">${item.hraEarned.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700">${item.allowancesEarned.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">${item.totalGrossEarnings.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-medium text-rose-600">-${item.totalGrossDeductions.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-700">${item.netPay.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="text-[10px] font-mono text-slate-500 block">{item.payslipNumber}</span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {item.payslipId && (
                              <button
                                type="button"
                                onClick={() => setViewPayslipId(item.payslipId)}
                                className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded transition-colors"
                                title="View Payslip"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 transition-colors"
          >
            Close Register
          </button>
        </div>
      </div>

      {/* Drilldown to single payslip */}
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
