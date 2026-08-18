import { apiClient, ApiResponse } from './apiClient.js';
import {
  OffboardingRequest,
  OffboardingClearanceItem,
  ExitInterview,
  OffboardingHistory,
  OffboardingStatus,
  InitiateResignationDTO,
  InitiateTerminationDTO,
  ApproveOffboardingDTO,
  RejectOffboardingDTO,
  UpdateClearanceItemDTO,
  SaveExitInterviewDTO,
  CompleteOffboardingDTO,
  OffboardingDashboardMetrics,
} from '../types/offboarding.js';

export const offboardingApi = {
  // Dashboard Metrics
  getDashboard: (companyId?: string): Promise<ApiResponse<OffboardingDashboardMetrics>> =>
    apiClient.get<OffboardingDashboardMetrics>('/api/offboarding/dashboard', null, companyId),

  // Requests
  getRequests: (
    filter: { employeeId?: string; status?: OffboardingStatus; scope?: 'my' | 'all' } = {},
    companyId?: string
  ): Promise<ApiResponse<OffboardingRequest[]>> =>
    apiClient.get<OffboardingRequest[]>('/api/offboarding/requests', filter, companyId),

  getRequestById: (id: string, companyId?: string): Promise<ApiResponse<OffboardingRequest>> =>
    apiClient.get<OffboardingRequest>(`/api/offboarding/requests/${id}`, null, companyId),

  // Initiation
  initiateResignation: (dto: InitiateResignationDTO, companyId?: string): Promise<ApiResponse<OffboardingRequest>> =>
    apiClient.post<OffboardingRequest>('/api/offboarding/resignation', dto, companyId),

  initiateTermination: (dto: InitiateTerminationDTO, companyId?: string): Promise<ApiResponse<OffboardingRequest>> =>
    apiClient.post<OffboardingRequest>('/api/offboarding/termination', dto, companyId),

  // Approvals
  approveRequest: (id: string, dto: ApproveOffboardingDTO, companyId?: string): Promise<ApiResponse<OffboardingRequest>> =>
    apiClient.post<OffboardingRequest>(`/api/offboarding/requests/${id}/approve`, dto, companyId),

  rejectRequest: (id: string, dto: RejectOffboardingDTO, companyId?: string): Promise<ApiResponse<OffboardingRequest>> =>
    apiClient.post<OffboardingRequest>(`/api/offboarding/requests/${id}/reject`, dto, companyId),

  // Clearance Items
  updateClearanceItem: (
    itemId: string,
    dto: UpdateClearanceItemDTO,
    companyId?: string
  ): Promise<ApiResponse<OffboardingClearanceItem>> =>
    apiClient.put<OffboardingClearanceItem>(`/api/offboarding/clearance-items/${itemId}`, dto, companyId),

  // Exit Interview
  saveExitInterview: (
    offboardingId: string,
    dto: SaveExitInterviewDTO,
    companyId?: string
  ): Promise<ApiResponse<ExitInterview>> =>
    apiClient.post<ExitInterview>(`/api/offboarding/requests/${offboardingId}/exit-interview`, dto, companyId),

  // Final Completion
  completeOffboarding: (
    id: string,
    dto: CompleteOffboardingDTO,
    companyId?: string
  ): Promise<ApiResponse<OffboardingRequest>> =>
    apiClient.post<OffboardingRequest>(`/api/offboarding/requests/${id}/complete`, dto, companyId),

  // History / Audit
  getHistory: (id: string, companyId?: string): Promise<ApiResponse<OffboardingHistory[]>> =>
    apiClient.get<OffboardingHistory[]>(`/api/offboarding/requests/${id}/history`, null, companyId),
};
