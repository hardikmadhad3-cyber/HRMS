import { apiClient, ApiResponse } from './apiClient.js';
import {
  ExpenseCategory,
  ExpenseClaim,
  ExpenseClaimItem,
  ExpenseClaimHistory,
  ExpenseClaimStatus,
  CreateExpenseClaimDTO,
  UpdateExpenseClaimDTO,
  CreateExpenseClaimItemDTO,
  ExpenseApprovalActionDTO,
  CreateExpenseCategoryDTO,
  UpdateExpenseCategoryDTO,
  ExpenseDashboardMetrics,
} from '../types/expenses.js';

export const expenseApi = {
  // Dashboard Metrics
  getDashboard: (companyId?: string): Promise<ApiResponse<ExpenseDashboardMetrics>> =>
    apiClient.get<ExpenseDashboardMetrics>('/api/expenses/dashboard', null, companyId),

  // Expense Categories
  getCategories: (activeOnly?: boolean, companyId?: string): Promise<ApiResponse<ExpenseCategory[]>> =>
    apiClient.get<ExpenseCategory[]>('/api/expenses/categories', { activeOnly }, companyId),

  createCategory: (dto: CreateExpenseCategoryDTO, companyId?: string): Promise<ApiResponse<ExpenseCategory>> =>
    apiClient.post<ExpenseCategory>('/api/expenses/categories', dto, companyId),

  updateCategory: (id: string, dto: UpdateExpenseCategoryDTO, companyId?: string): Promise<ApiResponse<ExpenseCategory>> =>
    apiClient.put<ExpenseCategory>(`/api/expenses/categories/${id}`, dto, companyId),

  // Expense Claims
  getClaims: (
    filter: { employeeId?: string; status?: ExpenseClaimStatus; scope?: 'my' | 'team' | 'all' } = {},
    companyId?: string
  ): Promise<ApiResponse<ExpenseClaim[]>> =>
    apiClient.get<ExpenseClaim[]>('/api/expenses/claims', filter, companyId),

  getClaimById: (id: string, companyId?: string): Promise<ApiResponse<ExpenseClaim>> =>
    apiClient.get<ExpenseClaim>(`/api/expenses/claims/${id}`, null, companyId),

  createClaim: (dto: CreateExpenseClaimDTO, companyId?: string): Promise<ApiResponse<ExpenseClaim>> =>
    apiClient.post<ExpenseClaim>('/api/expenses/claims', dto, companyId),

  updateClaim: (id: string, dto: UpdateExpenseClaimDTO, companyId?: string): Promise<ApiResponse<ExpenseClaim>> =>
    apiClient.put<ExpenseClaim>(`/api/expenses/claims/${id}`, dto, companyId),

  submitClaim: (id: string, companyId?: string): Promise<ApiResponse<ExpenseClaim>> =>
    apiClient.post<ExpenseClaim>(`/api/expenses/claims/${id}/submit`, {}, companyId),

  // Claim Items
  addItem: (claimId: string, dto: CreateExpenseClaimItemDTO, companyId?: string): Promise<ApiResponse<ExpenseClaimItem>> =>
    apiClient.post<ExpenseClaimItem>(`/api/expenses/claims/${claimId}/items`, dto, companyId),

  removeItem: (claimId: string, itemId: string, companyId?: string): Promise<ApiResponse<{ message: string }>> =>
    apiClient.delete<{ message: string }>(`/api/expenses/claims/${claimId}/items/${itemId}`, companyId),

  // Approval Actions
  processAction: (claimId: string, dto: ExpenseApprovalActionDTO, companyId?: string): Promise<ApiResponse<ExpenseClaim>> =>
    apiClient.post<ExpenseClaim>(`/api/expenses/claims/${claimId}/actions`, dto, companyId),

  // History / Audit
  getHistory: (claimId: string, companyId?: string): Promise<ApiResponse<ExpenseClaimHistory[]>> =>
    apiClient.get<ExpenseClaimHistory[]>(`/api/expenses/claims/${claimId}/history`, null, companyId),
};
