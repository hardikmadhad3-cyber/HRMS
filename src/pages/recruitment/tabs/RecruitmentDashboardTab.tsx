import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Users,
  Calendar,
  Award,
  UserCheck,
  TrendingUp,
  Clock,
  CheckCircle2,
  ArrowRight,
  Plus,
  Layers,
  Sparkles,
} from 'lucide-react';
import { RecruitmentDashboardSummary } from '../../../types/recruitment.js';
import { recruitmentApi } from '../../../services/recruitmentApi.js';

interface RecruitmentDashboardTabProps {
  onNavigateTab: (tabKey: string) => void;
  onOpenCreateRequisition: () => void;
  onOpenCreateCandidate: () => void;
}

export function RecruitmentDashboardTab({
  onNavigateTab,
  onOpenCreateRequisition,
  onOpenCreateCandidate,
}: RecruitmentDashboardTabProps) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<RecruitmentDashboardSummary | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await recruitmentApi.getDashboard();
      if (res.success && res.data) {
        setSummary(res.data);
      }
    } catch (err) {
      console.error('Failed to load recruitment dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const kpis = [
    {
      label: 'Active Requisitions',
      value: summary?.activeRequisitionsCount || 0,
      subtext: `${summary?.totalOpeningsCount || 0} Total Headcount Openings`,
      icon: Briefcase,
      color: 'blue',
      tab: 'requisitions',
    },
    {
      label: 'Candidate Pool',
      value: summary?.totalCandidatesCount || 0,
      subtext: `${summary?.activeApplicationsCount || 0} Active In-Flight Applications`,
      icon: Users,
      color: 'emerald',
      tab: 'candidates',
    },
    {
      label: 'Interviews This Week',
      value: summary?.interviewsThisWeekCount || 0,
      subtext: 'Panel Evaluations & Technical Rounds',
      icon: Calendar,
      color: 'purple',
      tab: 'interviews',
    },
    {
      label: 'Pending Offers',
      value: summary?.pendingOffersCount || 0,
      subtext: `${summary?.hiredThisMonthCount || 0} Hired This Month`,
      icon: Award,
      color: 'amber',
      tab: 'offers',
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              onClick={() => onNavigateTab(kpi.tab)}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">{kpi.label}</span>
                <div
                  className={`p-2 rounded-lg ${
                    kpi.color === 'blue'
                      ? 'bg-blue-50 text-blue-600'
                      : kpi.color === 'emerald'
                      ? 'bg-emerald-50 text-emerald-600'
                      : kpi.color === 'purple'
                      ? 'bg-purple-50 text-purple-600'
                      : 'bg-amber-50 text-amber-600'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold tracking-tight text-slate-900">{kpi.value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{kpi.subtext}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stage Breakdown Funnel & Action Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recruitment Pipeline Stage Funnel */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Application Pipeline Funnel</h3>
              <p className="text-xs text-slate-500">Live candidate count distributed across active hiring stages</p>
            </div>
            <button
              onClick={() => onNavigateTab('pipeline')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View Pipeline <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-2">
            {summary?.stageDistribution?.map((stage) => (
              <div
                key={stage.stage}
                onClick={() => onNavigateTab('pipeline')}
                className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-center cursor-pointer hover:bg-blue-50/50 hover:border-blue-200 transition-all"
              >
                <div className="text-lg font-bold text-slate-800">{stage.count}</div>
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mt-1 truncate">
                  {stage.stage}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Info Banner */}
          <div className="mt-6 p-4 bg-blue-50/60 border border-blue-200/80 rounded-xl flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900">
              <span className="font-bold">Zero-Loss Employee Onboarding Integration:</span> When candidates accept formal offers, you can seamlessly initiate onboarding checklists with IT/HR tasks and 1-click promotion into the Employee Master directory.
            </div>
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recruiting Quick Actions</h3>
            <p className="text-xs text-slate-500 mt-0.5">Common hiring and applicant management tasks</p>

            <div className="mt-4 space-y-2.5">
              <button
                onClick={onOpenCreateRequisition}
                className="w-full p-3 bg-slate-50 hover:bg-blue-50/70 border border-slate-200 hover:border-blue-300 rounded-lg text-left transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-blue-100 text-blue-700 rounded-md">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 group-hover:text-blue-700">
                      Post New Requisition
                    </div>
                    <div className="text-[11px] text-slate-500">Define openings, budget, and qualifications</div>
                  </div>
                </div>
                <Plus className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
              </button>

              <button
                onClick={onOpenCreateCandidate}
                className="w-full p-3 bg-slate-50 hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-300 rounded-lg text-left transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-md">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-700">
                      Add Candidate to Pool
                    </div>
                    <div className="text-[11px] text-slate-500">Add resume profile and assign to requisition</div>
                  </div>
                </div>
                <Plus className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
              </button>

              <button
                onClick={() => onNavigateTab('onboarding')}
                className="w-full p-3 bg-slate-50 hover:bg-purple-50/70 border border-slate-200 hover:border-purple-300 rounded-lg text-left transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-purple-100 text-purple-700 rounded-md">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 group-hover:text-purple-700">
                      Manage Onboarding Checklists
                    </div>
                    <div className="text-[11px] text-slate-500">{summary?.activeOnboardingsCount || 0} active hires in onboarding</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600" />
              </button>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <span className="text-[11px] text-slate-400">All actions audited and tenant-isolated</span>
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Applications & Upcoming Interviews */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Applications */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" /> Recent Applications
            </h3>
            <button
              onClick={() => onNavigateTab('pipeline')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              View All
            </button>
          </div>

          <div className="space-y-2.5">
            {summary?.recentApplications && summary.recentApplications.length > 0 ? (
              summary.recentApplications.map((app) => (
                <div
                  key={app.id}
                  onClick={() => onNavigateTab('pipeline')}
                  className="p-3 bg-slate-50 hover:bg-slate-100/70 border border-slate-200/80 rounded-lg flex items-center justify-between gap-3 cursor-pointer transition-colors"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900">{app.candidateName}</div>
                    <div className="text-[11px] text-slate-500">
                      Applied for: <span className="font-semibold text-slate-700">{app.requisitionTitle}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      {app.stage}
                    </span>
                    <div className="text-[10px] text-slate-400 mt-0.5">{app.appliedDate}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-xs text-slate-400">No recent applications found.</div>
            )}
          </div>
        </div>

        {/* Upcoming Interviews */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-600" /> Scheduled Interviews
            </h3>
            <button
              onClick={() => onNavigateTab('interviews')}
              className="text-xs font-semibold text-purple-600 hover:text-purple-700"
            >
              View Calendar
            </button>
          </div>

          <div className="space-y-2.5">
            {summary?.upcomingInterviews && summary.upcomingInterviews.length > 0 ? (
              summary.upcomingInterviews.map((interview) => (
                <div
                  key={interview.id}
                  onClick={() => onNavigateTab('interviews')}
                  className="p-3 bg-slate-50 hover:bg-slate-100/70 border border-slate-200/80 rounded-lg flex items-center justify-between gap-3 cursor-pointer transition-colors"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900">{interview.candidateName}</div>
                    <div className="text-[11px] text-slate-500">
                      {interview.roundName} ({interview.interviewType})
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                      {new Date(interview.scheduledStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(interview.scheduledStartTime).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-xs text-slate-400">No upcoming interviews scheduled.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
