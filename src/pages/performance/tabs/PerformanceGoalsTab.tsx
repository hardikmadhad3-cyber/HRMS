import React, { useState, useEffect } from 'react';
import {
  Target,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Filter,
  Check,
  TrendingUp,
  Layers,
  Star,
} from 'lucide-react';
import {
  PerformanceGoal,
  PerformanceGoalStatus,
  PerformanceCycle,
} from '../../../types/performance.js';
import { performanceApi } from '../../../services/performanceApi.js';
import { useAuth } from '../../../context/AuthContext.js';
import { PermissionKey, UserRole } from '../../../types/auth.js';

interface PerformanceGoalsTabProps {
  cycles: PerformanceCycle[];
  selectedCycleId?: string;
  onOpenCreateGoal: () => void;
}

export function PerformanceGoalsTab({
  cycles,
  selectedCycleId,
  onOpenCreateGoal,
}: PerformanceGoalsTabProps) {
  const { user, hasPermission } = useAuth();
  const canManage = hasPermission(PermissionKey.PERFORMANCE_MANAGE);

  const [cycleFilter, setCycleFilter] = useState<string>(selectedCycleId || cycles[0]?.id || '');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [goals, setGoals] = useState<PerformanceGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Quick progress update modal state
  const [editingGoal, setEditingGoal] = useState<PerformanceGoal | null>(null);
  const [progressVal, setProgressVal] = useState<number>(0);
  const [updating, setUpdating] = useState(false);

  const loadGoals = async () => {
    setLoading(true);
    try {
      const res = await performanceApi.getGoals({
        cycleId: cycleFilter || undefined,
        category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
      });
      if (res.success && res.data) {
        setGoals(res.data);
      } else {
        setError(res.error || 'Failed to load goals');
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching goals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGoals();
  }, [cycleFilter, categoryFilter]);

  const handleApproveGoal = async (goalId: string) => {
    try {
      const res = await performanceApi.approveGoal(goalId);
      if (res.success) {
        setActionSuccess('Goal approved successfully.');
        loadGoals();
      } else {
        setError(res.error || 'Failed to approve goal');
      }
    } catch (err: any) {
      setError(err.message || 'Error approving goal');
    }
  };

  const handleSaveProgress = async () => {
    if (!editingGoal) return;
    setUpdating(true);
    try {
      const res = await performanceApi.updateGoalProgress(editingGoal.id, progressVal);
      if (res.success) {
        setActionSuccess('Goal progress updated.');
        setEditingGoal(null);
        loadGoals();
      } else {
        setError(res.error || 'Failed to update progress');
      }
    } catch (err: any) {
      setError(err.message || 'Error updating progress');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: PerformanceGoalStatus) => {
    switch (status) {
      case PerformanceGoalStatus.APPROVED:
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full">Approved</span>;
      case PerformanceGoalStatus.IN_PROGRESS:
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 rounded-full">In Progress</span>;
      case PerformanceGoalStatus.COMPLETED:
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-800 rounded-full">Completed</span>;
      case PerformanceGoalStatus.SUBMITTED:
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-full">Pending Approval</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 rounded-full">{status}</span>;
    }
  };

  return (
    <div className="space-y-6" id="performance-goals-tab">
      {/* Filters & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Cycle filter */}
          <select
            value={cycleFilter}
            onChange={(e) => setCycleFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg p-2 bg-white font-medium"
          >
            <option value="">All Cycles</option>
            {cycles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg p-2 bg-white font-medium"
          >
            <option value="ALL">All Categories</option>
            <option value="FINANCIAL">Financial & Revenue</option>
            <option value="OPERATIONAL">Operational & Execution</option>
            <option value="CUSTOMER">Customer Success</option>
            <option value="LEARNING_GROWTH">Learning & Growth</option>
          </select>
        </div>

        <button
          onClick={onOpenCreateGoal}
          className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Define Goal / KRA
        </button>
      </div>

      {actionSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-slate-400 text-xs">Loading goals and KRAs...</div>
      ) : goals.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 space-y-3">
          <Target className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">No Performance Goals Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Click 'Define Goal / KRA' to establish measurable performance key results.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((goal) => {
            const pct = goal.targetValue > 0 ? Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100)) : 0;

            return (
              <div
                key={goal.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4 hover:border-slate-300 transition-colors flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md uppercase">
                        {goal.category}
                      </span>
                      {goal.isManagerGoal && (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md">
                          Strategic / Manager Goal
                        </span>
                      )}
                    </div>
                    {getStatusBadge(goal.status)}
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 leading-snug">{goal.title}</h3>
                  {goal.description && (
                    <p className="text-xs text-slate-500 line-clamp-2">{goal.description}</p>
                  )}

                  {/* Owner & Department */}
                  <div className="flex items-center gap-2 text-xs text-slate-600 pt-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold">{goal.employeeName || goal.employeeId}</span>
                    {goal.departmentName && (
                      <span className="text-slate-400 font-normal">• {goal.departmentName}</span>
                    )}
                  </div>

                  {/* Cascading Goal linkage */}
                  {goal.parentGoalTitle && (
                    <div className="text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-200 text-slate-600 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      <span>Alings to: <strong className="text-slate-800">{goal.parentGoalTitle}</strong></span>
                    </div>
                  )}
                </div>

                {/* Progress bar and metrics */}
                <div className="space-y-2 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">
                      Current: <strong className="text-slate-900">{goal.currentValue} {goal.unit}</strong> / {goal.targetValue} {goal.unit}
                    </span>
                    <span className="font-bold text-emerald-700">{pct}%</span>
                  </div>

                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        pct >= 100 ? 'bg-emerald-500' : 'bg-blue-600'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {/* Weightage & Actions */}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] font-semibold text-slate-500">
                      Weight: <strong className="text-slate-800">{goal.weightage}%</strong>
                    </span>

                    <div className="flex items-center gap-2">
                      {goal.status === PerformanceGoalStatus.SUBMITTED && (canManage || user?.role === UserRole.MANAGER) && (
                        <button
                          onClick={() => handleApproveGoal(goal.id)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" /> Approve
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setEditingGoal(goal);
                          setProgressVal(goal.currentValue);
                        }}
                        className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                      >
                        Update Progress
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Progress Update Modal */}
      {editingGoal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Update Goal Progress</h3>
              <button
                onClick={() => setEditingGoal(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 font-semibold">{editingGoal.title}</p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Current Achievement Value ({editingGoal.unit})
              </label>
              <input
                type="number"
                step="any"
                value={progressVal}
                onChange={(e) => setProgressVal(parseFloat(e.target.value) || 0)}
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Target: {editingGoal.targetValue} {editingGoal.unit}
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => setEditingGoal(null)}
                className="px-3 py-1.5 text-xs text-slate-700 bg-white border border-slate-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProgress}
                disabled={updating}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
              >
                {updating ? 'Saving...' : 'Save Progress'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
