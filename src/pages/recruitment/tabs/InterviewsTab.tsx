import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  Star,
  Users,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Search,
  Filter,
} from 'lucide-react';
import {
  RecruitmentInterview,
  InterviewStatus,
  InterviewRecommendation,
} from '../../../types/recruitment.js';
import { recruitmentApi } from '../../../services/recruitmentApi.js';
import { useNotification } from '../../../context/NotificationContext.js';

interface InterviewsTabProps {
  onOpenScorecard: (interview: RecruitmentInterview) => void;
}

export function InterviewsTab({ onOpenScorecard }: InterviewsTabProps) {
  const { showToast } = useNotification();
  const [loading, setLoading] = useState(true);
  const [interviews, setInterviews] = useState<RecruitmentInterview[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    loadInterviews();
  }, []);

  const loadInterviews = async () => {
    setLoading(true);
    try {
      const res = await recruitmentApi.getInterviews();
      if (res.success && res.data) {
        setInterviews(res.data);
      }
    } catch (err) {
      console.error('Failed to load interviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredInterviews = interviews.filter((i) => {
    return statusFilter === 'ALL' || i.status === statusFilter;
  });

  return (
    <div className="space-y-5">
      {/* Top Filter Bar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Filter Status:
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-purple-500 outline-hidden"
          >
            <option value="ALL">All Interviews ({interviews.length})</option>
            <option value={InterviewStatus.SCHEDULED}>Scheduled</option>
            <option value={InterviewStatus.COMPLETED}>Completed</option>
            <option value={InterviewStatus.CANCELLED}>Cancelled</option>
          </select>
        </div>
      </div>

      {/* Interviews Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      ) : filteredInterviews.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No Scheduled Interviews</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Schedule panel interviews directly from the Candidate Pipeline when advancing an applicant.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredInterviews.map((interview) => {
            const startDate = new Date(interview.scheduledStartTime);
            const endDate = new Date(interview.scheduledEndTime);

            return (
              <div
                key={interview.id}
                className="bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between overflow-hidden"
              >
                <div className="p-5 space-y-3">
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                        Round {interview.roundNumber}: {interview.roundName}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-1">
                        {interview.candidateName || 'Candidate'}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">{interview.requisitionTitle || 'Role'}</p>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        interview.status === InterviewStatus.COMPLETED
                          ? 'bg-emerald-100 text-emerald-800'
                          : interview.status === InterviewStatus.SCHEDULED
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {interview.status}
                    </span>
                  </div>

                  {/* Date & Time Info */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-800">
                        {startDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span>
                        ({startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                      </span>
                    </div>

                    {interview.meetingLink && (
                      <div className="flex items-center gap-2 text-blue-600 font-medium truncate">
                        <Video className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <a
                          href={interview.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline truncate"
                        >
                          {interview.meetingLink}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Feedback Summary If Submitted */}
                  {interview.feedbackSubmitted ? (
                    <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-lg space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-900 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Scorecard Submitted ({interview.feedbackRating} / 5 Stars)
                        </span>
                        <span className="text-[10px] font-bold text-emerald-800 uppercase px-1.5 py-0.5 rounded-md bg-emerald-100">
                          {interview.feedbackRecommendation}
                        </span>
                      </div>
                      {interview.feedbackStrengths && (
                        <p className="text-[11px] text-emerald-800 line-clamp-1">
                          <strong>Strengths:</strong> {interview.feedbackStrengths}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic">
                      Panel evaluation scorecard pending submission.
                    </div>
                  )}
                </div>

                {/* Scorecard Action Button */}
                <div className="px-5 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    {interview.interviewerNames?.join(', ') || 'Assigned Interviewers'}
                  </span>
                  <button
                    onClick={() => onOpenScorecard(interview)}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <Star className="w-3.5 h-3.5 fill-white" />
                    {interview.feedbackSubmitted ? 'Update Scorecard' : 'Submit Scorecard'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
