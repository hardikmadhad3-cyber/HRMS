import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Calendar,
  Clock,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  FileText,
  RotateCw,
  Info,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Layers,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react';
import { PayrollRunEmployee, PayrollComponentResult, PayrollException } from '../../types/payroll.js';
import { useAuth } from '../../context/AuthContext.js';
import { PermissionKey } from '../../types/auth.js';

interface EmployeePayrollPreviewModalProps {
  runId: string;
  employeeId: string;
  isOpen: boolean;
  onClose: () => void;
  onRecalculate?: (employeeId: string) => Promise<void>;
  isRecalculating?: boolean;
}

export function EmployeePayrollPreviewModal({
  runId,
  employeeId,
  isOpen,
  onClose,
  onRecalculate,
  isRecalculating = false,
}: EmployeePayrollPreviewModalProps) {
  const { hasPermission } = useAuth();
  const [data, setData] = useState<PayrollRunEmployee | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBreakdown = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/payroll/runs/${runId}/employees/${employeeId}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load employee payroll breakdown');
      }
      setData(json.data);
    } catch (err: any) {
      setError(err.message || 'Error loading payroll breakdown');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && runId && employeeId) {
      fetchBreakdown();
    }
  }, [isOpen, runId, employeeId]);

  if (!isOpen) return null;

  const earnings = data?.components?.filter((c) => c.componentType === 'EARNING') || [];
  const deductions = data?.components?.filter((c) => c.componentType === 'DEDUCTION') || [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-4xl w-full overflow-hidden flex flex-col max-h-[90vh]"
        id="employee-payroll-preview-modal"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-400/30">
              <DollarSign className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {data ? `${data.employeeName} (${data.employeeCode})` : 'Employee Payroll Breakdown'}
              </h2>
              <p className="text-xs text-slate-400">
                {data?.departmentName || 'Department'} • {data?.designationName || 'Designation'} • Currency: {data?.currency || 'USD'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onRecalculate && hasPermission(PermissionKey.PAYROLL_MANAGE) && (
              <button
                type="button"
                onClick={() => onRecalculate(employeeId)}
                disabled={isRecalculating || loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isRecalculating ? 'animate-spin' : ''}`} />
                Recalculate
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500">
              <RotateCw className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
              <p className="text-sm">Calculating deterministic compensation breakdown...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          ) : data ? (
            <>
              {/* Exceptions Alert if present */}
              {data.exceptions && data.exceptions.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                  <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Payroll Exceptions Detected ({data.exceptions.length})
                  </div>
                  <ul className="space-y-1 text-xs text-amber-700 pl-6 list-disc">
                    {data.exceptions.map((exc) => (
                      <li key={exc.id}>
                        <span className="font-semibold uppercase tracking-wider">{exc.exceptionType}:</span> {exc.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Attendance & Proration Authorization Card */}
              <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    Finalized Attendance & Proration Metrics
                  </h3>
                  <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Proration Factor: {((data.prorationFactor ?? 1) * 100).toFixed(1)}%
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60">
                    <p className="text-xs text-slate-500 font-medium">Calendar Days</p>
                    <p className="text-lg font-bold text-slate-900 mt-0.5">{data.periodCalendarDays}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60">
                    <p className="text-xs text-slate-500 font-medium">Present / Paid Days</p>
                    <p className="text-lg font-bold text-emerald-700 mt-0.5">
                      {data.presentDays + data.paidLeaveDays} <span className="text-xs font-normal text-slate-500">days</span>
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60">
                    <p className="text-xs text-slate-500 font-medium">Loss of Pay (LOP)</p>
                    <p className="text-lg font-bold text-rose-600 mt-0.5">
                      {data.lossOfPayDays} <span className="text-xs font-normal text-slate-500">days</span>
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60">
                    <p className="text-xs text-slate-500 font-medium">Payable Days</p>
                    <p className="text-lg font-bold text-indigo-600 mt-0.5">
                      {data.payableDays} <span className="text-xs font-normal text-slate-500">days</span>
                    </p>
                  </div>
                </div>

                {data.approvedOtHours > 0 && (
                  <div className="p-3 bg-emerald-50/70 rounded-lg border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                      <span>
                        <strong>Approved Overtime:</strong> {data.approvedOtHours} hours @ ${data.otRatePerHour.toFixed(2)}/hr base × 1.5 multiplier
                      </span>
                    </div>
                    <span className="font-bold text-emerald-800 text-sm">
                      +${data.otAmount.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {/* Financial Breakdown Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-500">Gross Earnings</p>
                    <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-xl font-bold text-slate-900 mt-1">
                    ${data.grossEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                  {data.lopDeductionAmount > 0 && (
                    <p className="text-xs text-rose-600 mt-1">
                      -${data.lopDeductionAmount.toFixed(2)} LOP deduction applied
                    </p>
                  )}
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-500">Total Deductions</p>
                    <ArrowDownRight className="w-4 h-4 text-rose-600" />
                  </div>
                  <p className="text-xl font-bold text-slate-900 mt-1">
                    ${data.grossDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Statutory & voluntary</p>
                </div>

                <div className="bg-indigo-900 text-white p-4 rounded-xl shadow-xs">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-indigo-200">Net Take-Home Pay</p>
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-2xl font-bold text-white mt-1">
                    ${data.netPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-indigo-200 mt-1">Monthly Gross: ${data.monthlyGross.toLocaleString()}</p>
                </div>
              </div>

              {/* Itemized Components Tables */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Earnings */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-semibold text-xs text-slate-700 uppercase tracking-wider flex items-center justify-between">
                    <span>Earning Components</span>
                    <span className="text-emerald-700">${data.grossEarnings.toFixed(2)}</span>
                  </div>
                  <div className="divide-y divide-slate-100 text-xs">
                    {earnings.length === 0 ? (
                      <p className="p-4 text-slate-400 text-center">No earning components defined</p>
                    ) : (
                      earnings.map((comp) => (
                        <div key={comp.id} className="p-3 space-y-1 hover:bg-slate-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-800">{comp.componentName}</span>
                            <span className="font-bold text-slate-900">${comp.finalAmount.toFixed(2)}</span>
                          </div>
                          <div className="text-slate-500 text-[11px] leading-relaxed flex flex-col gap-0.5">
                            <span>{comp.formulaDerivation}</span>
                            {comp.isOverride && (
                              <span className="text-indigo-600 font-medium">• Custom override active</span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                    {data.otAmount > 0 && (
                      <div className="p-3 bg-emerald-50/50 space-y-1">
                        <div className="flex items-center justify-between text-emerald-900 font-semibold">
                          <span>Approved Overtime Pay</span>
                          <span>+${data.otAmount.toFixed(2)}</span>
                        </div>
                        <p className="text-[11px] text-emerald-700">
                          {data.approvedOtHours} hrs × ${data.otRatePerHour.toFixed(2)}/hr × 1.5
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Deductions */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-semibold text-xs text-slate-700 uppercase tracking-wider flex items-center justify-between">
                    <span>Deduction Components</span>
                    <span className="text-rose-700">${data.grossDeductions.toFixed(2)}</span>
                  </div>
                  <div className="divide-y divide-slate-100 text-xs">
                    {deductions.length === 0 ? (
                      <p className="p-4 text-slate-400 text-center">No deductions configured</p>
                    ) : (
                      deductions.map((comp) => (
                        <div key={comp.id} className="p-3 space-y-1 hover:bg-slate-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-800">{comp.componentName}</span>
                            <span className="font-bold text-rose-600">-${comp.finalAmount.toFixed(2)}</span>
                          </div>
                          <p className="text-slate-500 text-[11px] leading-relaxed">{comp.formulaDerivation}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Authoritative snapshot immutably preserved in run ledger</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
