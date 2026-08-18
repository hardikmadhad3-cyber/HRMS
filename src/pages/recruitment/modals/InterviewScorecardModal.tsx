import React, { useState } from 'react';
import { X, Star, ThumbsUp, ThumbsDown, CheckCircle2, Award, AlertCircle } from 'lucide-react';
import { RecruitmentInterview, InterviewRecommendation } from '../../../types/recruitment.js';
import { recruitmentApi } from '../../../services/recruitmentApi.js';
import { useNotification } from '../../../context/NotificationContext.js';

interface InterviewScorecardModalProps {
  isOpen: boolean;
  interview: RecruitmentInterview;
  onClose: () => void;
  onSuccess: () => void;
}

export function InterviewScorecardModal({
  isOpen,
  interview,
  onClose,
  onSuccess,
}: InterviewScorecardModalProps) {
  const { showToast } = useNotification();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    rating: interview.feedbackRating || 4,
    recommendation: interview.feedbackRecommendation || InterviewRecommendation.YES,
    strengths: interview.feedbackStrengths || '',
    weaknesses: interview.feedbackWeaknesses || '',
    notes: interview.feedbackNotes || '',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await recruitmentApi.submitInterviewFeedback(interview.id, {
        rating: Number(formData.rating),
        recommendation: formData.recommendation,
        strengths: formData.strengths.trim() || undefined,
        weaknesses: formData.weaknesses.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      });

      if (res.success) {
        showToast('success', 'Scorecard Submitted', 'Interview evaluation submitted and candidate status updated!');
        onSuccess();
        onClose();
      } else {
        showToast('error', 'Submission Failed', res.error || 'Failed to submit scorecard');
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Error submitting scorecard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
              <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Submit Interview Scorecard</h2>
              <p className="text-xs text-slate-500">
                Candidate: <strong className="text-slate-800">{interview.candidateName || 'Applicant'}</strong> • {interview.roundName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Overall Rating 1-5 Stars */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Overall Candidate Score (1 - 5)
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setFormData({ ...formData, rating: star })}
                  className={`p-2 rounded-lg border transition-all ${
                    formData.rating >= star
                      ? 'bg-amber-50 border-amber-300 text-amber-500 shadow-2xs scale-105'
                      : 'bg-slate-50 border-slate-200 text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <Star className={`w-6 h-6 ${formData.rating >= star ? 'fill-amber-400' : ''}`} />
                </button>
              ))}
              <span className="ml-3 text-sm font-bold text-slate-700">
                {formData.rating} / 5 Rating
              </span>
            </div>
          </div>

          {/* Recommendation */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Hiring Recommendation
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { value: InterviewRecommendation.STRONG_YES, label: 'Strong Hire', color: 'emerald' },
                { value: InterviewRecommendation.YES, label: 'Hire', color: 'blue' },
                { value: InterviewRecommendation.NEUTRAL, label: 'Hold', color: 'slate' },
                { value: InterviewRecommendation.NO, label: 'Do Not Hire', color: 'amber' },
                { value: InterviewRecommendation.STRONG_NO, label: 'Strong Reject', color: 'rose' },
              ].map((rec) => {
                const isSelected = formData.recommendation === rec.value;
                return (
                  <button
                    type="button"
                    key={rec.value}
                    onClick={() => setFormData({ ...formData, recommendation: rec.value })}
                    className={`py-2 px-1 text-center rounded-lg border text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {rec.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Technical Strengths */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Key Strengths & Competencies
            </label>
            <textarea
              rows={3}
              value={formData.strengths}
              onChange={(e) => setFormData({ ...formData, strengths: e.target.value })}
              placeholder="e.g. Strong understanding of distributed databases, clean code modularity, confident communicator..."
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden"
            />
          </div>

          {/* Weaknesses / Growth Areas */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Gaps / Areas for Improvement
            </label>
            <textarea
              rows={3}
              value={formData.weaknesses}
              onChange={(e) => setFormData({ ...formData, weaknesses: e.target.value })}
              placeholder="e.g. Needs more hands-on experience with Kubernetes clustering..."
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden"
            />
          </div>

          {/* General Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              General Evaluation Notes & Feedback
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional feedback for the hiring committee..."
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? 'Submitting...' : 'Submit Evaluation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
