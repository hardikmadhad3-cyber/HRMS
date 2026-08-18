import { apiClient, ApiResponse } from './apiClient.js';
import {
  DailyAttendance,
  DailyAttendanceFilter,
  MonthlyAttendanceQuery,
  MonthlyAttendanceMatrixItem,
  AttendanceSummaryMetrics,
  EmployeeAttendanceStatus,
  AttendanceRegularizationRequest,
  CheckInDTO,
  CheckOutDTO,
  SubmitRegularizationDTO,
  ActionRegularizationDTO,
} from '../types/attendance.js';

export const attendanceApi = {
  // Check-In
  checkIn: async (payload: CheckInDTO, companyId?: string): Promise<ApiResponse<{ punch: any; dailyAttendance: DailyAttendance }>> => {
    return apiClient.post('/api/v1/attendance/check-in', payload, companyId);
  },

  // Check-Out
  checkOut: async (payload: CheckOutDTO, companyId?: string): Promise<ApiResponse<{ punch: any; dailyAttendance: DailyAttendance }>> => {
    return apiClient.post('/api/v1/attendance/check-out', payload, companyId);
  },

  // My Today's Status
  getMyStatus: async (companyId?: string): Promise<ApiResponse<EmployeeAttendanceStatus>> => {
    return apiClient.get('/api/v1/attendance/me/status', undefined, companyId);
  },

  // My History
  getMyHistory: async (params?: { startDate?: string; endDate?: string; page?: number; limit?: number }, companyId?: string): Promise<ApiResponse<{ items: DailyAttendance[]; total: number }>> => {
    return apiClient.get('/api/v1/attendance/me/history', params, companyId);
  },

  // Daily Attendance List
  getDailyAttendance: async (
    filter?: DailyAttendanceFilter,
    companyId?: string
  ): Promise<ApiResponse<{ items: DailyAttendance[]; total: number; summary: AttendanceSummaryMetrics }>> => {
    return apiClient.get('/api/v1/attendance/daily', filter, companyId);
  },

  // Employee Specific Daily Attendance
  getEmployeeDaily: async (
    employeeId: string,
    params?: { startDate?: string; endDate?: string },
    companyId?: string
  ): Promise<ApiResponse<{ items: DailyAttendance[]; total: number }>> => {
    return apiClient.get(`/api/v1/attendance/employees/${employeeId}/daily`, params, companyId);
  },

  // Monthly Matrix
  getMonthlyMatrix: async (
    query: MonthlyAttendanceQuery,
    companyId?: string
  ): Promise<ApiResponse<{ month: number; year: number; daysInMonth: number; matrix: MonthlyAttendanceMatrixItem[] }>> => {
    return apiClient.get('/api/v1/attendance/monthly', query, companyId);
  },

  // Recalculate Attendance
  recalculateAttendance: async (
    payload: { employeeId?: string; date?: string; startDate?: string; endDate?: string },
    companyId?: string
  ): Promise<ApiResponse<{ success: boolean; recalculatedCount: number; message: string }>> => {
    return apiClient.post('/api/v1/attendance/recalculate', payload, companyId);
  },

  // List Regularizations
  getRegularizations: async (
    filter?: { employeeId?: string; status?: string; startDate?: string; endDate?: string },
    companyId?: string
  ): Promise<ApiResponse<AttendanceRegularizationRequest[]>> => {
    return apiClient.get('/api/v1/attendance/regularizations', filter, companyId);
  },

  // Submit Regularization
  submitRegularization: async (
    payload: SubmitRegularizationDTO,
    companyId?: string
  ): Promise<ApiResponse<AttendanceRegularizationRequest>> => {
    return apiClient.post('/api/v1/attendance/regularizations', payload, companyId);
  },

  // Action Regularization (Approve / Reject)
  actionRegularization: async (
    id: string,
    payload: ActionRegularizationDTO,
    companyId?: string
  ): Promise<ApiResponse<AttendanceRegularizationRequest>> => {
    return apiClient.patch(`/api/v1/attendance/regularizations/${id}/action`, payload, companyId);
  },
};
