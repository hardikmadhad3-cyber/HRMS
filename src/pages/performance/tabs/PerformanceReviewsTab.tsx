import React, { useState, useEffect } from 'react';
import {
  Award,
  UserCheck,
  Lock,
  History,
  CheckCircle2,
  AlertCircle,
  Star,
  Clock,
  User,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import {
  PerformanceReview,
  PerformanceReviewStatus,
  PerformanceCycle,
  PerformanceReviewTemplate,
} from '../../../types/performance.js';
import { performanceApi } from '../../../services/performanceApi.js';
import { useAuth } from '../../../context/AuthContext.js';
import { PermissionKey, UserRole } from '../../../types/auth.js';

import { SelfReviewModal } from '../components/SelfReviewModal.js';
import { ManagerReviewModal } from '../components/ManagerReviewModal.js';
import { FinalizeReviewModal } from '../components/FinalizeReviewModal.js';
import { ReviewHistoryDrawer } from '../components/ReviewHistoryDrawer.js';

interface PerformanceReviewsTabProps {
  cycles: PerformanceCycle[];
  templates: PerformanceReviewTemplate[];
  selectedCycleId?: string;
}

export function PerformanceReviewsTab({
  cycles,
  templates,
  selectedCycleId,
}: PerformanceReviewsTabProps) {
  const { user, hasPermission } = useAuth();
  const canManage = hasPermission(PermissionKey.PERFORMANCE_MANAGE);

  const [cycleFilter, setCycleFilter] = useState<string>(selectedCycleId || cycles[0]?.id || '');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [selfReviewTarget, setSelfReviewTarget] = useState<PerformanceReview | null>(null);
  const [managerReviewTarget, setManagerReviewTarget] = useState<PerformanceReview | null>(null);
  const [finalizeTarget, setFinalizeTarget] = useState<PerformanceReview | null>(null);
  const [historyTarget, setHistoryTarget] = useState<PerformanceReview | null>(null);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const res = await performanceApi.getReviews({
        cycleId: cycleFilter || undefined,
        status: statusFilter !== 'ALL' ? (statusFilter as PerformanceReviewStatus) : undefined,
      });
      if (res.success && res.data) {
        setReviews(res.data);
      } else {
        setError(res.error || 'Failed to load reviews');
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [cycleFilter, statusFilter]);

  const getStatusBadge = (status: PerformanceReviewStatus) => {
    switch (status) {
      case PerformanceReviewStatus.FINALIZED:
        return (
          <span className="px-2.5 py-0.5 text-xs font-extrabold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200 flex items-center gap-1">
            <Lock className="w-3 h-3" /> Finalized
          </span>
        );
      case PerformanceReviewStatus.COMPLETED:
      case PerformanceReviewStatus.IN_REVIEW:
        return (
          <span className="px-2.5 py-0.5 text-xs font-bold bg-purple-100 text-purple-800 rounded-full border border-purple-200">
            Manager Evaluated
          </span>
        );
      case PerformanceReviewStatus.MANAGER_REVIEW_PENDING:
        return (
          <span className="px-2.5 py-0.5 text-xs font-bold bg-blue-100 text-blue-800 rounded-full border border-blue-200">
            Self Appraisal Done
          </span>
        );
      case PerformanceReviewStatus.SELF_REVIEW_PENDING:
      case PerformanceReviewStatus.GOALS_SUBMITTED:
        return (
          <span className="px-2.5 py-0.5 text-xs font-bold bg-amber-100 text-amber-800 rounded-full border border-amber-200">
            Self Appraisal Due
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-full">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6" id="performance-reviews-tab">
      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={cycleFilter}
            onChange={(e) => setCycleFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg p-2 bg-white font-medium"
          >
            <option value="">All Appraisal Cycles</option>
            {cycles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg p-2 bg-white font-medium"
          >
            <option value="ALL">All Appraisal Statuses</option>
            <option value={PerformanceReviewStatus.SELF_REVIEW_PENDING}>Pending Self Review</option>
            <option value={PerformanceReviewStatus.MANAGER_REVIEW_PENDING}>Self Review Submitted</option>
            <option value={PerformanceReviewStatus.IN_REVIEW}>Manager Review In Progress</option>
            <option value={PerformanceReviewStatus.COMPLETED}>Completed</option>
            <option value={PerformanceReviewStatus.FINALIZED}>Finalized & Locked</option>
          </select>
        </div>

        <span className="text-xs text-slate-500 font-medium">
          Showing {reviews.length} employee appraisals
        </span>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-slate-400 text-xs">Loading performance reviews...</div>
      ) : reviews.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 space-y-3">
          <Award className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">No Appraisal Records Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Initialize appraisals from the Performance Cycles tab to generate review forms.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((rev) => {
            const template = templates.find((t) => t.id === rev.templateId);
            const isEmployeeSelf = rev.employeeId === user?.employeeId;
            const isManagerOfRecord = rev.reviewerId === user?.employeeId;

            return (
              <div
                key={rev.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4 hover:border-slate-300 transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Employee Info */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-bold text-slate-900">{rev.employeeName}</span>
                      <span className="text-xs font-mono px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                        {rev.employeeCode}
                      </span>
                      {getStatusBadge(rev.status)}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <span>{rev.employeeDepartment || 'General'}</span>
                      <span>•</span>
                      <span>Cycle: {rev.cycleName}</span>
                      <span>•</span>
                      <span>Reviewer: {rev.reviewerName || rev.reviewerId || 'Assigned Manager'}</span>
                    </div>
                  </div>

                  {/* Middle: Scores */}
                  <div className="flex items-center gap-6 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Self Rating</span>
                      <div className="font-bold text-blue-700 mt-0.5">
                        {rev.selfOverallRating ? `${rev.selfOverallRating.toFixed(1)} ★` : '—'}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Manager Rating</span>
                      <div className="font-bold text-purple-700 mt-0.5">
                        {rev.managerOverallRating ? `${rev.managerOverallRating.toFixed(1)} ★` : '—'}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Final Grade</span>
                      <div className="font-extrabold text-emerald-700 mt-0.5">
                        {rev.finalGrade || (rev.finalScore ? `${rev.finalScore.toFixed(0)}/100` : 'Pending')}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Self Review Action */}
                    {(isEmployeeSelf || canManage) && rev.status !== PerformanceReviewStatus.FINALIZED && (
                      <button
                        onClick={() => setSelfReviewTarget(rev)}
                        className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Award className="w-3.5 h-3.5" /> Self Review
                      </button>
                    )}

                    {/* Manager Review Action */}
                    {(isManagerOfRecord || canManage || user?.role === UserRole.MANAGER) && rev.status !== PerformanceReviewStatus.FINALIZED && (
                      <button
                        onClick={() => setManagerReviewTarget(rev)}
                        className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <UserCheck className="w-3.5 h-3.5" /> Manager Appraisal
                      </button>
                    )}

                    {/* Finalize Action */}
                    {(canManage || user?.role === UserRole.HR_ADMIN || user?.role === UserRole.SUPER_ADMIN) && rev.status !== PerformanceReviewStatus.FINALIZED && (
                      <button
                        onClick={() => setFinalizeTarget(rev)}
                        className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Lock className="w-3.5 h-3.5" /> Finalize
                      </button>
                    )}

                    {/* Audit History Drawer button */}
                    <button
                      onClick={() => setHistoryTarget(rev)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1"
                      title="View Audit Ledger History"
                    >
                      <History className="w-3.5 h-3.5" /> History
                    </button>
                  </div>
                </div>

                {/* Finalized details preview */}
                {rev.isFinalized && rev.finalComments && (
                  <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl text-xs text-emerald-900 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Final HR Sign-off:</span> {rev.finalComments}
                      <span className="text-[11px] text-emerald-700 ml-2 font-mono">
                        (Finalized on: {rev.finalizedAt ? new Date(rev.finalizedAt).toLocaleDateString() : '—'})
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modals & Drawers */}
      {selfReviewTarget && (
        <SelfReviewModal
          review={selfReviewTarget}
          template={templates.find((t) => t.id === selfReviewTarget.templateId)}
          onClose={() => setSelfReviewTarget(null)}
          onSuccess={loadReviews}
        />
      )}

      {managerReviewTarget && (
        <ManagerReviewModal
          review={managerReviewTarget}
          template={templates.find((t) => t.id === managerReviewTarget.templateId)}
          onClose={() => setManagerReviewTarget(null)}
          onSuccess={loadReviews}
        />
      )}

      {finalizeTarget && (
        <FinalizeReviewModal
          review={finalizeTarget}
          template={templates.find((t) => t.id === finalizeTarget.templateId)}
          onClose={() => setFinalizeTarget(null)}
          onSuccess={loadReviews}
        />
      )}

      {historyTarget && (
        <ReviewHistoryDrawer
          review={historyTarget}
          onClose={() => setHistoryTarget(null)}
        />
      )}
    </div>
  );
}
