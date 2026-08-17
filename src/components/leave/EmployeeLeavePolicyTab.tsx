import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Calendar,
  Layers,
  Plus,
  History,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Play,
  RefreshCw,
  Edit,
  Clock,
} from 'lucide-react';
import { leaveApi, AssignLeavePolicyPayload } from '../../services/leaveApi.js';
import {
  EmployeeLeavePolicyAssignment,
  LeavePolicy,
  LeavePolicyEvaluationResult,
} from '../../types/leave.js';
import { useNotification } from '../../context/NotificationContext.js';
import { useAuth } from '../../context/AuthContext.js';
import { PermissionKey } from '../../types/auth.js';

interface Props {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  companyId: string;
}

export function EmployeeLeavePolicyTab({
  employeeId,
  employeeName,
  employeeCode,
  companyId,
}: Props) {
  const { hasPermission } = useAuth();
  const { addNotification } = useNotification();

  const [loading, setLoading] = useState(true);
  const [currentPolicy, setCurrentPolicy] = useState<EmployeeLeavePolicyAssignment | null>(null);
  const [futurePolicy, setFuturePolicy] = useState<EmployeeLeavePolicyAssignment | null>(null);
  const [history, setHistory] = useState<EmployeeLeavePolicyAssignment[]>([]);
  const [policies, setPolicies] = useState<LeavePolicy[]>([]);

  // Simulation State
  const [testAsOfDate, setTestAsOfDate] = useState(new Date().toISOString().slice(0, 10));
  const [evaluating, setEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<LeavePolicyEvaluationResult | null>(null);

  // Assign Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState<AssignLeavePolicyPayload>({
    employeeId,
    leavePolicyId: '',
    effectiveFrom: new Date().toISOString().slice(0, 10),
    effectiveTo: '',
    assignmentReason: 'Employee Policy Update',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [histRes, polRes] = await Promise.all([
        leaveApi.getEmployeePolicyHistory(employeeId, companyId),
        leaveApi.getPolicies({ status: 'ACTIVE' }, companyId),
      ]);

      if (histRes.success && histRes.data) {
        setCurrentPolicy(histRes.data.currentPolicy);
        setFuturePolicy(histRes.data.futurePolicy);
        setHistory(histRes.data.history || []);
      }

      if (polRes.success && polRes.data) {
        setPolicies(polRes.data);
      }
    } catch (err: any) {
      addNotification({
        type: 'error',
        title: 'Fetch Error',
        message: err?.message || 'Failed to load employee policy assignment history.',
      });
    } finally {
      setLoading(false);
    }
  }, [employeeId, companyId, addNotification]);

  const runEvaluation = useCallback(async (asOf?: string) => {
    const targetDate = asOf || testAsOfDate;
    setEvaluating(true);
    try {
      const res = await leaveApi.previewPolicy(employeeId, targetDate, undefined, companyId);
      if (res.success && res.data) {
        setEvaluation(res.data);
      }
    } catch (err: any) {
      addNotification({
        type: 'error',
        title: 'Evaluation Error',
        message: err?.message || 'Failed to evaluate deterministic leave eligibility.',
      });
    } finally {
      setEvaluating(false);
    }
  }, [employeeId, testAsOfDate, companyId, addNotification]);

  useEffect(() => {
    fetchData();
    runEvaluation();
  }, [fetchData, runEvaluation]);

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.leavePolicyId || !assignForm.effectiveFrom) {
      addNotification({ type: 'warning', title: 'Validation', message: 'Leave policy and effective date are required.' });
      return;
    }

    try {
      const res = await leaveApi.assignPolicy(
        { ...assignForm, employeeId },
        companyId
      );
      if (res.success) {
        addNotification({
          type: 'success',
          title: 'Policy Assigned',
          message: `Leave policy updated successfully.`,
        });
        setShowAssignModal(false);
        fetchData();
        runEvaluation();
      } else {
        addNotification({ type: 'error', title: 'Assignment Failed', message: res.error });
      }
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Assignment Failed', message: err?.message });
    }
  };

  const handleCancelAssignment = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to cancel this scheduled policy assignment?')) return;
    try {
      const res = await leaveApi.cancelAssignment(assignmentId, companyId);
      if (res.success) {
        addNotification({ type: 'success', title: 'Cancelled', message: 'Policy assignment cancelled.' });
        fetchData();
        runEvaluation();
      }
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Cancel Failed', message: err?.message });
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-xs text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
        Loading Leave Policy Engine...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Policy Status Header Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              <span>Leave Policy & Entitlement Governance</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Governs employee's leave rules, accrual mechanics, probation restrictions, and eligibility.
            </p>
          </div>

          {hasPermission(PermissionKey.LEAVE_MANAGE) && (
            <button
              onClick={() => {
                const defaultPol = policies.find((p) => p.isDefault) || policies[0];
                setAssignForm({
                  employeeId,
                  leavePolicyId: defaultPol?.id || '',
                  effectiveFrom: new Date().toISOString().slice(0, 10),
                  effectiveTo: '',
                  assignmentReason: 'Admin Policy Reassignment',
                });
                setShowAssignModal(true);
              }}
              className="px-3.5 py-2 rounded-lg bg-[#17365D] hover:bg-[#122b4a] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Assign New Policy</span>
            </button>
          )}
        </div>

        {/* Current & Future Policy Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Current Policy */}
          <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/30 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-purple-700">Currently Active Policy</div>
            {currentPolicy ? (
              <div>
                <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span>{currentPolicy.leavePolicyName}</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 font-bold">
                    {currentPolicy.leavePolicyCode}
                  </span>
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  Effective: <span className="font-mono font-medium">{currentPolicy.effectiveFrom}</span>
                  {currentPolicy.effectiveTo ? (
                    <> → <span className="font-mono font-medium">{currentPolicy.effectiveTo}</span></>
                  ) : (
                    <span className="text-emerald-700 font-medium ml-1">(Ongoing)</span>
                  )}
                </div>
                {currentPolicy.assignmentReason && (
                  <div className="text-[11px] text-slate-500 mt-1 italic">
                    Reason: {currentPolicy.assignmentReason}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-slate-500">
                Using <strong>Company Default Policy</strong> (No custom assignment).
              </div>
            )}
          </div>

          {/* Future Scheduled Policy */}
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/30 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Scheduled Future Policy</div>
            {futurePolicy ? (
              <div>
                <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span>{futurePolicy.leavePolicyName}</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">
                    {futurePolicy.leavePolicyCode}
                  </span>
                </div>
                <div className="text-xs text-slate-600 mt-1 flex items-center justify-between">
                  <span>Starts: <span className="font-mono font-medium">{futurePolicy.effectiveFrom}</span></span>
                  {hasPermission(PermissionKey.LEAVE_MANAGE) && (
                    <button
                      onClick={() => handleCancelAssignment(futurePolicy.id)}
                      className="text-rose-600 hover:underline text-xs font-semibold cursor-pointer"
                    >
                      Cancel Schedule
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400 py-1">No future policy transition scheduled.</div>
            )}
          </div>
        </div>
      </div>

      {/* Deterministic Evaluation Matrix */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
              <Play className="w-3.5 h-3.5 fill-purple-600 text-purple-600" />
              <span>Leave Rules & Eligibility Preview</span>
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Deterministic rule evaluation for tenure, probation restrictions, and entitlements.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">As-of:</span>
            <input
              type="date"
              value={testAsOfDate}
              onChange={(e) => {
                setTestAsOfDate(e.target.value);
                runEvaluation(e.target.value);
              }}
              className="px-2.5 py-1 rounded-lg border border-slate-300 font-mono bg-white text-xs"
            />
          </div>
        </div>

        {/* Phase Invariant Warning */}
        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-[11px] text-amber-900 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Phase 3A Configuration Invariant:</strong> Rules reflect entitlement schedules & eligibility. Zero synthetic ledger balances.
          </span>
        </div>

        {evaluating ? (
          <div className="py-6 text-center text-xs text-slate-400">Evaluating policy rules...</div>
        ) : !evaluation || !evaluation.rules || evaluation.rules.length === 0 ? (
          <div className="text-xs text-slate-400 py-6 text-center">No leave rules found for this employee.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {evaluation.rules.map((rule) => (
              <div
                key={rule.leaveTypeId}
                className={`p-4 rounded-xl border transition-all ${
                  rule.eligible
                    ? 'bg-white border-slate-200 shadow-2xs'
                    : 'bg-rose-50/30 border-rose-200'
                }`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                      {rule.leaveTypeCode}
                    </span>
                    <span className="font-bold text-xs text-slate-900">{rule.leaveTypeName}</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      rule.eligible
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    {rule.eligible ? 'ELIGIBLE' : 'RESTRICTED'}
                  </span>
                </div>

                {!rule.eligible && rule.ineligibilityReasons.length > 0 && (
                  <div className="mt-2 p-2 bg-rose-50 rounded border border-rose-200 text-rose-800 text-[10px] space-y-0.5">
                    {rule.ineligibilityReasons.map((r, i) => (
                      <div key={i}>• {r}</div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 mt-2.5 text-[11px] text-slate-600">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Entitlement</span>
                    <span className="font-bold text-slate-800">{rule.annualEntitlement} Days/Yr</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Accrual</span>
                    <span>{rule.accrualFrequency.replace('_', ' ')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Sandwich Rule</span>
                    <span className={rule.sandwichRuleEnabled ? 'text-amber-700 font-bold' : 'text-slate-500'}>
                      {rule.sandwichRuleEnabled ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Carry Forward</span>
                    <span>{rule.allowCarryForward ? `Max ${rule.maxCarryForwardDays}d` : 'No'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historical Assignments Audit Table */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <History className="w-4 h-4 text-slate-500" />
          <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
            Policy Assignment History & Audit Trail ({history.length})
          </h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Policy</th>
                <th className="py-2.5 px-3">Effective From</th>
                <th className="py-2.5 px-3">Effective To</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Assignment Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-slate-400 text-xs">
                    No historical assignments recorded.
                  </td>
                </tr>
              ) : (
                history.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      {h.leavePolicyName} ({h.leavePolicyCode})
                    </td>
                    <td className="py-2.5 px-3 font-mono">{h.effectiveFrom}</td>
                    <td className="py-2.5 px-3 font-mono">{h.effectiveTo || 'Ongoing'}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          h.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {h.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">{h.assignmentReason || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Assign Policy */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                <span>Assign Leave Policy</span>
              </h3>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-600 text-lg">
                ×
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Employee</label>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-bold text-slate-900">
                  {employeeName} ({employeeCode})
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Leave Policy *</label>
                <select
                  required
                  value={assignForm.leavePolicyId}
                  onChange={(e) => setAssignForm({ ...assignForm, leavePolicyId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="" disabled>
                    -- Select Policy --
                  </option>
                  {policies.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code}) {p.isDefault ? '— [DEFAULT]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Effective From *</label>
                  <input
                    type="date"
                    required
                    value={assignForm.effectiveFrom}
                    onChange={(e) => setAssignForm({ ...assignForm, effectiveFrom: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Effective To (Optional)</label>
                  <input
                    type="date"
                    value={assignForm.effectiveTo || ''}
                    onChange={(e) => setAssignForm({ ...assignForm, effectiveTo: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assignment Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Promotion, Transfer to HQ, Annual policy change"
                  value={assignForm.assignmentReason}
                  onChange={(e) => setAssignForm({ ...assignForm, assignmentReason: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#17365D] text-white font-bold hover:bg-[#122b4a] cursor-pointer"
                >
                  Assign Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
