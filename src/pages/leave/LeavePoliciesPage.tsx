import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Plus,
  Search,
  Edit,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Layers,
  Users,
  Star,
  Sliders,
  Calendar,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { PermissionKey } from '../../types/auth.js';
import { leaveApi } from '../../services/leaveApi.js';
import { LeavePolicy } from '../../types/leave.js';
import { PageHeader } from '../../components/shell/PageHeader.js';
import { useNotification } from '../../context/NotificationContext.js';

export function LeavePoliciesPage() {
  const { activeCompanyId, hasPermission } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();

  const [policies, setPolicies] = useState<LeavePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedPolicyId, setExpandedPolicyId] = useState<string | null>(null);

  const fetchPolicies = useCallback(async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    try {
      const res = await leaveApi.getPolicies(
        {
          search: search || undefined,
          status: statusFilter || undefined,
        },
        activeCompanyId
      );
      if (res.success && res.data) {
        setPolicies(res.data);
      }
    } catch (err: any) {
      addNotification({
        type: 'error',
        title: 'Fetch Error',
        message: err?.message || 'Could not load leave policies.',
      });
    } finally {
      setLoading(false);
    }
  }, [activeCompanyId, search, statusFilter, addNotification]);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  const handleToggleStatus = async (policy: LeavePolicy) => {
    const nextStatus = policy.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const res = await leaveApi.setPolicyStatus(policy.id, nextStatus, activeCompanyId);
    if (res.success) {
      addNotification({
        type: 'success',
        title: 'Status Updated',
        message: `Policy ${policy.code} is now ${nextStatus}.`,
      });
      fetchPolicies();
    } else {
      addNotification({ type: 'error', title: 'Update Failed', message: res.error });
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedPolicyId(expandedPolicyId === id ? null : id);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Leave Policies & Rule Sets"
        subtitle="Manage deterministic leave rule sets: annual entitlements, accrual rhythms, carry-forwards, encashment, and sandwich calculations."
        actions={
          hasPermission(PermissionKey.LEAVE_MANAGE) && (
            <button
              onClick={() => navigate('/leave/policies/new')}
              className="px-3.5 py-2 rounded-lg bg-[#17365D] hover:bg-[#122b4a] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Leave Policy</span>
            </button>
          )
        }
      />

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex-1 w-full md:w-auto relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search policies by code, name, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-blue-600"
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Policies List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-xs text-slate-400">
            Loading policies...
          </div>
        ) : policies.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-xs text-slate-400">
            No leave policies configured yet. Click "Create Leave Policy" to get started.
          </div>
        ) : (
          policies.map((policy) => {
            const isExpanded = expandedPolicyId === policy.id;
            return (
              <div
                key={policy.id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden transition-all"
              >
                {/* Policy Header Card */}
                <div className="p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-slate-900 text-sm">{policy.name}</h3>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-bold">
                          {policy.code}
                        </span>
                        {policy.isDefault && (
                          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                            <Star className="w-3 h-3 fill-blue-600 text-blue-600" />
                            <span>COMPANY DEFAULT</span>
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            policy.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {policy.status}
                        </span>
                      </div>
                      {policy.description && (
                        <p className="text-xs text-slate-500 mt-1">{policy.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-[11px] text-slate-500 font-medium">
                        <span className="flex items-center gap-1 text-slate-700">
                          <Layers className="w-3.5 h-3.5 text-blue-600" />
                          <span>{policy.rules?.length || 0} Leave Type Rules</span>
                        </span>
                        <span className="flex items-center gap-1 text-slate-700">
                          <Users className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{policy.assignedEmployeesCount || 0} Assigned Employees</span>
                        </span>
                        <span>Evaluation Priority: #{policy.priority}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
                    <button
                      onClick={() => toggleExpand(policy.id)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <span>{isExpanded ? 'Hide Rules' : 'Inspect Rules'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    {hasPermission(PermissionKey.LEAVE_MANAGE) && (
                      <>
                        <button
                          onClick={() => navigate(`/leave/policies/${policy.id}/edit`)}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit Policy</span>
                        </button>
                        <button
                          onClick={() => handleToggleStatus(policy)}
                          className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                            policy.status === 'ACTIVE'
                              ? 'border-rose-200 text-rose-600 hover:bg-rose-50'
                              : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={policy.status === 'ACTIVE' ? 'Deactivate Policy' : 'Activate Policy'}
                        >
                          {policy.status === 'ACTIVE' ? (
                            <XCircle className="w-4 h-4" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Expanded Rules View */}
                {isExpanded && (
                  <div className="border-t border-slate-200 bg-slate-50/50 p-5 space-y-4">
                    <div className="text-xs font-bold text-slate-900 uppercase tracking-wider text-[10px]">
                      Configured Leave Rules ({policy.rules?.length || 0})
                    </div>
                    {policy.rules && policy.rules.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {policy.rules.map((rule) => (
                          <div
                            key={rule.id}
                            className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2.5"
                          >
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-blue-700 px-1.5 py-0.5 rounded bg-blue-50">
                                  {rule.leaveTypeCode}
                                </span>
                                <span className="font-bold text-xs text-slate-900">{rule.leaveTypeName}</span>
                              </div>
                              <span className="text-[10px] font-semibold text-slate-500 uppercase">
                                {rule.leavePaidType}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                              <div>
                                <span className="text-slate-400 block text-[10px]">Annual Entitlement</span>
                                <span className="font-bold text-slate-800">{rule.annualEntitlement} Days</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px]">Accrual Rhythm</span>
                                <span className="font-semibold text-slate-700">
                                  {rule.accrualFrequency.replace('_', ' ')}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px]">Carry Forward</span>
                                <span className="text-slate-700">
                                  {rule.allowCarryForward ? `Max ${rule.maxCarryForwardDays}d` : 'No'}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px]">Encashment</span>
                                <span className="text-slate-700">
                                  {rule.allowEncashment ? `Max ${rule.maxEncashmentDaysPerYear}d` : 'No'}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px]">Sandwich Rule</span>
                                <span className={rule.sandwichRuleEnabled ? 'text-amber-700 font-bold' : 'text-slate-500'}>
                                  {rule.sandwichRuleEnabled ? 'Enabled' : 'Disabled'}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px]">Probation Access</span>
                                <span className={rule.allowDuringProbation ? 'text-emerald-700' : 'text-rose-700'}>
                                  {rule.allowDuringProbation ? 'Allowed' : 'Disallowed'}
                                </span>
                              </div>
                            </div>

                            {(rule.minServiceDaysRequired > 0 || rule.applicableGender !== 'ALL') && (
                              <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-500 flex flex-wrap gap-2">
                                {rule.minServiceDaysRequired > 0 && (
                                  <span className="bg-slate-100 px-1.5 py-0.5 rounded">
                                    Min Tenure: {rule.minServiceDaysRequired}d
                                  </span>
                                )}
                                {rule.applicableGender !== 'ALL' && (
                                  <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-medium">
                                    Gender: {rule.applicableGender}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400">No leave rules defined for this policy.</div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
