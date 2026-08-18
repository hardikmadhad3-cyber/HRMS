/**
 * HRMS Attendance Domain Types (Phase 2B)
 * Aligned with HRMS Document 2 (Attendance Management), Document 3 (Data Model), and Document 4 (APIs)
 */

export type PunchType = 'CHECK_IN' | 'CHECK_OUT';

export type PunchSource = 'WEB' | 'MOBILE' | 'ESS' | 'BIOMETRIC' | 'MANUAL' | 'SYSTEM';

export type AttendanceStatus =
  | 'PRESENT'
  | 'ABSENT'
  | 'HALF_DAY'
  | 'HOLIDAY'
  | 'WEEKLY_OFF'
  | 'ON_LEAVE'
  | 'INCOMPLETE'
  | 'MISSING_PUNCH';

export type CalculationStatus = 'CALCULATED' | 'REGULARIZED' | 'FINALIZED';

export type RegularizationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export type AttendanceExceptionType =
  | 'MISSING_OUT'
  | 'MISSING_IN'
  | 'LATE_ARRIVAL'
  | 'EARLY_EXIT'
  | 'LATE_AND_EARLY'
  | 'INSUFFICIENT_HOURS';

/**
 * 1. Raw Immutable Punch Event
 */
export interface AttendancePunch {
  id: string;
  companyId: string;
  employeeId: string;
  punchTime: string; // ISO 8601 UTC
  punchType: PunchType;
  source: PunchSource;
  deviceId?: string;
  latitude?: number;
  longitude?: number;
  locationAddress?: string;
  notes?: string;
  createdAt: string;
  createdBy?: string;
  // Computed display helper
  employeeName?: string;
  employeeCode?: string;
}

/**
 * 2. Deterministic Daily Attendance Record
 */
export interface DailyAttendance {
  id: string;
  companyId: string;
  employeeId: string;
  attendanceDate: string; // YYYY-MM-DD
  shiftId?: string;
  shiftCode?: string;
  shiftName?: string;
  scheduledStart?: string; // HH:MM
  scheduledEnd?: string;   // HH:MM
  isOvernight?: boolean;
  firstCheckIn?: string;   // ISO 8601 UTC
  lastCheckOut?: string;   // ISO 8601 UTC
  grossWorkMinutes: number;
  breakMinutes: number;
  netWorkMinutes: number;
  lateMinutes: number;
  earlyExitMinutes: number;
  status: AttendanceStatus;
  calculationStatus: CalculationStatus;
  isLate: boolean;
  isEarlyExit: boolean;
  isHalfDay: boolean;
  isHoliday: boolean;
  isWeeklyOff: boolean;
  isOnLeave: boolean;
  hasException: boolean;
  exceptionType?: AttendanceExceptionType;
  calculatedOvertimeMinutes?: number;
  approvedOvertimeMinutes?: number;
  overtimeRequestId?: string;
  regularizationId?: string;
  calculationVersion: number;
  calculatedAt: string;
  updatedAt: string;
  // Reconciliation enriched fields
  reconciledLeaveStatus?: string;
  leaveCoverage?: string;
  paidLeaveUnits?: number;
  unpaidLeaveUnits?: number;
  lossOfPayUnits?: number;
  reconciledPayableUnits?: number;
  leaveRequestId?: string;
  leaveTypeId?: string;
  leaveTypeCode?: string;
  leaveCoverageNote?: string;
  reconciliationId?: string;
  reconciledAt?: string;
  holidayName?: string;
  // Employee profile enriched metadata
  employeeCode?: string;
  displayName?: string;
  departmentName?: string;
  designationName?: string;
  branchName?: string;
  avatarUrl?: string;
}

/**
 * 3. Attendance Regularization Request
 */
