import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Briefcase,
  Users,
  Calendar,
  Award,
  UserCheck,
  TrendingUp,
  Plus,
  Layers,
  Kanban,
  FileCheck,
} from 'lucide-react';
import { RecruitmentDashboardTab } from './tabs/RecruitmentDashboardTab.js';
import { JobRequisitionsTab } from './tabs/JobRequisitionsTab.js';
import { CandidatesTab } from './tabs/CandidatesTab.js';
import { ApplicationPipelineTab } from './tabs/ApplicationPipelineTab.js';
import { InterviewsTab } from './tabs/InterviewsTab.js';
import { JobOffersTab } from './tabs/JobOffersTab.js';
import { OnboardingTab } from './tabs/OnboardingTab.js';

// Modals
import { CreateRequisitionModal } from './modals/CreateRequisitionModal.js';
import { CreateCandidateModal } from './modals/CreateCandidateModal.js';
import { ScheduleInterviewModal } from './modals/ScheduleInterviewModal.js';
import { InterviewScorecardModal } from './modals/InterviewScorecardModal.js';
import { CreateOfferModal } from './modals/CreateOfferModal.js';
import { EmployeeHandoffModal } from './modals/EmployeeHandoffModal.js';

import {
  RecruitmentApplication,
  RecruitmentInterview,
  EmployeeOnboarding,
} from '../../types/recruitment.js';
import { useAuth } from '../../context/AuthContext.js';
import { PermissionKey } from '../../types/auth.js';

