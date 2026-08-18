import { apiClient, ApiResponse } from './apiClient.js';
import {
  JobRequisition,
  RequisitionStatus,
  Candidate,
  Application,
  ApplicationStage,
  ApplicationStatus,
  RecruitmentInterview,
  JobOffer,
  OfferStatus,
  CandidateStatusHistory,
  RecruitmentDashboardSummary,
  EmployeeOnboarding,
  OnboardingTaskStatus,
  OnboardingDocStatus,
  OnboardingTemplate,
} from '../types/recruitment.js';

export const recruitmentApi = {
  // Dashboard
  getDashboard: (companyId?: string): Promise<ApiResponse<RecruitmentDashboardSummary>> =>
    apiClient.get<RecruitmentDashboardSummary>('/api/recruitment/dashboard', null, companyId),

  // Requisitions
  getRequisitions: (filter?: any, companyId?: string): Promise<ApiResponse<JobRequisition[]>> =>
    apiClient.get<JobRequisition[]>('/api/recruitment/requisitions', filter, companyId),

  getRequisitionById: (id: string, companyId?: string): Promise<ApiResponse<JobRequisition>> =>
    apiClient.get<JobRequisition>(`/api/recruitment/requisitions/${id}`, null, companyId),

  createRequisition: (data: any, companyId?: string): Promise<ApiResponse<JobRequisition>> =>
    apiClient.post<JobRequisition>('/api/recruitment/requisitions', data, companyId),

  updateRequisitionStatus: (id: string, status: RequisitionStatus, companyId?: string): Promise<ApiResponse<JobRequisition>> =>
    apiClient.patch<JobRequisition>(`/api/recruitment/requisitions/${id}/status`, { status }, companyId),

  // Candidates
  getCandidates: (filter?: any, companyId?: string): Promise<ApiResponse<Candidate[]>> =>
    apiClient.get<Candidate[]>('/api/recruitment/candidates', filter, companyId),

  getCandidateById: (id: string, companyId?: string): Promise<ApiResponse<Candidate>> =>
    apiClient.get<Candidate>(`/api/recruitment/candidates/${id}`, null, companyId),

  createCandidate: (data: any, companyId?: string): Promise<ApiResponse<{ candidate: Candidate; application?: Application }>> =>
    apiClient.post<{ candidate: Candidate; application?: Application }>('/api/recruitment/candidates', data, companyId),

  // Applications & Pipeline
  getApplications: (filter?: any, companyId?: string): Promise<ApiResponse<Application[]>> =>
    apiClient.get<Application[]>('/api/recruitment/applications', filter, companyId),

  getApplicationById: (id: string, companyId?: string): Promise<ApiResponse<Application>> =>
    apiClient.get<Application>(`/api/recruitment/applications/${id}`, null, companyId),

  createApplication: (data: any, companyId?: string): Promise<ApiResponse<Application>> =>
    apiClient.post<Application>('/api/recruitment/applications', data, companyId),

  updateApplicationStage: (
    id: string,
    stage: ApplicationStage,
    status: ApplicationStatus,
    reason?: string,
    companyId?: string
  ): Promise<ApiResponse<Application>> =>
    apiClient.patch<Application>(`/api/recruitment/applications/${id}/stage`, { stage, status, reason }, companyId),

  getApplicationHistory: (id: string, companyId?: string): Promise<ApiResponse<CandidateStatusHistory[]>> =>
    apiClient.get<CandidateStatusHistory[]>(`/api/recruitment/applications/${id}/history`, null, companyId),

  // Interviews & Scorecards
  getInterviews: (filter?: any, companyId?: string): Promise<ApiResponse<RecruitmentInterview[]>> =>
    apiClient.get<RecruitmentInterview[]>('/api/recruitment/interviews', filter, companyId),

  scheduleInterview: (data: any, companyId?: string): Promise<ApiResponse<RecruitmentInterview>> =>
    apiClient.post<RecruitmentInterview>('/api/recruitment/interviews', data, companyId),

  submitInterviewFeedback: (id: string, feedback: any, companyId?: string): Promise<ApiResponse<RecruitmentInterview>> =>
    apiClient.post<RecruitmentInterview>(`/api/recruitment/interviews/${id}/feedback`, feedback, companyId),

  // Offers
  getOffers: (filter?: any, companyId?: string): Promise<ApiResponse<JobOffer[]>> =>
    apiClient.get<JobOffer[]>('/api/recruitment/offers', filter, companyId),

  getOfferById: (id: string, companyId?: string): Promise<ApiResponse<JobOffer>> =>
    apiClient.get<JobOffer>(`/api/recruitment/offers/${id}`, null, companyId),

  createOffer: (data: any, companyId?: string): Promise<ApiResponse<JobOffer>> =>
    apiClient.post<JobOffer>('/api/recruitment/offers', data, companyId),

  updateOfferStatus: (id: string, status: OfferStatus, reason?: string, companyId?: string): Promise<ApiResponse<JobOffer>> =>
    apiClient.patch<JobOffer>(`/api/recruitment/offers/${id}/status`, { status, reason }, companyId),

  // Onboarding
  getOnboardingTemplates: (companyId?: string): Promise<ApiResponse<OnboardingTemplate[]>> =>
    apiClient.get<OnboardingTemplate[]>('/api/onboarding/templates', null, companyId),

  createOnboardingTemplate: (data: any, companyId?: string): Promise<ApiResponse<OnboardingTemplate>> =>
    apiClient.post<OnboardingTemplate>('/api/onboarding/templates', data, companyId),

  getOnboardings: (filter?: any, companyId?: string): Promise<ApiResponse<EmployeeOnboarding[]>> =>
    apiClient.get<EmployeeOnboarding[]>('/api/onboarding', filter, companyId),

  getOnboardingById: (id: string, companyId?: string): Promise<ApiResponse<EmployeeOnboarding>> =>
    apiClient.get<EmployeeOnboarding>(`/api/onboarding/${id}`, null, companyId),

  startOnboarding: (offerId: string, templateId?: string, companyId?: string): Promise<ApiResponse<EmployeeOnboarding>> =>
    apiClient.post<EmployeeOnboarding>('/api/onboarding/start', { offerId, templateId }, companyId),

  updateTaskStatus: (taskId: string, status: OnboardingTaskStatus, notes?: string, companyId?: string): Promise<ApiResponse<any>> =>
    apiClient.patch<any>(`/api/onboarding/tasks/${taskId}/status`, { status, notes }, companyId),

  updateDocumentStatus: (
    docId: string,
    status: OnboardingDocStatus,
    fileUrl?: string,
    rejectionReason?: string,
    companyId?: string
  ): Promise<ApiResponse<any>> =>
    apiClient.patch<any>(`/api/onboarding/documents/${docId}/status`, { status, fileUrl, rejectionReason }, companyId),

  updateJoiningDetails: (onboardingId: string, joiningDetails: any, companyId?: string): Promise<ApiResponse<EmployeeOnboarding>> =>
    apiClient.patch<EmployeeOnboarding>(`/api/onboarding/${onboardingId}/joining-details`, joiningDetails, companyId),

  completeAndHandoffToEmployeeMaster: (onboardingId: string, options: any, companyId?: string): Promise<ApiResponse<any>> =>
    apiClient.post<any>(`/api/onboarding/${onboardingId}/handoff-employee`, options, companyId),
};