export interface AttendanceRegularizationRequest {
  id: string;
  companyId: string;
  employeeId: string;
  attendanceDate: string; // YYYY-MM-DD
  requestedCheckIn?: string;  // ISO 8601 UTC
  requestedCheckOut?: string; // ISO 8601 UTC
  reason: string;
  reasonDetails?: string;
  status: RegularizationStatus;
  approverId?: string;
  approverName?: string;
  approverComments?: string;
  actionedAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  // Enriched metadata
  employeeCode?: string;
  displayName?: string;
  employeeName?: string;
  departmentName?: string;
  originalFirstCheckIn?: string;
  originalLastCheckOut?: string;
  originalStatus?: AttendanceStatus;
}

/**
 * DTOs & Request Payloads
 */
export interface PunchDTO {
  punchType: PunchType;
  punchTime?: string; // If not provided, defaults to server now()
  source?: PunchSource;
  latitude?: number;
  longitude?: number;
  locationAddress?: string;
  notes?: string;
}

export interface CheckInDTO {
  punchTime?: string;
  latitude?: number;
  longitude?: number;
  locationAddress?: string;
  notes?: string;
}

export interface CheckOutDTO {
  punchTime?: string;
  latitude?: number;
  longitude?: number;
  locationAddress?: string;
  notes?: string;
}

export interface SubmitRegularizationDTO {
  attendanceDate: string; // YYYY-MM-DD
  requestedCheckIn?: string;  // HH:MM or ISO
  requestedCheckOut?: string; // HH:MM or ISO
  reason: string;
  reasonDetails?: string;
}

export interface ActionRegularizationDTO {
  status: 'APPROVED' | 'REJECTED';
  approverComments?: string;
}

export interface DailyAttendanceFilter {
  date?: string; // YYYY-MM-DD
  startDate?: string;
  endDate?: string;
  employeeId?: string;
  branchId?: string;
  departmentId?: string;
  designationId?: string;
  status?: AttendanceStatus;
  hasException?: boolean;
  exceptionType?: AttendanceExceptionType;
  search?: string;
  page?: number;
  limit?: number;
}

export interface MonthlyAttendanceQuery {
  month: number; // 1 - 12
  year: number;  // e.g. 2026
  departmentId?: string;
  branchId?: string;
  employeeId?: string;
  search?: string;
}

export interface MonthlyAttendanceMatrixItem {
  employeeId: string;
  employeeCode: string;
  displayName: string;
  departmentName?: string;
  designationName?: string;
  avatarUrl?: string;
  days: Record<
    string,
    {
      date: string;
      status: AttendanceStatus;
      abbreviation: 'P' | 'A' | 'HD' | 'WO' | 'H' | 'L' | 'MP' | 'INC';
      netWorkMinutes: number;
      isLate: boolean;
      isEarlyExit: boolean;
      firstCheckIn?: string;
      lastCheckOut?: string;
      shiftCode?: string;
    }
  >;
  totals: {
    presentDays: number;
    absentDays: number;
    halfDays: number;
    weeklyOffDays: number;
    holidays: number;
    leaveDays: number;
    missingPunchDays: number;
    totalWorkMinutes: number;
    totalLateMinutes: number;
  };
}

export interface AttendanceSummaryMetrics {
  totalScheduled: number;
  presentCount: number;
  absentCount: number;
  halfDayCount: number;
  onLeaveCount: number;
  weeklyOffCount: number;
  holidayCount: number;
  lateArrivalCount: number;
  earlyExitCount: number;
  exceptionCount: number;
  attendanceDate: string;
}

export interface EmployeeAttendanceStatus {
  employeeId: string;
  employeeCode: string;
  displayName: string;
  todayDate: string;
  currentShift: {
    id: string;
    code: string;
    name: string;
    startTime: string;
    endTime: string;
    isOvernight: boolean;
    lateEntryGraceMinutes: number;
    earlyExitGraceMinutes: number;
  } | null;
  lastPunch: AttendancePunch | null;
  isCheckedIn: boolean;
  todayPunches: AttendancePunch[];
  todayDailyRecord: DailyAttendance | null;
}
