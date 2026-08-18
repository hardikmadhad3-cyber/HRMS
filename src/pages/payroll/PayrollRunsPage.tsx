import React, { useState, useEffect } from 'react';
import {
  FileCheck,
  Play,
  RotateCw,
  Search,
  Filter,
  DollarSign,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  Trash2,
  ShieldCheck,
  Calendar,
  Sparkles,
  UserCheck,
  Lock,
  RotateCcw,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { PayrollRun, PayrollRunStatus } from '../../types/payroll.js';
import { CalculatePayrollModal } from './CalculatePayrollModal.js';
import { PayrollRunReviewModal } from './PayrollRunReviewModal.js';
import { EmployeePayrollPreviewModal } from './EmployeePayrollPreviewModal.js';
import { PayrollFinalizeModal } from './PayrollFinalizeModal.js';
import { PayrollReopenModal } from './PayrollReopenModal.js';
import { PayrollRegisterModal } from './PayrollRegisterModal.js';
import { EmployeePayslipViewModal } from './EmployeePayslipViewModal.js';
import { useAuth } from '../../context/AuthContext.js';
import { PermissionKey, UserRole } from '../../types/auth.js';

export function PayrollRunsPage() {
  const { user, hasPermission } = useAuth();
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isCalculateModalOpen, setIsCalculateModalOpen] = useState<boolean>(false);
  const [selectedReviewRunId, setSelectedReviewRunId] = useState<string | null>(null);
  const [isMyPreviewOpen, setIsMyPreviewOpen] = useState<boolean>(false);

  // Phase 4C Modals
  const [finalizeRun, setFinalizeRun] = useState<PayrollRun | null>(null);
  const [reopenRun, setReopenRun] = useState<PayrollRun | null>(null);
  const [registerRunId, setRegisterRunId] = useState<string | null>(null);

  const fetchRuns = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/payroll/runs', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load payroll runs');
      }
      setRuns(json.data);
    } catch (err: any) {
      setError(err.message || 'Error loading payroll runs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const handleDeleteRun = async (runId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this DRAFT payroll run? All calculated ledger lines will be removed.')) return;
    try {
      const res = await fetch(`/api/payroll/runs/${runId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to delete payroll run');
      }
      fetchRuns();
    } catch (err: any) {
      alert(err.message || 'Delete failed');
    }
  };

  const totalPayout = runs.reduce((acc, r) => acc + (r.totalNetPay || 0), 0);
  const totalEmployees = runs.length > 0 ? runs[0].totalEmployees : 0;
  const totalExceptions = runs.reduce((acc, r) => acc + (r.exceptionsCount || 0), 0);

  return (
    <div className="space-y-6" id="payroll-runs-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Payroll Calculation Engine</h1>
          <p className="text-sm text-slate-500 mt-1">
            Deterministic gross-to-net calculation engine, finalized attendance-integrated LOP deductions & audit reviews.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {user?.employeeId && (
            <button
              type="button"
              onClick={() => setIsMyPreviewOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 shadow-xs transition-colors"
            >
              <UserCheck className="w-4 h-4 text-indigo-600" />
              My Payroll Preview
            </button>
          )}

          {hasPermission(PermissionKey.PAYROLL_MANAGE) && (
            <button
              type="button"
              onClick={() => setIsCalculateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Execute Payroll Run
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Payroll Runs Recorded</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <FileCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{runs.length}</p>
          <p className="text-xs text-slate-400 mt-1">Authoritative immutable snapshots</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Active Headcount</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{totalEmployees}</p>
          <p className="text-xs text-emerald-600 mt-1">100% compensation mapped</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Net Calculated</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            ${totalPayout.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-slate-400 mt-1">Gross minus deductions</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Payroll Exceptions</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{totalExceptions}</p>
          <p className="text-xs text-slate-400 mt-1">Requires review before approval</p>
        </div>
      </div>

      {/* Runs Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            Calculated Payroll Runs
          </h2>
          <button
            onClick={fetchRuns}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading && runs.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-500">
            <RotateCw className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
            <p className="text-sm">Loading payroll execution runs...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-rose-600 text-sm">{error}</div>
        ) : runs.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center px-4">
            <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
              <Play className="w-6 h-6 fill-current" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">No Payroll Runs Initiated</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Select an active payroll period and execute a deterministic calculation run using authoritative finalized attendance snapshots.
            </p>
            {hasPermission(PermissionKey.PAYROLL_MANAGE) && (
              <button
                type="button"
                onClick={() => setIsCalculateModalOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Initiate First Payroll Run
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Run #</th>
                  <th className="py-3 px-4">Payroll Period</th>
                  <th className="py-3 px-4 text-center">Employees</th>
                  <th className="py-3 px-4 text-right">Gross Earnings</th>
                  <th className="py-3 px-4 text-right">Deductions</th>
                  <th className="py-3 px-4 text-right">Net Payout</th>
                  <th className="py-3 px-4 text-center">LOP / OT</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {runs.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedReviewRunId(r.id)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-bold text-slate-900">#{r.runNumber}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">
                        {r.payrollPeriod?.periodName || 'Monthly Cycle'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Pay Date: {r.runDate} • Calculated: {r.calculatedAt?.substring(0, 10)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center font-medium text-slate-700">
                      {r.totalEmployees}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-900">
                      ${r.totalGrossEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-rose-600">
                      -${r.totalGrossDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-indigo-700">
                      ${r.totalNetPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="text-[11px] text-slate-600">
                        {r.totalLopDays > 0 ? (
                          <span className="text-rose-600 font-medium">{r.totalLopDays.toFixed(1)}d LOP</span>
                        ) : (
                          '0d LOP'
                        )}
                        {' • '}
                        {r.totalOtHours > 0 ? (
                          <span className="text-emerald-600 font-medium">{r.totalOtHours.toFixed(1)}h OT</span>
                        ) : (
                          '0h OT'
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                          r.status === PayrollRunStatus.FINALIZED
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : r.status === PayrollRunStatus.APPROVED
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : r.status === PayrollRunStatus.REVIEW
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : r.status === PayrollRunStatus.CALCULATED
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {r.status === PayrollRunStatus.FINALIZED && <Lock className="w-3 h-3" />}
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setSelectedReviewRunId(r.id)}
                          className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded text-slate-700 text-xs font-medium transition-colors"
                        >
                          Review
                        </button>
                        {r.status === PayrollRunStatus.FINALIZED ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setRegisterRunId(r.id)}
                              className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-xs font-medium transition-colors border border-indigo-200"
                              title="View Payroll Register & Payslips"
                            >
                              Register
                            </button>
                            {hasPermission(PermissionKey.PAYROLL_FINALIZE) && (
                              <button
                                type="button"
                                onClick={() => setReopenRun(r)}
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded text-xs font-medium transition-colors border border-amber-200"
                                title="Controlled Reopen"
                              >
                                Reopen
                              </button>
                            )}
                          </>
                        ) : (
                          hasPermission(PermissionKey.PAYROLL_FINALIZE) && (
                            <button
                              type="button"
                              onClick={() => setFinalizeRun(r)}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium transition-colors"
                              title="Finalize & Generate Payslips"
                            >
                              Finalize
                            </button>
                          )
                        )}
                        {(r.status === PayrollRunStatus.DRAFT || r.status === PayrollRunStatus.CALCULATED) &&
                          hasPermission(PermissionKey.PAYROLL_MANAGE) && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteRun(r.id, e)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              title="Delete run"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Calculate Run Modal */}
      {isCalculateModalOpen && (
        <CalculatePayrollModal
          isOpen={isCalculateModalOpen}
          onClose={() => setIsCalculateModalOpen(false)}
          onRunCalculated={(runId) => {
            fetchRuns();
            setSelectedReviewRunId(runId);
          }}
        />
      )}

      {/* Review Modal */}
      {selectedReviewRunId && (
        <PayrollRunReviewModal
          runId={selectedReviewRunId}
          isOpen={!!selectedReviewRunId}
          onClose={() => setSelectedReviewRunId(null)}
          onRunUpdated={fetchRuns}
        />
      )}

      {/* Finalize Modal */}
      {finalizeRun && (
        <PayrollFinalizeModal
          run={finalizeRun}
          isOpen={!!finalizeRun}
          onClose={() => setFinalizeRun(null)}
          onFinalized={() => {
            fetchRuns();
            setFinalizeRun(null);
          }}
        />
      )}

      {/* Reopen Modal */}
      {reopenRun && (
        <PayrollReopenModal
          run={reopenRun}
          isOpen={!!reopenRun}
          onClose={() => setReopenRun(null)}
          onReopened={() => {
            fetchRuns();
            setReopenRun(null);
          }}
        />
      )}

      {/* Register Modal */}
      {registerRunId && (
        <PayrollRegisterModal
          runId={registerRunId}
          isOpen={!!registerRunId}
          onClose={() => setRegisterRunId(null)}
        />
      )}

      {/* Self-Service Preview Modal */}
      {isMyPreviewOpen && user?.employeeId && (
        <EmployeePayrollPreviewModal
          runId={runs.length > 0 ? runs[0].id : ''}
          employeeId={user.employeeId}
          isOpen={isMyPreviewOpen}
          onClose={() => setIsMyPreviewOpen(false)}
        />
      )}
    </div>
  );
}
