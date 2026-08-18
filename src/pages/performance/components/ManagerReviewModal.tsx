import React, { useState } from 'react';
import { X, Award, CheckCircle2, AlertCircle, Star, UserCheck } from 'lucide-react';
import { PerformanceReview, PerformanceReviewTemplate, SubmitManagerReviewDTO, ManagerRecommendation } from '../../../types/performance.js';
import { performanceApi } from '../../../services/performanceApi.js';

interface ManagerReviewModalProps {
  review: PerformanceReview;
  template?: PerformanceReviewTemplate | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ManagerReviewModal({ review, template, onClose, onSuccess }: ManagerReviewModalProps) {
  const [managerOverallRating, setManagerOverallRating] = useState<number>(review.managerOverallRating || 4.5);
  const [managerOverallComments, setManagerOverallComments] = useState<string>(review.managerOverallComments || '');
  const [managerStrengths, setManagerStrengths] = useState<string>(review.managerStrengths || '');
  const [managerImprovements, setManagerImprovements] = useState<string>(review.managerImprovements || '');
  const [managerRecommendations, setManagerRecommendations] = useState<ManagerRecommendation>(
    review.managerRecommendations || ManagerRecommendation.SALARY_HIKE
  );

  // Initialize competencies from template or review
  const initialCompetencies = (template?.competencies || []).map((c) => {
    const existing = review.managerCompetencyRatings?.find((mc) => mc.competencyId === c.id);
    const selfEval = review.selfCompetencyRatings?.find((sc) => sc.competencyId === c.id);
    return {
      competencyId: c.id,
      name: c.name,
      category: c.category,
      description: c.description,
      selfRating: selfEval?.rating,
      rating: existing?.rating || 4.5,
      comment: existing?.comment || '',
    };
  });

  const [competencies, setCompetencies] = useState(initialCompetencies);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCompetencyRatingChange = (id: string, rating: number) => {
    setCompetencies((prev) =>
      prev.map((c) => (c.competencyId === id ? { ...c, rating } : c))
    );
  };

  const handleCompetencyCommentChange = (id: string, comment: string) => {
    setCompetencies((prev) =>
      prev.map((c) => (c.competencyId === id ? { ...c, comment } : c))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managerOverallComments.trim()) {
      setError('Please provide manager appraisal feedback comments.');
      return;
    }

    setLoading(true);
    setError(null);

    const dto: SubmitManagerReviewDTO = {
      managerOverallRating,
      managerOverallComments,
      managerStrengths,
      managerImprovements,
      managerRecommendations,
      competencyRatings: competencies.map((c) => ({
        competencyId: c.competencyId,
        rating: c.rating,
        comment: c.comment,
      })),
    };

    try {
      const res = await performanceApi.submitManagerReview(review.id, dto);
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error || 'Failed to submit manager review');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Manager Performance Appraisal</h3>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Self-Review Summary Snapshot if available */}
          {review.selfOverallRating && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Employee Self-Assessment Snapshot
                </span>
                <span className="text-xs font-bold px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                  Self Rating: {review.selfOverallRating.toFixed(1)} / 5.0
                </span>
              </div>
              <p className="text-xs text-slate-600 italic">"{review.selfOverallComments}"</p>
              {review.selfStrengths && (
                <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                  <span className="font-semibold text-slate-700">Self Strengths:</span> {review.selfStrengths}
                </div>
              )}
            </div>
          )}

          {/* Manager Overall Rating Slider */}
          <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> Manager Rating Assessment (1.0 - 5.0)
              </label>
              <span className="text-base font-bold px-3 py-0.5 bg-indigo-600 text-white rounded-full">
                {managerOverallRating.toFixed(1)} / 5.0
              </span>
            </div>
            <input
              type="range"
              min="1.0"
              max="5.0"
              step="0.1"
              value={managerOverallRating}
              onChange={(e) => setManagerOverallRating(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-[11px] text-slate-500 mt-1">
              <span>1.0 Unsatisfactory</span>
              <span>2.5 Meets Baseline</span>
              <span>4.0 Exceeds</span>
              <span>5.0 Outstanding</span>
            </div>
          </div>

          {/* Manager Feedback */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Manager Appraisal Feedback & Evaluation <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={managerOverallComments}
                onChange={(e) => setManagerOverallComments(e.target.value)}
                placeholder="Comprehensive evaluation of the employee's contribution, code quality, sprint reliability, and team impact..."
                className="w-full text-sm border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Observed Strengths
                </label>
                <textarea
                  rows={2}
                  value={managerStrengths}
                  onChange={(e) => setManagerStrengths(e.target.value)}
                  placeholder="Key strengths recognized by leadership..."
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Improvement Areas & Next Milestones
                </label>
                <textarea
                  rows={2}
                  value={managerImprovements}
                  onChange={(e) => setManagerImprovements(e.target.value)}
                  placeholder="Focus areas for the upcoming review cycle..."
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Strategic Manager Recommendation */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Manager Strategic Recommendation
              </label>
              <select
                value={managerRecommendations}
                onChange={(e) => setManagerRecommendations(e.target.value as ManagerRecommendation)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value={ManagerRecommendation.PROMOTION}>Promotion (Fast-track to next grade level)</option>
                <option value={ManagerRecommendation.SALARY_HIKE}>Salary Increment (Merit pay raise)</option>
                <option value={ManagerRecommendation.BONUS}>Retention / Performance Bonus</option>
                <option value={ManagerRecommendation.ROLE_CHANGE}>Lateral Transfer / Role Expansion</option>
                <option value={ManagerRecommendation.TRAINING}>Targeted Skills Training & Mentorship</option>
                <option value={ManagerRecommendation.NONE}>Maintain Current Grade & Compensation</option>
                <option value={ManagerRecommendation.PIP}>Performance Improvement Plan (PIP)</option>
              </select>
            </div>
          </div>

          {/* Competency Ratings by Manager */}
          {competencies.length > 0 && (
            <div className="space-y-4 border-t border-slate-200 pt-5">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Competency Rubric Scores</h4>
                <p className="text-xs text-slate-500">
                  Calibrate score against performance template competencies.
                </p>
              </div>

              <div className="space-y-3.5">
                {competencies.map((comp) => (
                  <div
                    key={comp.competencyId}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-800">{comp.name}</span>
                        {comp.selfRating && (
                          <span className="ml-2 px-2 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 rounded-full">
                            Self: {comp.selfRating.toFixed(1)}
                          </span>
                        )}
                        {comp.description && (
                          <p className="text-[11px] text-slate-500 mt-0.5">{comp.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-indigo-700">{comp.rating.toFixed(1)}</span>
                        <input
                          type="range"
                          min="1"
                          max="5"
                          step="0.5"
                          value={comp.rating}
                          onChange={(e) =>
                            handleCompetencyRatingChange(comp.competencyId, parseFloat(e.target.value))
                          }
                          className="w-24 h-1.5 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                      </div>
                    </div>
                    <input
                      type="text"
                      value={comp.comment}
                      onChange={(e) =>
                        handleCompetencyCommentChange(comp.competencyId, e.target.value)
                      }
                      placeholder="Manager evaluation feedback on this competency..."
                      className="w-full text-xs border border-slate-300 rounded-md px-2.5 py-1.5 bg-white focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
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
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {loading ? 'Submitting...' : 'Submit Manager Appraisal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
