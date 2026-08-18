import React, { useState } from 'react';
import { X, Lock, CheckCircle2, AlertCircle, Award, Star, ShieldCheck } from 'lucide-react';
import { PerformanceReview, PerformanceReviewTemplate, FinalizeReviewDTO } from '../../../types/performance.js';
import { performanceApi } from '../../../services/performanceApi.js';

interface FinalizeReviewModalProps {
  review: PerformanceReview;
  template?: PerformanceReviewTemplate | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function FinalizeReviewModal({ review, template, onClose, onSuccess }: FinalizeReviewModalProps) {
  // Default final rating
  const initialFinalRating = review.finalRating || review.managerOverallRating || 4.5;
  const [finalRating, setFinalRating] = useState<number>(initialFinalRating);
  const [finalScore, setFinalScore] = useState<number>(review.finalScore || Number((initialFinalRating * 20).toFixed(1)));
  
  // Calculate grade based on rating
  const resolveGrade = (rating: number) => {
    if (template?.ratingScale) {
      const match = template.ratingScale.find((r) => rating >= r.minScore && rating <= r.maxScore);
      if (match) return match.label;
    }
    if (rating >= 4.5) return 'Outstanding (O)';
    if (rating >= 3.5) return 'Exceeds Expectations (EE)';
    if (rating >= 2.5) return 'Meets Expectations (ME)';
    if (rating >= 1.5) return 'Needs Improvement (NI)';
    return 'Unsatisfactory (U)';
  };

  const [finalGrade, setFinalGrade] = useState<string>(review.finalGrade || resolveGrade(initialFinalRating));
  const [finalComments, setFinalComments] = useState<string>(
    review.finalComments || 'Performance review completed and calibrated successfully.'
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRatingChange = (newRating: number) => {
    setFinalRating(newRating);
    setFinalScore(Number((newRating * 20).toFixed(1)));
    setFinalGrade(resolveGrade(newRating));
  };

  const handleFinalize = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const dto: FinalizeReviewDTO = {
      finalRating,
      finalScore,
      finalGrade,
      finalComments,
    };

    try {
      const res = await performanceApi.finalizeReview(review.id, dto);
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error || 'Failed to finalize appraisal');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-emerald-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Finalize & Lock Appraisal</h3>
              <p className="text-xs text-slate-500">
                {review.cycleName} • {review.employeeName} ({review.employeeCode})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleFinalize} className="p-6 space-y-5 flex-1 overflow-y-auto">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Appraisal Summary Card */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <div>
              <span className="text-[11px] text-slate-500 font-medium">Self Overall Rating</span>
              <div className="text-sm font-bold text-blue-700 mt-0.5">
                {review.selfOverallRating ? `${review.selfOverallRating.toFixed(2)} / 5.0` : 'Not submitted'}
              </div>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 font-medium">Manager Rating</span>
              <div className="text-sm font-bold text-indigo-700 mt-0.5">
                {review.managerOverallRating ? `${review.managerOverallRating.toFixed(2)} / 5.0` : 'Not submitted'}
              </div>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 font-medium">Recommendation</span>
              <div className="text-xs font-bold text-emerald-700 mt-0.5 uppercase">
                {review.managerRecommendations || 'Standard'}
              </div>
            </div>
          </div>

          {/* Calibrated Final Rating */}
          <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Star className="w-4 h-4 text-emerald-600 fill-emerald-600" /> Final Calibrated Rating (1.0 - 5.0)
              </label>
              <span className="text-base font-extrabold px-3 py-0.5 bg-emerald-700 text-white rounded-full">
                {finalRating.toFixed(2)} / 5.0
              </span>
            </div>

            <input
              type="range"
              min="1.0"
              max="5.0"
              step="0.05"
              value={finalRating}
              onChange={(e) => handleRatingChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Final Score (0-100)</span>
                <div className="text-lg font-black text-slate-900">{finalScore.toFixed(1)} / 100</div>
              </div>
              <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Resolved Grade Band</span>
                <div className="text-xs font-extrabold text-emerald-700 mt-1">{finalGrade}</div>
              </div>
            </div>
          </div>

          {/* Final Summary Comments */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Final Review Assessment & HR Sign-off Notes
            </label>
            <textarea
              rows={3}
              value={finalComments}
              onChange={(e) => setFinalComments(e.target.value)}
              placeholder="Final HR summary comments, promotion sign-offs, or career milestone acknowledgements..."
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              required
            />
          </div>

          {/* Notice Banner */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-start gap-2">
            <Lock className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Finalization Lock:</span> Finalizing locks all ratings and appends an immutable snapshot to the historical audit ledger. Ratings remain securely within performance management and are not automatically linked to payroll calculations.
            </div>
          </div>

          {/* Actions */}
          <div className="border-t border-slate-200 pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              {loading ? 'Finalizing...' : 'Finalize & Lock Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
