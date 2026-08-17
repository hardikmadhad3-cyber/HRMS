import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  Calendar,
  ShieldCheck,
  Play,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  UserCheck,
  RefreshCw,
  FileCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { PermissionKey } from '../../types/auth.js';
import { leaveApi, AssignLeavePolicyPayload } from '../../services/leaveApi.js';
import { apiClient } from '../../services/apiClient.js';
import { LeavePolicy, EmployeeLeavePolicyAssignment, LeavePolicyEvaluationResult } from '../../types/leave.js';
import { PageHeader } from '../../components/shell/PageHeader.js';
import { useNotification } from '../../context/NotificationContext.js';

interface EmployeeItem {
  id: string;
  employeeCode: string;
  displayName: string;
  departmentName?: string;
  designationName?: string;
  status: string;
  joiningDate: string;
  gender?: string;
}

export function LeaveAssignmentsPage() {
  const { activeCompanyId, hasPermission } = useAuth();
  const { addNotification } = useNotification();

  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [policies, setPolicies] = useState<LeavePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Selected employee for assignment modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState<AssignLeavePolicyPayload>({
    employeeId: '',
    leavePolicyId: '',
    effectiveFrom: new Date().toISOString().slice(0, 10),
    effectiveTo: '',
    assignmentReason: 'Annual Policy Allocation',
  });

  // Policy Eligibility Tester / Simulator Drawer
  const [showTesterDrawer, setShowTesterDrawer] = useState(false);
  const [testEmployeeId, setTestEmployeeId] = useState('');
  const [testAsOfDate, setTestAsOfDate] = useState(new Date().toISOString().slice(0, 10));
  const [evaluating, setEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<LeavePolicyEvaluationResult | null>(null);

  const fetchEmployeesAndPolicies = useCallback(async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    try {
      const [empRes, polRes] = await Promise.all([
        apiClient.get('/api/v1/employees', undefined, activeCompanyId),
        leaveApi.getPolicies({ status: 'ACTIVE' }, activeCompanyId),
      ]);

      if (empRes.success && empRes.data) {
        const data = empRes.data as any;
        setEmployees(Array.isArray(data) ? data : data.items || []);
      }
      if (polRes.success && polRes.data) {
        setPolicies(polRes.data);
      }
    } catch (err: any) {
      addNotification({
        type: 'error',
        title: 'Fetch Error',
        message: err?.message || 'Failed to load employee list.',
      });
    } finally {
      setLoading(false);
    }
  }, [activeCompanyId, addNotification]);

  useEffect(() => {
    fetchEmployeesAndPolicies();
  }, [fetchEmployeesAndPolicies]);

  const handleOpenAssign = (empId?: string) => {
    const defaultPol = policies.find((p) => p.isDefault) || policies[0];
    setAssignForm({
      employeeId: empId || (employees[0]?.id ?? ''),
      leavePolicyId: defaultPol?.id || '',
      effectiveFrom: new Date().toISOString().slice(0, 10),
      effectiveTo: '',
      assignmentReason: 'Annual Policy Allocation',
    });
    setShowAssignModal(true);
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.employeeId || !assignForm.leavePolicyId || !assignForm.effectiveFrom) {
      addNotification({ type: 'warning', title: 'Validation', message: 'Employee, Policy, and Effective From date are required.' });
      return;
    }

    try {
      const res = await leaveApi.assignPolicy(assignForm, activeCompanyId);
      if (res.success) {
        addNotification({
          type: 'success',
          title: 'Policy Assigned',
          message: `Leave policy assigned to employee successfully.`,
        });
        setShowAssignModal(false);
      } else {
        addNotification({ type: 'error', title: 'Assignment Failed', message: res.error });
      }
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Assignment Failed', message: err?.message });
    }
  };

  const handleRunEvaluation = async (empId?: string) => {
    const targetEmpId = empId || testEmployeeId || employees[0]?.id;
    if (!targetEmpId) return;

    setTestEmployeeId(targetEmpId);
    setShowTesterDrawer(true);
    setEvaluating(true);
    try {
      const res = await leaveApi.previewPolicy(targetEmpId, testAsOfDate, undefined, activeCompanyId);
      if (res.success && res.data) {
        setEvaluationResult(res.data);
      } else {
        addNotification({ type: 'error', title: 'Evaluation Failed', message: res.error });
      }
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Evaluation Failed', message: err?.message });
    } finally {
      setEvaluating(false);
    }
  };

  const filteredEmployees = employees.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.displayName?.toLowerCase().includes(q) ||
      e.employeeCode?.toLowerCase().includes(q) ||
      e.departmentName?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Employee Leave Policy Assignments"
        subtitle="Manage effective-dated policy allocations, schedule future policy transitions, and evaluate rule eligibility."
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleRunEvaluation()}
              className="px-3.5 py-2 rounded-lg border border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Play className="w-3.5 h-3.5 fill-purple-700 text-purple-700" />
              <span>Evaluate Eligibility Engine</span>
            </button>
            {hasPermission(PermissionKey.LEAVE_MANAGE) && (
              <button
                onClick={() => handleOpenAssign()}
                className="px-3.5 py-2 rounded-lg bg-[#17365D] hover:bg-[#122b4a] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Assign Policy to Employee</span>
              </button>
            )}
          </div>
        }
      />

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex-1 w-full md:w-auto relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search employees by name, code, or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-blue-600"
          />
        </div>
      </div>

      {/* Employee List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Department & Role</th>
                <th className="py-3 px-4">Joining Date & Tenure</th>
                <th className="py-3 px-4">Employment Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Loading employees...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No employees found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{emp.displayName}</div>
                      <div className="font-mono text-[10px] text-slate-500">{emp.employeeCode}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div>{emp.departmentName || 'Engineering'}</div>
                      <div className="text-[11px] text-slate-400">{emp.designationName || 'Staff'}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                      {emp.joiningDate || '2024-01-15'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          emp.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : emp.status === 'PROBATION'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {emp.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleRunEvaluation(emp.id)}
                          className="px-2.5 py-1 rounded bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors border border-purple-200 shadow-2xs"
                        >
                          <Play className="w-3 h-3 fill-purple-600 text-purple-600" />
                          <span>Test Rules</span>
                        </button>
                        {hasPermission(PermissionKey.LEAVE_MANAGE) && (
                          <button
                            onClick={() => handleOpenAssign(emp.id)}
                            className="px-2.5 py-1 rounded bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 shadow-2xs cursor-pointer"
                          >
                            Assign Policy
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

      {/* Modal: Assign Policy to Employee */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                <span>Assign Leave Policy to Employee</span>
              </h3>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-600 text-lg">
                ×
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Employee *</label>
                <select
                  required
                  value={assignForm.employeeId}
                  onChange={(e) => setAssignForm({ ...assignForm, employeeId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="" disabled>
                    -- Select Employee --
                  </option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.displayName} ({e.employeeCode}) - {e.status}
                    </option>
                  ))}
                </select>
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
                <label className="block font-semibold text-slate-700 mb-1">Assignment Reason / Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Annual allocation, promotion policy change"
                  value={assignForm.assignmentReason}
                  onChange={(e) => setAssignForm({ ...assignForm, assignmentReason: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-blue-600"
                />
              </div>

              <div className="p-3 bg-blue-50/70 rounded-lg border border-blue-100 text-[11px] text-blue-900 leading-relaxed">
                <span className="font-bold">Effective-Dated Policy Transition:</span> If this employee already has an
                active policy, assigning a new policy with effective date <span className="font-mono font-bold">{assignForm.effectiveFrom}</span> will
                automatically close the previous policy on the day before.
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

      {/* Drawer: Deterministic Leave Policy Eligibility Evaluator & Previewer */}
      {showTesterDrawer && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex justify-end z-50">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Play className="w-5 h-5 fill-purple-600 text-purple-600" />
                  <div>
                    <h2 className="font-bold text-base text-slate-900">Deterministic Policy Evaluation Engine</h2>
                    <p className="text-xs text-slate-500">
                      Real-time test of effective policy resolution, probation access, tenure criteria, and sandwich rules.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTesterDrawer(false)}
                  className="text-slate-400 hover:text-slate-600 text-2xl font-bold p-1 cursor-pointer"
                >
                  ×
                </button>
              </div>

              {/* Simulation Controls */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Employee</label>
                  <select
                    value={testEmployeeId}
                    onChange={(e) => {
                      setTestEmployeeId(e.target.value);
                      handleRunEvaluation(e.target.value);
                    }}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-medium"
                  >
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.displayName} ({e.employeeCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">As-Of Date</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={testAsOfDate}
                      onChange={(e) => setTestAsOfDate(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono bg-white"
                    />
                    <button
                      onClick={() => handleRunEvaluation(testEmployeeId)}
                      className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold shrink-0 cursor-pointer"
                    >
                      Test
                    </button>
                  </div>
                </div>
              </div>

              {/* Invariant Banner */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-[11px] text-amber-900 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Phase 3A Configuration Invariant:</strong> This evaluation tests deterministic policy rules and eligibility only. Zero synthetic transaction balances are generated.
                </span>
              </div>

              {/* Evaluation Results */}
              {evaluating ? (
                <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-purple-600" />
                  <span>Evaluating policy matrix...</span>
                </div>
              ) : !evaluationResult ? (
                <div className="text-center py-12 text-xs text-slate-400">
                  Select an employee and date to run policy evaluation.
                </div>
              ) : (
                <div className="space-y-4 text-xs">
                  {/* Resolved Policy Header */}
                  <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <span>Governing Policy:</span>
                        <span className="text-purple-700">
                          {evaluationResult.policy?.name || 'Company Default Policy'}
                        </span>
                      </div>
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold">
                        {evaluationResult.policy?.code || 'DEFAULT'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-600 pt-1 border-t border-purple-100">
                      <div>
                        <span className="text-slate-400 block">Service Tenure:</span>
                        <span className="font-bold text-slate-900">{evaluationResult.serviceDays} Days</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Employment Status:</span>
                        <span className="font-bold text-slate-900">
                          {evaluationResult.isProbation ? 'PROBATION' : 'CONFIRMED'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Gender Demographics:</span>
                        <span className="font-bold text-slate-900">{evaluationResult.gender || 'ALL'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Leave Types Evaluation Results */}
                  <div className="space-y-3">
                    <div className="font-bold text-slate-900 uppercase text-[10px] tracking-wider">
                      Evaluated Leave Rules ({evaluationResult.rules?.length || 0})
                    </div>

                    {evaluationResult.rules?.map((rule) => (
                      <div
                        key={rule.leaveTypeId}
                        className={`p-4 rounded-xl border transition-all ${
                          rule.eligible
                            ? 'bg-white border-emerald-200 shadow-2xs'
                            : 'bg-rose-50/30 border-rose-200'
                        }`}
                      >
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                              {rule.leaveTypeCode}
                            </span>
                            <span className="font-bold text-slate-900 text-xs">{rule.leaveTypeName}</span>
                            <span className="text-[10px] text-slate-500 font-semibold">({rule.paidType})</span>
                          </div>

                          <span
                            className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              rule.eligible
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {rule.eligible ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>ELIGIBLE</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3 text-rose-600" />
                                <span>RESTRICTED</span>
                              </>
                            )}
                          </span>
                        </div>

                        {!rule.eligible && rule.ineligibilityReasons.length > 0 && (
                          <div className="mt-2 p-2 bg-rose-50 rounded border border-rose-200 text-rose-800 text-[11px] space-y-1">
                            {rule.ineligibilityReasons.map((reason, idx) => (
                              <div key={idx} className="flex items-start gap-1.5">
                                <span className="font-bold">•</span>
                                <span>{reason}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="grid grid-cols-3 gap-2 mt-2.5 text-[11px] text-slate-600">
                          <div>
                            <span className="text-slate-400 block text-[10px]">Entitlement:</span>
                            <span className="font-bold text-slate-800">{rule.annualEntitlement} Days/Yr</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Accrual Rhythm:</span>
                            <span>{rule.accrualFrequency.replace('_', ' ')}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Sandwich Rule:</span>
                            <span className={rule.sandwichRuleEnabled ? 'font-bold text-amber-700' : 'text-slate-500'}>
                              {rule.sandwichRuleEnabled ? 'Yes' : 'No'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Carry Forward:</span>
                            <span>{rule.allowCarryForward ? `Max ${rule.maxCarryForwardDays}d` : 'No'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Encashment:</span>
                            <span>{rule.allowEncashment ? `Max ${rule.maxEncashmentDaysPerYear}d` : 'No'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Proof Required:</span>
                            <span>{rule.requiresAttachment ? `> ${rule.attachmentThresholdDays}d` : 'None'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowTesterDrawer(false)}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 cursor-pointer"
              >
                Close Engine Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
