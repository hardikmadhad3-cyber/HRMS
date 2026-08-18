import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Target,
  Award,
  CheckCircle2,
  Clock,
  Users,
  ShieldCheck,
  Star,
  Layers,
  ArrowUpRight,
  Activity,
} from 'lucide-react';
import { PerformanceDashboardMetrics } from '../../../types/performance.js';
import { performanceApi } from '../../../services/performanceApi.js';

interface PerformanceDashboardTabProps {
  onNavigateTab: (tabKey: string) => void;
}

export function PerformanceDashboardTab({ onNavigateTab }: PerformanceDashboardTabProps) {
  const [metrics, setMetrics] = useState<PerformanceDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMetrics() {
      setLoading(true);
      try {
        const res = await performanceApi.getDashboard();
        if (res.success && res.data) {
          setMetrics(res.data);
        } else {
          setError(res.error || 'Failed to load performance metrics');
        }
      } catch (err: any) {
        setError(err.message || 'Error loading dashboard');
      } finally {
        setLoading(false);
      }
    }
    loadMetrics();
  }, []);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 text-sm">
        Loading performance intelligence & appraisal metrics...
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="p-6 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200">
        {error || 'Unable to retrieve dashboard metrics.'}
      </div>
    );
  }

  const activeCycle = metrics.activeCycle;

  return (
    <div className="space-y-6" id="performance-dashboard-tab">
      {/* Top Banner: Active Cycle Banner */}
      {activeCycle ? (
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 border border-blue-800">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-500/30 text-blue-200 border border-blue-400/30">
              <Activity className="w-3 h-3" /> Active Performance Cycle
            </div>
            <h2 className="text-xl font-extrabold tracking-tight">{activeCycle.name}</h2>
            <p className="text-xs text-blue-200">
              {activeCycle.code} • Cycle Window: {activeCycle.startDate} to {activeCycle.endDate} • Self Review Deadline: {activeCycle.selfReviewDeadline}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigateTab('reviews')}
              className="px-4 py-2 text-xs font-semibold bg-white text-blue-900 hover:bg-blue-50 rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Award className="w-4 h-4 text-blue-600" /> View Appraisals
            </button>
            <button
              onClick={() => onNavigateTab('goals')}
              className="px-4 py-2 text-xs font-semibold bg-blue-800/80 text-white hover:bg-blue-700/80 border border-blue-700 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Target className="w-4 h-4 text-blue-300" /> Manage KRAs
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-amber-50 text-amber-800 text-xs rounded-xl border border-amber-200">
          No active performance cycle found. Create or activate a cycle in the Cycles tab.
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Goals Approved */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              KRAs / Goals
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{metrics.goalsApprovedCount}</span>
            <span className="text-xs text-slate-500">/ {metrics.goalsSubmittedCount} submitted</span>
          </div>
          <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Tracked & Approved Goals
          </div>
        </div>

        {/* Metric 2: Pending Reviews */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Reviews In Progress
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {metrics.selfReviewsPending + metrics.managerReviewsPending}
            </span>
            <span className="text-xs text-slate-500">pending</span>
          </div>
          <div className="text-[11px] text-amber-700 font-medium">
            {metrics.selfReviewsPending} Self • {metrics.managerReviewsPending} Manager
          </div>
        </div>

        {/* Metric 3: Finalized Appraisals */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Finalized & Locked
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{metrics.reviewsFinalized}</span>
            <span className="text-xs font-bold text-blue-700">({metrics.completionRatePct}%)</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all"
              style={{ width: `${Math.min(metrics.completionRatePct, 100)}%` }}
            />
          </div>
        </div>

        {/* Metric 4: Average Score */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Company Avg Rating
            </span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {metrics.averageRating > 0 ? metrics.averageRating.toFixed(2) : '—'}
            </span>
            <span className="text-xs text-slate-500">/ 5.00</span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Across {metrics.totalEmployeesInScope} employees in scope
          </div>
        </div>
      </div>

      {/* Charts & Breakdown Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grade Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Appraisal Grade Calibration</h3>
              <p className="text-xs text-slate-500">Distribution of finalized performance bands</p>
            </div>
            <Award className="w-4 h-4 text-slate-400" />
          </div>

          <div className="space-y-3 pt-2">
            {metrics.gradeDistribution.map((item) => (
              <div key={item.grade} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">{item.label}</span>
                  <span className="text-slate-500 font-mono">
                    {item.count} ({item.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full ${
                      item.grade.includes('Outstanding')
                        ? 'bg-emerald-500'
                        : item.grade.includes('Exceeds')
                        ? 'bg-blue-500'
                        : item.grade.includes('Meets')
                        ? 'bg-indigo-500'
                        : item.grade.includes('Needs')
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.max(item.percentage, item.count > 0 ? 5 : 0)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Department Ratings Summary */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Department Performance Index</h3>
              <p className="text-xs text-slate-500">Average review scores and headcount by department</p>
            </div>
            <Users className="w-4 h-4 text-slate-400" />
          </div>

          {metrics.departmentRatings.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">No department rating data yet.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {metrics.departmentRatings.map((dept) => (
                <div key={dept.departmentId} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-800">{dept.departmentName}</div>
                    <div className="text-[11px] text-slate-400">{dept.count} evaluated employees</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-extrabold text-blue-700">
                      {dept.averageRating > 0 ? `${dept.averageRating.toFixed(2)} ★` : '—'}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500">
                      Score: {dept.averageScore > 0 ? `${dept.averageScore.toFixed(1)}/100` : '—'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity Audit Ledger */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Performance History</h3>
            <p className="text-xs text-slate-500">Real-time audit log of review status transitions and submissions</p>
          </div>
          <button
            onClick={() => onNavigateTab('reviews')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            All Reviews <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {metrics.recentActivity.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">No recent review activity recorded.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {metrics.recentActivity.map((act) => (
              <div key={act.id} className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-slate-100 text-slate-600 rounded-lg">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800">{act.comment}</span>
                    <div className="text-[11px] text-slate-400">
                      By {act.actorName} ({act.actorRole || 'User'})
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
