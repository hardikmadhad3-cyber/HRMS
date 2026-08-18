import React, { useState, useEffect } from 'react';
import {
  X,
  DollarSign,
  Users,
  AlertTriangle,
  RotateCw,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Eye,
  TrendingUp,
  FileCheck,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Lock,
  RotateCcw,
  FileSpreadsheet,
} from 'lucide-react';
import {
  PayrollRunSummary,
  PayrollRunStatus,
  PayrollRunEmployee,
  PayrollRunEmployeeStatus,
  PayrollExceptionSeverity,
} from '../../types/payroll.js';
import { EmployeePayrollPreviewModal } from './EmployeePayrollPreviewModal.js';
import { PayrollFinalizeModal } from './PayrollFinalizeModal.js';
import { PayrollReopenModal } from './PayrollReopenModal.js';
import { PayrollRegisterModal } from './PayrollRegisterModal.js';
import { useAuth } from '../../context/AuthContext.js';
import { PermissionKey } from '../../types/auth.js';

interface PayrollRunReviewModalProps {
  runId: string;
  isOpen: boolean;
  onClose: () => void;
  onRunUpdated: () => void;
}

export function PayrollRunReviewModal({
  runId,
  isOpen,
  onClose,
  onRunUpdated,
}: PayrollRunReviewModalProps) {
  const { hasPermission } = useAuth();
  const [summary, setSummary] = useState<PayrollRunSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Employee drilldown modal state
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);
  const [isRecalculatingEmp, setIsRecalculatingEmp] = useState<boolean>(false);
  const [isRecalculatingAll, setIsRecalculatingAll] = useState<boolean>(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  // Phase 4C Modals
  const [isFinalizeOpen, setIsFinalizeOpen] = useState<boolean>(false);
  const [isReopenOpen, setIsReopenOpen] = useState<boolean>(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState<boolean>(false);

  const fetchRunSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/payroll/runs/${runId}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load payroll run summary');
      }
      setSummary(json.data);
    } catch (err: any) {
      setError(err.message || 'Error loading run summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && runId) {
      fetchRunSummary();
    }
  }, [isOpen, runId]);

  if (!isOpen) return null;

  const handleRecalculateEmployee = async (empId: string) => {
    try {
      setIsRecalculatingEmp(true);
      const res = await fetch(`/api/payroll/runs/${runId}/employees/${empId}/recalculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to recalculate employee payroll');
      }
      await fetchRunSummary();
      onRunUpdated();
    } catch (err: any) {
      alert(err.message || 'Recalculation error');
    } finally {
      setIsRecalculatingEmp(false);
    }
  };

  const handleRecalculateFullRun = async () => {
    if (!confirm('Recalculate entire payroll run against latest master configurations and attendance snapshot?')) return;
    try {
      setIsRecalculatingAll(true);
      const res = await fetch(`/api/payroll/runs/${runId}/recalculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to recalculate payroll run');
      }
      await fetchRunSummary();
      onRunUpdated();
    } catch (err: any) {
      alert(err.message || 'Full run recalculation error');
    } finally {
      setIsRecalculatingAll(false);
    }
  };

  const handleUpdateStatus = async (newStatus: PayrollRunStatus) => {
    try {
      setIsUpdatingStatus(true);
      const res = await fetch(`/api/payroll/runs/${runId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update run status');
      }
      await fetchRunSummary();
      onRunUpdated();
    } catch (err: any) {
      alert(err.message || 'Status update error');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const filteredEmployees = summary?.employees.filter((emp) => {
    const matchesSearch =
      emp.employeeName?.toLowerCase().includes(search.toLowerCase()) ||
      emp.employeeCode?.toLowerCase().includes(search.toLowerCase()) ||
      emp.departmentName?.toLowerCase().includes(search.toLowerCase());

    if (filterStatus === 'EXCEPTIONS') {
      return matchesSearch && emp.status === PayrollRunEmployeeStatus.HAS_EXCEPTIONS;
    }
    return matchesSearch;
  }) || [];

  const run = summary?.run;
  const isDraftOrCalculated = run?.status === PayrollRunStatus.DRAFT || run?.status === PayrollRunStatus.CALCULATED || run?.status === PayrollRunStatus.REVIEW;
  const blockingExceptions = summary?.exceptions.filter((e) => e.severity === PayrollExceptionSeverity.BLOCKING) || [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-6xl w-full overflow-hidden flex flex-col max-h-[92vh]"
        id="payroll-run-review-modal"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-400/30">
              <FileCheck className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-white">
                  Payroll Run #{run?.runNumber || 1} Review
                </h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                    run?.status === PayrollRunStatus.APPROVED
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : run?.status === PayrollRunStatus.REVIEW
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                  }`}
                >
                  {run?.status || 'CALCULATING'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Period: {summary?.period.periodName} ({summary?.period.periodCode}) • Cutoff: {summary?.period.cutoffDate} • Pay Date: {summary?.period.payDate}
              </p>
            </div>
          </div>

            {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {run?.status === PayrollRunStatus.FINALIZED && (
              <>
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Payroll Register
                </button>
                {hasPermission(PermissionKey.PAYROLL_FINALIZE) && (
                  <button
                    type="button"
                    onClick={() => setIsReopenOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reopen Run
                  </button>
                )}
              </>
            )}

            {hasPermission(PermissionKey.PAYROLL_MANAGE) && isDraftOrCalculated && (
              <>
                <button
                  type="button"
                  onClick={handleRecalculateFullRun}
                  disabled={isRecalculatingAll || loading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isRecalculatingAll ? 'animate-spin' : ''}`} />
                  Recalculate Run
                </button>

                {run?.status === PayrollRunStatus.CALCULATED && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(PayrollRunStatus.REVIEW)}
                    disabled={isUpdatingStatus}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white transition-colors"
                  >
                    Submit for Review
                  </button>
                )}

                {run?.status === PayrollRunStatus.REVIEW && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(PayrollRunStatus.APPROVED)}
                    disabled={isUpdatingStatus || blockingExceptions.length > 0}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Approve Payroll
                  </button>
                )}
              </>
            )}

            {run?.status === PayrollRunStatus.APPROVED && hasPermission(PermissionKey.PAYROLL_FINALIZE) && (
              <button
                type="button"
                onClick={() => setIsFinalizeOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors font-bold shadow-xs"
              >
                <Lock className="w-3.5 h-3.5" />
                Finalize & Issue Payslips
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-500">
              <RotateCw className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
              <p className="text-sm">Loading authoritative calculation audit data...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          ) : run ? (
            <>
              {/* Exceptions Banner */}
              {summary.exceptions.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs">
                    <p className="font-semibold text-amber-900">
                      {summary.exceptions.length} Payroll Exception(s) Detected ({blockingExceptions.length} Blocking)
                    </p>
                    <ul className="list-disc pl-4 space-y-0.5 text-amber-800">
                      {summary.exceptions.slice(0, 3).map((exc) => (
                        <li key={exc.id}>
                          <strong>{exc.employeeName || exc.employeeCode}:</strong> {exc.message}
                        </li>
                      ))}
                      {summary.exceptions.length > 3 && (
                        <li>...and {summary.exceptions.length - 3} more exceptions.</li>
                      )}
                    </ul>
                  </div>
                </div>
              )}

              {/* KPI Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                  <p className="text-[11px] font-medium text-slate-500">Employees</p>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">{run.totalEmployees}</p>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                  <p className="text-[11px] font-medium text-slate-500">Total Gross</p>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">
                    ${run.totalGrossEarnings.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                  <p className="text-[11px] font-medium text-slate-500">Total Deductions</p>
                  <p className="text-xl font-bold text-rose-600 mt-0.5">
                    -${run.totalGrossDeductions.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                </div>

                <div className="bg-indigo-900 p-3.5 rounded-xl text-white shadow-xs">
                  <p className="text-[11px] font-medium text-indigo-200">Total Net Payout</p>
                  <p className="text-xl font-bold text-white mt-0.5">
                    ${run.totalNetPay.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                  <p className="text-[11px] font-medium text-slate-500">Total LOP Days</p>
                  <p className="text-xl font-bold text-amber-600 mt-0.5">{run.totalLopDays.toFixed(1)}</p>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                  <p className="text-[11px] font-medium text-slate-500">Overtime Hours</p>
                  <p className="text-xl font-bold text-emerald-600 mt-0.5">{run.totalOtHours.toFixed(1)} hrs</p>
                </div>
              </div>

              {/* Filter and Search Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search employee name, code, dept..."
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setFilterStatus('ALL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      filterStatus === 'ALL'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    All ({summary.employees.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterStatus('EXCEPTIONS')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      filterStatus === 'EXCEPTIONS'
                        ? 'bg-amber-600 text-white'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Exceptions ({summary.exceptions.length})
                  </button>
                </div>
              </div>

              {/* Employee Results Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                        <th className="py-3 px-4">Employee</th>
                        <th className="py-3 px-4">Payable / LOP</th>
                        <th className="py-3 px-4">Overtime</th>
                        <th className="py-3 px-4 text-right">Gross Pay</th>
                        <th className="py-3 px-4 text-right">Deductions</th>
                        <th className="py-3 px-4 text-right">Net Pay</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredEmployees.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400">
                            No employees match current criteria
                          </td>
                        </tr>
                      ) : (
                        filteredEmployees.map((emp) => (
                          <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-900">{emp.employeeName}</div>
                              <div className="text-[11px] text-slate-500">
                                {emp.employeeCode} • {emp.departmentName || 'General'}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="text-slate-900 font-medium">{emp.payableDays} / {emp.periodCalendarDays} days</div>
                              {emp.lossOfPayDays > 0 ? (
                                <span className="text-[11px] text-rose-600 font-semibold">
                                  {emp.lossOfPayDays} days LOP (-${emp.lopDeductionAmount.toFixed(0)})
                                </span>
                              ) : (
                                <span className="text-[11px] text-emerald-600">Full Period</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {emp.approvedOtHours > 0 ? (
                                <div>
                                  <div className="text-emerald-700 font-semibold">+{emp.approvedOtHours} hrs</div>
                                  <div className="text-[11px] text-slate-500">+${emp.otAmount.toFixed(2)}</div>
                                </div>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right font-medium text-slate-900">
                              ${emp.grossEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-right font-medium text-rose-600">
                              -${emp.grossDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-indigo-700">
                              ${emp.netPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {emp.status === PayrollRunEmployeeStatus.HAS_EXCEPTIONS ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                  <AlertTriangle className="w-3 h-3" />
                                  Exception
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Ready
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedEmpId(emp.employeeId)}
                                  className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded transition-colors"
                                  title="View full itemized breakdown"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                {isDraftOrCalculated && hasPermission(PermissionKey.PAYROLL_MANAGE) && (
                                  <button
                                    type="button"
                                    onClick={() => handleRecalculateEmployee(emp.employeeId)}
                                    disabled={isRecalculatingEmp}
                                    className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded transition-colors disabled:opacity-50"
                                    title="Recalculate this employee"
                                  >
                                    <RotateCw className={`w-4 h-4 ${isRecalculatingEmp ? 'animate-spin' : ''}`} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Authoritative calculation audit trail recorded</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-700 transition-colors"
          >
            Close Review
          </button>
        </div>
      </div>

      {/* Single Employee Drilldown Modal */}
      {selectedEmpId && (
        <EmployeePayrollPreviewModal
          runId={runId}
          employeeId={selectedEmpId}
          isOpen={!!selectedEmpId}
          onClose={() => setSelectedEmpId(null)}
          onRecalculate={handleRecalculateEmployee}
          isRecalculating={isRecalculatingEmp}
        />
      )}

      {/* Finalize Modal */}
      {isFinalizeOpen && run && (
        <PayrollFinalizeModal
          run={run}
          isOpen={isFinalizeOpen}
          onClose={() => setIsFinalizeOpen(false)}
          onFinalized={() => {
            fetchRunSummary();
            onRunUpdated();
            setIsFinalizeOpen(false);
          }}
        />
      )}

      {/* Reopen Modal */}
      {isReopenOpen && run && (
        <PayrollReopenModal
          run={run}
          isOpen={isReopenOpen}
          onClose={() => setIsReopenOpen(false)}
          onReopened={() => {
            fetchRunSummary();
            onRunUpdated();
            setIsReopenOpen(false);
          }}
        />
      )}

      {/* Register Modal */}
      {isRegisterOpen && (
        <PayrollRegisterModal
          runId={runId}
          isOpen={isRegisterOpen}
          onClose={() => setIsRegisterOpen(false)}
        />
      )}
    </div>
  );
}
