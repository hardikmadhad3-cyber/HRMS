import { apiClient, ApiResponse } from './apiClient.js';
import {
  LeaveYear,
  LeaveType,
  LeavePolicy,
  EmployeeLeavePolicyAssignment,
  LeavePolicyEvaluationResult,
} from '../types/leave.js';

export interface CreateLeaveTypePayload {
  code: string;
  name: string;
  description?: string;
  category: LeaveType['category'];
  paidType: LeaveType['paidType'];
  unit: LeaveType['unit'];
  color?: string;
  requiresReason?: boolean;
  requiresAttachment?: boolean;
  attachmentThresholdDays?: number;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface CreateLeavePolicyPayload {
  code: string;
  name: string;
  description?: string;
  priority?: number;
  isDefault?: boolean;
  status?: 'ACTIVE' | 'INACTIVE';
  rules: Array<any>;
  eligibility?: {
    employmentTypes?: string[];
    departmentIds?: string[];
    designationIds?: string[];
    branchIds?: string[];
    workLocationIds?: string[];
    minServiceDays?: number;
  };
}

export interface AssignLeavePolicyPayload {
  employeeId: string;
  leavePolicyId: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  assignmentReason?: string;
}

export const leaveApi = {
  // Leave Years
  getYears: async (companyId?: string): Promise<ApiResponse<LeaveYear[]>> => {
    return apiClient.get('/api/v1/leave/years', undefined, companyId);
  },

  createYear: async (payload: Partial<LeaveYear>, companyId?: string): Promise<ApiResponse<LeaveYear>> => {
    return apiClient.post('/api/v1/leave/years', payload, companyId);
  },

  updateYear: async (id: string, payload: Partial<LeaveYear>, companyId?: string): Promise<ApiResponse<LeaveYear>> => {
    return apiClient.put(`/api/v1/leave/years/${id}`, payload, companyId);
  },

  // Leave Types
  getTypes: async (params?: { status?: string; category?: string; search?: string }, companyId?: string): Promise<ApiResponse<LeaveType[]>> => {
    return apiClient.get('/api/v1/leave/types', params, companyId);
  },

  getTypeById: async (id: string, companyId?: string): Promise<ApiResponse<LeaveType>> => {
    return apiClient.get(`/api/v1/leave/types/${id}`, undefined, companyId);
  },

  createType: async (payload: CreateLeaveTypePayload, companyId?: string): Promise<ApiResponse<LeaveType>> => {
    return apiClient.post('/api/v1/leave/types', payload, companyId);
  },

  updateType: async (id: string, payload: Partial<CreateLeaveTypePayload>, companyId?: string): Promise<ApiResponse<LeaveType>> => {
    return apiClient.put(`/api/v1/leave/types/${id}`, payload, companyId);
  },

  setTypeStatus: async (id: string, status: 'ACTIVE' | 'INACTIVE', companyId?: string): Promise<ApiResponse<LeaveType>> => {
    return apiClient.patch(`/api/v1/leave/types/${id}/status`, { status }, companyId);
  },

  // Leave Policies
  getPolicies: async (params?: { status?: string; search?: string }, companyId?: string): Promise<ApiResponse<LeavePolicy[]>> => {
    return apiClient.get('/api/v1/leave/policies', params, companyId);
  },

  getPolicyById: async (id: string, companyId?: string): Promise<ApiResponse<LeavePolicy>> => {
    return apiClient.get(`/api/v1/leave/policies/${id}`, undefined, companyId);
  },

  createPolicy: async (payload: CreateLeavePolicyPayload, companyId?: string): Promise<ApiResponse<LeavePolicy>> => {
    return apiClient.post('/api/v1/leave/policies', payload, companyId);
  },

  updatePolicy: async (id: string, payload: Partial<CreateLeavePolicyPayload>, companyId?: string): Promise<ApiResponse<LeavePolicy>> => {
    return apiClient.put(`/api/v1/leave/policies/${id}`, payload, companyId);
  },

  setPolicyStatus: async (id: string, status: 'ACTIVE' | 'INACTIVE', companyId?: string): Promise<ApiResponse<LeavePolicy>> => {
    return apiClient.patch(`/api/v1/leave/policies/${id}/status`, { status }, companyId);
  },

  // Employee Policy Assignments & History
  getEmployeePolicyHistory: async (
    employeeId: string,
    companyId?: string
  ): Promise<ApiResponse<{
    currentPolicy: EmployeeLeavePolicyAssignment | null;
    futurePolicy: EmployeeLeavePolicyAssignment | null;
    history: EmployeeLeavePolicyAssignment[];
  }>> => {
    return apiClient.get(`/api/v1/leave/assignments/employee/${employeeId}`, undefined, companyId);
  },

  assignPolicy: async (payload: AssignLeavePolicyPayload, companyId?: string): Promise<ApiResponse<EmployeeLeavePolicyAssignment>> => {
    return apiClient.post('/api/v1/leave/assignments', payload, companyId);
  },

  cancelAssignment: async (id: string, companyId?: string): Promise<ApiResponse<EmployeeLeavePolicyAssignment>> => {
    return apiClient.put(`/api/v1/leave/assignments/${id}/cancel`, undefined, companyId);
  },

  // Policy Preview & Evaluation
  previewPolicy: async (
    employeeId: string,
    asOfDate?: string,
    leaveTypeId?: string,
    companyId?: string
  ): Promise<ApiResponse<LeavePolicyEvaluationResult>> => {
    return apiClient.get('/api/v1/leave/policy-preview', { employeeId, asOfDate, leaveTypeId }, companyId);
  },

  // =========================================================================
  // PHASE 3B: BALANCES, LEDGER, ACCRUALS, REQUESTS & CALENDAR
  // =========================================================================

  // Leave Balances
  getMyBalances: async (leaveYearId?: string, companyId?: string): Promise<ApiResponse<import('../types/leave.js').EmployeeLeaveBalance[]>> => {
    return apiClient.get('/api/v1/leave/balances/me', { leaveYearId }, companyId);
  },

  getEmployeeBalances: async (employeeId: string, leaveYearId?: string, companyId?: string): Promise<ApiResponse<import('../types/leave.js').EmployeeLeaveBalance[]>> => {
    return apiClient.get(`/api/v1/leave/balances/employee/${employeeId}`, { leaveYearId }, companyId);
  },

  postOpeningBalance: async (payload: import('../types/leave.js').PostOpeningBalanceDTO, companyId?: string): Promise<ApiResponse<{ ledgerEntry: import('../types/leave.js').LeaveLedgerEntry; balance: import('../types/leave.js').EmployeeLeaveBalance }>> => {
    return apiClient.post('/api/v1/leave/balances/opening', payload, companyId);
  },

  postManualAdjustment: async (payload: import('../types/leave.js').PostManualAdjustmentDTO, companyId?: string): Promise<ApiResponse<{ ledgerEntry: import('../types/leave.js').LeaveLedgerEntry; balance: import('../types/leave.js').EmployeeLeaveBalance }>> => {
    return apiClient.post('/api/v1/leave/balances/adjust', payload, companyId);
  },

  rebuildBalance: async (payload: { employeeId: string; leaveTypeId: string; leaveYearId: string }, companyId?: string): Promise<ApiResponse<import('../types/leave.js').EmployeeLeaveBalance>> => {
    return apiClient.post('/api/v1/leave/balances/rebuild', payload, companyId);
  },

  // Leave Ledger
  getLedger: async (params?: Record<string, any>, companyId?: string): Promise<ApiResponse<import('../types/leave.js').LeaveLedgerEntry[]>> => {
    return apiClient.get('/api/v1/leave/ledger', params, companyId);
  },

  // Accruals
  runAccrual: async (payload: import('../types/leave.js').PostAccrualRunDTO, companyId?: string): Promise<ApiResponse<any>> => {
    return apiClient.post('/api/v1/leave/accruals/run', payload, companyId);
  },

  getAccrualLogs: async (params?: { accrualPeriod?: string }, companyId?: string): Promise<ApiResponse<import('../types/leave.js').LeaveAccrualLog[]>> => {
    return apiClient.get('/api/v1/leave/accruals/logs', params, companyId);
  },

  // Leave Duration & Breakdown Calculation
  calculateLeave: async (payload: { employeeId?: string; leaveTypeId: string; fromDate: string; toDate: string; unit?: string; halfDayPeriod?: string }, companyId?: string): Promise<ApiResponse<import('../types/leave.js').LeaveCalculationResult>> => {
    return apiClient.post('/api/v1/leave/calculate', payload, companyId);
  },

  // Leave Requests
  getRequests: async (params?: { employeeId?: string; leaveTypeId?: string; leaveYearId?: string; status?: string; fromDate?: string; toDate?: string; search?: string; scope?: 'me' | 'team' | 'company' }, companyId?: string): Promise<ApiResponse<import('../types/leave.js').LeaveRequest[]>> => {
    return apiClient.get('/api/v1/leave/requests', params, companyId);
  },

  getRequestById: async (id: string, companyId?: string): Promise<ApiResponse<import('../types/leave.js').LeaveRequest>> => {
    return apiClient.get(`/api/v1/leave/requests/${id}`, undefined, companyId);
  },

  createRequest: async (payload: import('../types/leave.js').CreateLeaveRequestDTO, companyId?: string): Promise<ApiResponse<import('../types/leave.js').LeaveRequest>> => {
    return apiClient.post('/api/v1/leave/requests', payload, companyId);
  },

  actionRequest: async (id: string, payload: import('../types/leave.js').ActionLeaveRequestDTO, companyId?: string): Promise<ApiResponse<import('../types/leave.js').LeaveRequest>> => {
    return apiClient.post(`/api/v1/leave/requests/${id}/action`, payload, companyId);
  },

  cancelRequest: async (id: string, payload: import('../types/leave.js').CancelLeaveRequestDTO, companyId?: string): Promise<ApiResponse<import('../types/leave.js').LeaveRequest>> => {
    return apiClient.post(`/api/v1/leave/requests/${id}/cancel`, payload, companyId);
  },

  // Team Calendar
  getTeamCalendar: async (params?: { startDate?: string; endDate?: string; departmentId?: string }, companyId?: string): Promise<ApiResponse<import('../types/leave.js').LeaveCalendarEvent[]>> => {
    return apiClient.get('/api/v1/leave/calendar', params, companyId);
  },
};
