import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Plus,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Users,
  Settings2,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import {
  PerformanceCycle,
  PerformanceCycleStatus,
  PerformanceReviewTemplate,
} from '../../../types/performance.js';
import { performanceApi } from '../../../services/performanceApi.js';
import { useAuth } from '../../../context/AuthContext.js';
import { PermissionKey } from '../../../types/auth.js';

interface PerformanceCyclesTabProps {
  templates: PerformanceReviewTemplate[];
  onOpenCreateCycle: () => void;
  onNavigateTab: (tabKey: string, cycleId?: string) => void;
}

export function PerformanceCyclesTab({
  templates,
  onOpenCreateCycle,
  onNavigateTab,
}: PerformanceCyclesTabProps) {
  const { hasPermission } = useAuth();
  const canManage = hasPermission(PermissionKey.PERFORMANCE_MANAGE);

  const [cycles, setCycles] = useState<PerformanceCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadCycles = async () => {
    setLoading(true);
    try {
      const res = await performanceApi.getCycles();
      if (res.success && res.data) {
        setCycles(res.data);
      } else {
        setError(res.error || 'Failed to load cycles');
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching cycles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCycles();
  }, []);

  const handleStatusChange = async (cycleId: string, newStatus: PerformanceCycleStatus) => {
    setActionLoadingId(cycleId);
    setError(null);
    setActionSuccess(null);
    try {
      const res = await performanceApi.changeCycleStatus(cycleId, newStatus);
      if (res.success) {
        setActionSuccess(`Cycle status successfully updated to ${newStatus}.`);
        loadCycles();
      } else {
        setError(res.error || 'Failed to update cycle status');
      }
    } catch (err: any) {
      setError(err.message || 'Error updating status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleInitializeReviews = async (cycleId: string) => {
    setActionLoadingId(cycleId);
    setError(null);
    setActionSuccess(null);
    try {
      const res = await performanceApi.initializeCycleReviews(cycleId);
      if (res.success && res.data) {
        setActionSuccess(
          `Initialized appraisal records for ${res.data.initializedCount} active employees (Total company active: ${res.data.totalActiveEmployees}).`
        );
        loadCycles();
      } else {
        setError(res.error || 'Failed to initialize reviews');
      }
    } catch (err: any) {
      setError(err.message || 'Error initializing reviews');
    } finally {
      setActionLoadingId(null);
    }
  };

  const getStatusBadge = (status: PerformanceCycleStatus) => {
    switch (status) {
      case PerformanceCycleStatus.ACTIVE:
        return (
          <span className="px-2.5 py-1 text-xs font-bold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
            Active Evaluation
          </span>
        );
      case PerformanceCycleStatus.GOAL_SETTING:
        return (
          <span className="px-2.5 py-1 text-xs font-bold bg-blue-100 text-blue-800 rounded-full border border-blue-200">
            Goal Setting
          </span>
        );
      case PerformanceCycleStatus.SELF_REVIEW:
        return (
          <span className="px-2.5 py-1 text-xs font-bold bg-indigo-100 text-indigo-800 rounded-full border border-indigo-200">
            Self Review Phase
          </span>
        );
      case PerformanceCycleStatus.MANAGER_REVIEW:
        return (
          <span className="px-2.5 py-1 text-xs font-bold bg-purple-100 text-purple-800 rounded-full border border-purple-200">
            Manager Review Phase
          </span>
        );
      case PerformanceCycleStatus.COMPLETED:
        return (
          <span className="px-2.5 py-1 text-xs font-bold bg-slate-100 text-slate-800 rounded-full border border-slate-200">
            Completed & Locked
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 text-xs font-bold bg-slate-100 text-slate-600 rounded-full">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6" id="performance-cycles-tab">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Performance Appraisal Cycles</h2>
          <p className="text-xs text-slate-500">
            Configure review cadences, evaluation schedules, submission deadlines and appraisal generation.
          </p>
        </div>

        {canManage && (
          <button
            onClick={onOpenCreateCycle}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> New Performance Cycle
          </button>
        )}
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
        <div className="py-12 text-center text-slate-400 text-xs">Loading cycles...</div>
      ) : cycles.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 space-y-3">
          <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">No Performance Cycles Created</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Launch a performance cycle to initiate goal tracking, self-reviews, and manager evaluations.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {cycles.map((cycle) => {
            const template = templates.find((t) => t.id === cycle.defaultTemplateId);
            const isProcessing = actionLoadingId === cycle.id;

            return (
              <div
                key={cycle.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-5 hover:border-slate-300 transition-colors"
              >
                {/* Top cycle row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                        {cycle.code}
                      </span>
                      {getStatusBadge(cycle.status)}
                      <span className="text-xs text-slate-500 font-medium capitalize">
                        • {cycle.cycleType.toLowerCase().replace(/_/g, ' ')}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{cycle.name}</h3>
                    {cycle.description && (
                      <p className="text-xs text-slate-500">{cycle.description}</p>
                    )}
                  </div>

                  {/* Actions & Navigation */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => onNavigateTab('reviews', cycle.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1"
                    >
                      Reviews <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onNavigateTab('goals', cycle.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1"
                    >
                      KRAs <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Dates & Timeline Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase font-semibold">Evaluation Window</span>
                    <div className="font-semibold text-slate-800 mt-0.5">
                      {cycle.startDate} → {cycle.endDate}
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase font-semibold">Self-Review Due</span>
                    <div className="font-semibold text-indigo-700 mt-0.5">
                      {cycle.selfReviewDeadline || 'Not set'}
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase font-semibold">Manager Review Due</span>
                    <div className="font-semibold text-purple-700 mt-0.5">
                      {cycle.managerReviewDeadline || 'Not set'}
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase font-semibold">Template Assigned</span>
                    <div className="font-semibold text-slate-800 mt-0.5 truncate">
                      {template?.name || 'Default Balanced (60/40)'}
                    </div>
                  </div>
                </div>

                {/* Management Controls for HR / Admin */}
                {canManage && cycle.status !== PerformanceCycleStatus.COMPLETED && (
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50/60 p-3 rounded-xl">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-700">Stage Transitions:</span>
                      {cycle.status === PerformanceCycleStatus.DRAFT && (
                        <button
                          disabled={isProcessing}
                          onClick={() => handleStatusChange(cycle.id, PerformanceCycleStatus.GOAL_SETTING)}
                          className="px-2.5 py-1 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50"
                        >
                          Start Goal Setting
                        </button>
                      )}
                      {cycle.status === PerformanceCycleStatus.GOAL_SETTING && (
                        <button
                          disabled={isProcessing}
                          onClick={() => handleStatusChange(cycle.id, PerformanceCycleStatus.ACTIVE)}
                          className="px-2.5 py-1 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors disabled:opacity-50"
                        >
                          Activate Cycle
                        </button>
                      )}
                      {cycle.status === PerformanceCycleStatus.ACTIVE && (
                        <button
                          disabled={isProcessing}
                          onClick={() => handleStatusChange(cycle.id, PerformanceCycleStatus.SELF_REVIEW)}
                          className="px-2.5 py-1 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors disabled:opacity-50"
                        >
                          Open Self Reviews
                        </button>
                      )}
                      {cycle.status === PerformanceCycleStatus.SELF_REVIEW && (
                        <button
                          disabled={isProcessing}
                          onClick={() => handleStatusChange(cycle.id, PerformanceCycleStatus.MANAGER_REVIEW)}
                          className="px-2.5 py-1 font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-colors disabled:opacity-50"
                        >
                          Open Manager Reviews
                        </button>
                      )}
                      {cycle.status === PerformanceCycleStatus.MANAGER_REVIEW && (
                        <button
                          disabled={isProcessing}
                          onClick={() => handleStatusChange(cycle.id, PerformanceCycleStatus.COMPLETED)}
                          className="px-2.5 py-1 font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-md transition-colors disabled:opacity-50"
                        >
                          Complete & Close Cycle
                        </button>
                      )}
                    </div>

                    {/* Auto-generate employee appraisal records */}
                    <button
                      disabled={isProcessing}
                      onClick={() => handleInitializeReviews(cycle.id)}
                      className="px-3 py-1 font-semibold text-blue-700 bg-white border border-blue-300 hover:bg-blue-50 rounded-md shadow-2xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Users className="w-3.5 h-3.5" /> Initialize Employee Appraisals
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