export function RecruitmentHubPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'dashboard';
  const { hasPermission } = useAuth();

  // Modals state
  const [isCreateRequisitionOpen, setIsCreateRequisitionOpen] = useState(false);
  const [isCreateCandidateOpen, setIsCreateCandidateOpen] = useState(false);
  const [candidateDefaultReqId, setCandidateDefaultReqId] = useState<string | undefined>(undefined);

  const [selectedAppForInterview, setSelectedAppForInterview] = useState<RecruitmentApplication | null>(null);
  const [selectedAppForOffer, setSelectedAppForOffer] = useState<RecruitmentApplication | null>(null);
  const [selectedInterviewForScorecard, setSelectedInterviewForScorecard] = useState<RecruitmentInterview | null>(null);
  const [selectedOnboardingForHandoff, setSelectedOnboardingForHandoff] = useState<EmployeeOnboarding | null>(null);

  const [filterReqIdInPipeline, setFilterReqIdInPipeline] = useState<string | undefined>(undefined);
  const [selectedOnboardingIdInTab, setSelectedOnboardingIdInTab] = useState<string | undefined>(undefined);

  const handleTabChange = (tabKey: string) => {
    setSearchParams({ tab: tabKey });
  };

  const tabs = [
    {
      id: 'dashboard',
      label: 'Overview & Metrics',
      icon: TrendingUp,
      description: 'Hiring funnel KPIs, stage distribution & interview schedule',
      permission: PermissionKey.RECRUITMENT_VIEW,
    },
    {
      id: 'requisitions',
      label: 'Job Requisitions',
      icon: Briefcase,
      description: 'Open headcount, department budgets & salary bands',
      permission: PermissionKey.RECRUITMENT_VIEW,
    },
    {
      id: 'candidates',
      label: 'Candidate Pool',
      icon: Users,
      description: 'Talent roster, skill tags, CTC & source tracking',
      permission: PermissionKey.RECRUITMENT_VIEW,
    },
    {
      id: 'pipeline',
      label: 'Application Pipeline',
      icon: Kanban,
      description: 'Visual stage Kanban from screening to offer acceptance',
      permission: PermissionKey.RECRUITMENT_VIEW,
    },
    {
      id: 'interviews',
      label: 'Interviews & Scorecards',
      icon: Calendar,
      description: 'Multi-round scheduling, panelists & evaluation rubrics',
      permission: PermissionKey.RECRUITMENT_VIEW,
    },
    {
      id: 'offers',
      label: 'Job Offers',
      icon: Award,
      description: 'CTC breakdown, probation & formal offer letters',
      permission: PermissionKey.RECRUITMENT_VIEW,
    },
    {
      id: 'onboarding',
      label: 'Employee Onboarding',
      icon: UserCheck,
      description: 'Task checklists, document verification & Employee Master handoff',
      permission: PermissionKey.ONBOARDING_MANAGE,
    },
  ];

  return (
    <div className="space-y-6" id="recruitment-hub-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Recruitment & Onboarding Hub
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            End-to-end talent lifecycle: job requisitions, candidate pipeline, multi-panel interview scorecards, offers, and zero-loss employee handoff.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setCandidateDefaultReqId(undefined);
              setIsCreateCandidateOpen(true);
            }}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Add Candidate
          </button>
          <button
            onClick={() => setIsCreateRequisitionOpen(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Post Requisition
          </button>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto pb-px" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 py-3 px-3 border-b-2 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-blue-600 text-blue-600 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Active Tab Content Rendering */}
      <div>
        {currentTab === 'dashboard' && (
          <RecruitmentDashboardTab
            onNavigateTab={handleTabChange}
            onOpenCreateRequisition={() => setIsCreateRequisitionOpen(true)}
            onOpenCreateCandidate={() => {
              setCandidateDefaultReqId(undefined);
              setIsCreateCandidateOpen(true);
            }}
          />
        )}

        {currentTab === 'requisitions' && (
          <JobRequisitionsTab
            onOpenCreate={() => setIsCreateRequisitionOpen(true)}
            onSelectRequisitionForCandidates={(reqId) => {
              setFilterReqIdInPipeline(reqId);
              handleTabChange('pipeline');
            }}
          />
        )}

        {currentTab === 'candidates' && (
          <CandidatesTab
            onOpenCreateCandidate={() => {
              setCandidateDefaultReqId(undefined);
              setIsCreateCandidateOpen(true);
            }}
            onNavigateToPipeline={(candId) => {
              handleTabChange('pipeline');
            }}
          />
        )}

        {currentTab === 'pipeline' && (
          <ApplicationPipelineTab
            filterRequisitionId={filterReqIdInPipeline}
            onScheduleInterview={(app) => setSelectedAppForInterview(app)}
            onGenerateOffer={(app) => setSelectedAppForOffer(app)}
            onOpenCreateCandidate={(defaultReqId) => {
              setCandidateDefaultReqId(defaultReqId);
              setIsCreateCandidateOpen(true);
            }}
          />
        )}

        {currentTab === 'interviews' && (
          <InterviewsTab
            onOpenScorecard={(interview) => setSelectedInterviewForScorecard(interview)}
          />
        )}

        {currentTab === 'offers' && (
          <JobOffersTab
            onNavigateToOnboarding={(onboardingId) => {
              setSelectedOnboardingIdInTab(onboardingId);
              handleTabChange('onboarding');
            }}
          />
        )}

        {currentTab === 'onboarding' && (
          <OnboardingTab
            selectedOnboardingId={selectedOnboardingIdInTab}
            onOpenHandoffModal={(onboarding) => setSelectedOnboardingForHandoff(onboarding)}
          />
        )}
      </div>

      {/* Modal Dialogs */}
      {isCreateRequisitionOpen && (
        <CreateRequisitionModal
          isOpen={isCreateRequisitionOpen}
          onClose={() => setIsCreateRequisitionOpen(false)}
          onSuccess={() => {}}
        />
      )}

      {isCreateCandidateOpen && (
        <CreateCandidateModal
          isOpen={isCreateCandidateOpen}
          defaultRequisitionId={candidateDefaultReqId}
          onClose={() => setIsCreateCandidateOpen(false)}
          onSuccess={() => {}}
        />
      )}

      {selectedAppForInterview && (
        <ScheduleInterviewModal
          isOpen={!!selectedAppForInterview}
          applicationId={selectedAppForInterview.id}
          candidateName={selectedAppForInterview.candidateName}
          requisitionTitle={selectedAppForInterview.requisitionTitle}
          onClose={() => setSelectedAppForInterview(null)}
          onSuccess={() => {
            handleTabChange('interviews');
          }}
        />
      )}

      {selectedInterviewForScorecard && (
        <InterviewScorecardModal
          isOpen={!!selectedInterviewForScorecard}
          interview={selectedInterviewForScorecard}
          onClose={() => setSelectedInterviewForScorecard(null)}
          onSuccess={() => {}}
        />
      )}

      {selectedAppForOffer && (
        <CreateOfferModal
          isOpen={!!selectedAppForOffer}
          applicationId={selectedAppForOffer.id}
          candidateName={selectedAppForOffer.candidateName}
          requisitionTitle={selectedAppForOffer.requisitionTitle}
          onClose={() => setSelectedAppForOffer(null)}
          onSuccess={() => {
            handleTabChange('offers');
          }}
        />
      )}

      {selectedOnboardingForHandoff && (
        <EmployeeHandoffModal
          isOpen={!!selectedOnboardingForHandoff}
          onboarding={selectedOnboardingForHandoff}
          onClose={() => setSelectedOnboardingForHandoff(null)}
          onSuccess={() => {}}
        />
      )}
    </div>
  );
}
