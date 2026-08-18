import React, { useState, useEffect } from 'react';
import {
  Kanban,
  Filter,
  Search,
  Plus,
  Calendar,
  Award,
  Clock,
  ArrowRight,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Briefcase,
  ChevronRight,
  UserPlus,
} from 'lucide-react';
import {
  Application,
  ApplicationStage,
  ApplicationStatus,
  JobRequisition,
} from '../../../types/recruitment.js';
import { recruitmentApi } from '../../../services/recruitmentApi.js';
import { useNotification } from '../../../context/NotificationContext.js';

interface ApplicationPipelineTabProps {
  filterRequisitionId?: string;
  onScheduleInterview: (application: any) => void;
  onGenerateOffer: (application: any) => void;
  onOpenCreateCandidate: (defaultRequisitionId?: string) => void;
}

export function ApplicationPipelineTab({
  filterRequisitionId,
  onScheduleInterview,
  onGenerateOffer,
  onOpenCreateCandidate,
}: ApplicationPipelineTabProps) {
  const { showToast } = useNotification();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<Application[]>([]);
  const [requisitions, setRequisitions] = useState<JobRequisition[]>([]);
  const [selectedReqId, setSelectedReqId] = useState<string>(filterRequisitionId || 'ALL');

  const STAGES: { stage: ApplicationStage; label: string; color: string }[] = [
    { stage: ApplicationStage.SOURCED, label: 'Sourced / Applied', color: 'slate' },
    { stage: ApplicationStage.SCREENING, label: 'Initial Screening', color: 'blue' },
    { stage: ApplicationStage.INTERVIEW, label: 'Interview Rounds', color: 'purple' },
    { stage: ApplicationStage.OFFER, label: 'Offer Generated', color: 'amber' },
    { stage: ApplicationStage.HIRED, label: 'Hired & Onboarding', color: 'emerald' },
  ];

  useEffect(() => {
    loadPipelineData();
  }, []);

  useEffect(() => {
    if (filterRequisitionId) {
      setSelectedReqId(filterRequisitionId);
    }
  }, [filterRequisitionId]);

  const loadPipelineData = async () => {
    setLoading(true);
    try {
      const [appsRes, reqsRes] = await Promise.all([
        recruitmentApi.getApplications(),
        recruitmentApi.getRequisitions(),
      ]);

      if (appsRes.success && appsRes.data) {
        setApplications(appsRes.data);
      }
      if (reqsRes.success && reqsRes.data) {
        setRequisitions(reqsRes.data);
      }
    } catch (err) {
      console.error('Failed to load application pipeline:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStageAdvance = async (appId: string, nextStage: ApplicationStage, nextStatus: ApplicationStatus) => {
    try {
      const res = await recruitmentApi.updateApplicationStage(appId, nextStage, nextStatus);
      if (res.success) {
        showToast('success', 'Stage Advanced', `Application moved to ${nextStage}`);
        loadPipelineData();
      } else {
        showToast('error', 'Update Failed', res.error || 'Failed to move application stage');
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Error updating stage');
    }
  };

  const handleReject = async (appId: string) => {
    try {
      const res = await recruitmentApi.updateApplicationStage(
        appId,
        ApplicationStage.REJECTED,
        ApplicationStatus.REJECTED,
        'Not aligned with current headcount needs'
      );
      if (res.success) {
        showToast('info', 'Application Archived', 'Candidate marked as rejected');
        loadPipelineData();
      } else {
        showToast('error', 'Failed', res.error || 'Failed to update');
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Error rejecting application');
    }
  };

  const filteredApps = applications.filter((app) => {
    if (selectedReqId === 'ALL') return true;
    return app.requisitionId === selectedReqId;
  });

  return (
    <div className="space-y-5">
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Requisition Filter:
          </label>
          <select
            value={selectedReqId}
            onChange={(e) => setSelectedReqId(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden max-w-sm"
          >
            <option value="ALL">All Active Requisitions ({applications.length} Applicants)</option>
            {requisitions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.requisitionNumber} - {r.title} ({r.departmentName})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => onOpenCreateCandidate(selectedReqId !== 'ALL' ? selectedReqId : undefined)}
          className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 shrink-0"
        >
          <UserPlus className="w-3.5 h-3.5" /> Add Candidate to Stage
        </button>
      </div>

      {/* Kanban Board Columns */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-start overflow-x-auto pb-4">
          {STAGES.map((col) => {
            const stageApps = filteredApps.filter((a) => a.stage === col.stage);

            return (
              <div
                key={col.stage}
                className="bg-slate-100/80 rounded-xl border border-slate-200/80 p-3 min-w-[260px] flex flex-col min-h-[500px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      {col.label}
                    </span>
                  </div>
                  <span className="text-xs font-bold bg-white text-slate-600 px-2 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                    {stageApps.length}
                  </span>
                </div>

                {/* Cards List in this Stage */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[650px] pr-1">
                  {stageApps.length === 0 ? (
                    <div className="h-28 border border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-400 text-xs">
                      No candidates in this stage
                    </div>
                  ) : (
                    stageApps.map((app) => (
                      <div
                        key={app.id}
                        className="bg-white rounded-lg border border-slate-200/90 p-4 shadow-2xs hover:shadow-xs transition-all space-y-3"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div>
                            <h4 className="text-xs font-bold text-slate-900">
                              {app.candidateName || 'Candidate'}
                            </h4>
                            <p className="text-[11px] text-slate-500 font-medium truncate max-w-[160px]">
                              {app.requisitionTitle || 'Position'}
                            </p>
                          </div>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                            {app.applicationNumber}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-500 flex items-center justify-between">
                          <span>Applied: {app.appliedDate}</span>
                          <span className="font-semibold text-slate-700">{app.source}</span>
                        </div>

                        {/* Stage Specific Action Buttons */}
                        <div className="pt-2 border-t border-slate-100 flex flex-col gap-1.5">
                          {col.stage === ApplicationStage.SOURCED && (
                            <button
                              onClick={() => handleStageAdvance(app.id, ApplicationStage.SCREENING, ApplicationStatus.IN_PROGRESS)}
                              className="w-full py-1.5 text-center text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                            >
                              Move to Screening →
                            </button>
                          )}

                          {col.stage === ApplicationStage.SCREENING && (
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => handleStageAdvance(app.id, ApplicationStage.INTERVIEW, ApplicationStatus.SHORTLISTED)}
                                className="flex-1 py-1 text-center text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-md transition-colors"
                              >
                                Shortlist
                              </button>
                              <button
                                onClick={() => handleReject(app.id)}
                                className="px-2 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md transition-colors"
                              >
                                Reject
                              </button>
                            </div>
                          )}

                          {col.stage === ApplicationStage.INTERVIEW && (
                            <div className="space-y-1.5">
                              <button
                                onClick={() => onScheduleInterview(app)}
                                className="w-full py-1.5 text-center text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-md shadow-2xs transition-colors flex items-center justify-center gap-1"
                              >
                                <Calendar className="w-3.5 h-3.5" /> Schedule Round
                              </button>
                              <button
                                onClick={() => onGenerateOffer(app)}
                                className="w-full py-1 text-center text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors flex items-center justify-center gap-1"
                              >
                                <Award className="w-3.5 h-3.5" /> Advance to Offer
                              </button>
                            </div>
                          )}

                          {col.stage === ApplicationStage.OFFER && (
                            <div className="text-center py-1">
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-200 block">
                                {app.offerStatus || 'Offer In Review'}
                              </span>
                            </div>
                          )}

                          {col.stage === ApplicationStage.HIRED && (
                            <div className="text-center py-1">
                              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200 block">
                                ✓ Hired & Onboarding Initiated
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
