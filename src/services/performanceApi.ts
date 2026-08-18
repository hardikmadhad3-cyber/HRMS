import { apiClient, ApiResponse } from './apiClient.js';
import {
  PerformanceCycle,
  PerformanceCycleStatus,
  PerformanceGoal,
  PerformanceGoalStatus,
  PerformanceReview,
  PerformanceReviewStatus,
  PerformanceReviewTemplate,
  GoalCategory,
  PerformanceReviewHistory,
  PerformanceDashboardMetrics,
  CreatePerformanceCycleDTO,
  UpdatePerformanceCycleDTO,
  CreatePerformanceTemplateDTO,
  CreatePerformanceGoalDTO,
  UpdatePerformanceGoalDTO,
  SubmitSelfReviewDTO,
  SubmitManagerReviewDTO,
  FinalizeReviewDTO,
} from '../types/performance.js';

export const performanceApi = {
  // Dashboard & Metrics
  getDashboard: (companyId?: string): Promise<ApiResponse<PerformanceDashboardMetrics>> =>
    apiClient.get<PerformanceDashboardMetrics>('/api/performance/dashboard', null, companyId),

  // Review Templates & Categories
  getTemplates: (activeOnly?: boolean, companyId?: string): Promise<ApiResponse<PerformanceReviewTemplate[]>> =>
    apiClient.get<PerformanceReviewTemplate[]>('/api/performance/templates', { activeOnly }, companyId),

  getTemplateById: (id: string, companyId?: string): Promise<ApiResponse<PerformanceReviewTemplate>> =>
    apiClient.get<PerformanceReviewTemplate>(`/api/performance/templates/${id}`, null, companyId),

  createTemplate: (dto: CreatePerformanceTemplateDTO, companyId?: string): Promise<ApiResponse<PerformanceReviewTemplate>> =>
    apiClient.post<PerformanceReviewTemplate>('/api/performance/templates', dto, companyId),

  updateTemplate: (id: string, updates: Partial<PerformanceReviewTemplate>, companyId?: string): Promise<ApiResponse<PerformanceReviewTemplate>> =>
    apiClient.patch<PerformanceReviewTemplate>(`/api/performance/templates/${id}`, updates, companyId),

  getGoalCategories: (companyId?: string): Promise<ApiResponse<GoalCategory[]>> =>
    apiClient.get<GoalCategory[]>('/api/performance/goal-categories', null, companyId),

  createGoalCategory: (dto: { code: string; name: string; description?: string; defaultWeightage?: number }, companyId?: string): Promise<ApiResponse<GoalCategory>> =>
    apiClient.post<GoalCategory>('/api/performance/goal-categories', dto, companyId),

  // Performance Cycles
  getCycles: (status?: PerformanceCycleStatus, companyId?: string): Promise<ApiResponse<PerformanceCycle[]>> =>
    apiClient.get<PerformanceCycle[]>('/api/performance/cycles', { status }, companyId),

  getCycleById: (id: string, companyId?: string): Promise<ApiResponse<PerformanceCycle>> =>
    apiClient.get<PerformanceCycle>(`/api/performance/cycles/${id}`, null, companyId),

  createCycle: (dto: CreatePerformanceCycleDTO, companyId?: string): Promise<ApiResponse<PerformanceCycle>> =>
    apiClient.post<PerformanceCycle>('/api/performance/cycles', dto, companyId),

  updateCycle: (id: string, updates: UpdatePerformanceCycleDTO, companyId?: string): Promise<ApiResponse<PerformanceCycle>> =>
    apiClient.patch<PerformanceCycle>(`/api/performance/cycles/${id}`, updates, companyId),

  changeCycleStatus: (id: string, status: PerformanceCycleStatus, companyId?: string): Promise<ApiResponse<PerformanceCycle>> =>
    apiClient.post<PerformanceCycle>(`/api/performance/cycles/${id}/status`, { status }, companyId),

  initializeCycleReviews: (id: string, companyId?: string): Promise<ApiResponse<{ initializedCount: number; totalActiveEmployees: number }>> =>
    apiClient.post<{ initializedCount: number; totalActiveEmployees: number }>(`/api/performance/cycles/${id}/initialize`, {}, companyId),

  // Goals / KRAs
  getGoals: (
    filter?: { cycleId?: string; employeeId?: string; status?: PerformanceGoalStatus; isManagerGoal?: boolean; category?: string },
    companyId?: string
  ): Promise<ApiResponse<PerformanceGoal[]>> =>
    apiClient.get<PerformanceGoal[]>('/api/performance/goals', filter, companyId),

  getGoalById: (id: string, companyId?: string): Promise<ApiResponse<PerformanceGoal>> =>
    apiClient.get<PerformanceGoal>(`/api/performance/goals/${id}`, null, companyId),

  createGoal: (dto: CreatePerformanceGoalDTO, companyId?: string): Promise<ApiResponse<PerformanceGoal>> =>
    apiClient.post<PerformanceGoal>('/api/performance/goals', dto, companyId),

  updateGoal: (id: string, updates: UpdatePerformanceGoalDTO, companyId?: string): Promise<ApiResponse<PerformanceGoal>> =>
    apiClient.patch<PerformanceGoal>(`/api/performance/goals/${id}`, updates, companyId),

  updateGoalProgress: (id: string, currentValue: number, status?: PerformanceGoalStatus, companyId?: string): Promise<ApiResponse<PerformanceGoal>> =>
    apiClient.patch<PerformanceGoal>(`/api/performance/goals/${id}/progress`, { currentValue, status }, companyId),

  approveGoal: (id: string, companyId?: string): Promise<ApiResponse<PerformanceGoal>> =>
    apiClient.post<PerformanceGoal>(`/api/performance/goals/${id}/approve`, {}, companyId),

  deleteGoal: (id: string, companyId?: string): Promise<ApiResponse<{ success: boolean }>> =>
    apiClient.delete<{ success: boolean }>(`/api/performance/goals/${id}`, companyId),

  // Performance Reviews
  getReviews: (
    filter?: { cycleId?: string; employeeId?: string; reviewerId?: string; status?: PerformanceReviewStatus; isFinalized?: boolean },
    companyId?: string
  ): Promise<ApiResponse<PerformanceReview[]>> =>
    apiClient.get<PerformanceReview[]>('/api/performance/reviews', filter, companyId),

  getReviewById: (id: string, companyId?: string): Promise<ApiResponse<PerformanceReview>> =>
    apiClient.get<PerformanceReview>(`/api/performance/reviews/${id}`, null, companyId),

  submitSelfReview: (id: string, dto: SubmitSelfReviewDTO, companyId?: string): Promise<ApiResponse<PerformanceReview>> =>
    apiClient.post<PerformanceReview>(`/api/performance/reviews/${id}/self-review`, dto, companyId),

  submitManagerReview: (id: string, dto: SubmitManagerReviewDTO, companyId?: string): Promise<ApiResponse<PerformanceReview>> =>
    apiClient.post<PerformanceReview>(`/api/performance/reviews/${id}/manager-review`, dto, companyId),

  finalizeReview: (id: string, dto: FinalizeReviewDTO, companyId?: string): Promise<ApiResponse<PerformanceReview>> =>
    apiClient.post<PerformanceReview>(`/api/performance/reviews/${id}/finalize`, dto, companyId),

  getReviewHistory: (id: string, companyId?: string): Promise<ApiResponse<PerformanceReviewHistory[]>> =>
    apiClient.get<PerformanceReviewHistory[]>(`/api/performance/reviews/${id}/history`, null, companyId),
};
