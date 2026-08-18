/**
 * Phase 3C: Leave ↔ Attendance Reconciliation, Authoritative LOP,
 * Period Integration & Payroll-Ready Time & Leave Snapshot Types
 * Aligned with HRMS Documents 2, 3, 4, 5 and 6.
 */

import { LeaveUnit, HalfDayPeriod, LeavePaidType, LeaveCategory } from './leave.js';
import { AttendanceStatus } from './attendance.js';
import { AttendancePeriodSummary, AttendancePeriodStatus } from './period.js';

export type ReconciledCoverageType = 'NONE' | 'PAID' | 'UNPAID' | 'PARTIAL' | 'CONFLICT';

export type ReconciliationConflictType = 
  | 'LEAVE_ATTENDANCE_CONFLICT' 
  | 'OVERLAPPING_HALF_DAY' 
  | 'MISSING_LEDGER_CONSUMPTION' 
  | 'OUTSIDE_POLICY';

export interface LeaveAttendanceReconciliation {
  id: string;
  companyId: string;
  employeeId: string;
  attendanceDate: string; // YYYY-MM-DD
  dailyAttendanceId?: string;
  leaveRequestId?: string;
  leaveTypeId?: string;
  leaveTypeCode?: string;
  leaveTypeName?: string;
  leavePolicyId?: string;
  leaveYearId?: string;
  unit: LeaveUnit;
  halfDayPeriod?: HalfDayPeriod;

  // Reconciled coverage classification
  reconciledCoverage: ReconciledCoverageType;

  // Authoritative calculated time units
  paidLeaveUnits: number;
  unpaidLeaveUnits: number;
  uncoveredAbsenceUnits: number;
  lossOfPayUnits: number;
  payableUnits: number;

  // Conflict detection
  hasConflict: boolean;
  conflictType?: ReconciliationConflictType;
  conflictDetails?: string;

  // Lifecycle & versioning
  status: 'ACTIVE' | 'SUPERSEDED' | 'CANCELLED';
  version: number;

  createdAt: string;
  updatedAt: string;
  createdBy?: string;

  // Enriched presentation metadata
  employeeName?: string;
  employeeCode?: string;
  departmentName?: string;
  shiftCode?: string;
  rawAttendanceStatus?: AttendanceStatus;
}

export interface DateReconciliationExplanation {
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  employeeId: string;
  employeeCode?: string;
  employeeName?: string;

  // Scheduled Shift Context
  shiftId?: string;
  shiftCode?: string;
  shiftName?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  isWeeklyOff: boolean;
  isHoliday: boolean;
  holidayName?: string;

  // Raw Attendance Fact
  firstCheckIn?: string;
  lastCheckOut?: string;
  grossWorkMinutes: number;
  netWorkMinutes: number;
  rawAttendanceStatus: AttendanceStatus;
  isLate: boolean;
  isEarlyExit: boolean;
  isHalfDay: boolean;

  // Approved Leave Context (if applicable)
  hasApprovedLeave: boolean;
  leaveRequestId?: string;
  leaveTypeCode?: string;
  leaveTypeName?: string;
  leaveCategory?: LeaveCategory;
  leavePaidType?: LeavePaidType;
  leaveUnit?: LeaveUnit;
  leaveHalfDayPeriod?: HalfDayPeriod;
  leaveReason?: string;

  // Reconciled Output (Authoritative)
  reconciledCoverage: ReconciledCoverageType;
  paidLeaveUnits: number;
  unpaidLeaveUnits: number;
  uncoveredAbsenceUnits: number;
  lossOfPayUnits: number;
  payableUnits: number;
  approvedOvertimeMinutes: number;

  // Conflict & Exceptions
  hasConflict: boolean;
  conflictType?: ReconciliationConflictType;
  conflictDetails?: string;
  reconciliationNote: string;
}

export interface TimeLeavePeriodSnapshot {
  id: string;
  companyId: string;
  periodId: string;
  version: number;
  status: AttendancePeriodStatus;
  finalizedAt: string;
  finalizedBy: string;
  finalizedByName?: string;
  reconciledBy?: string;
  reconciliationVersion: number;
  summariesCount: number;
  summaries: AttendancePeriodSummary[];
  createdAt: string;
}

export interface PeriodReconciliationReport {
  periodId: string;
  companyId: string;
  totalEmployees: number;
  reconciledCount: number;
  conflictCount: number;
  totalPaidLeaveDays: number;
  totalUnpaidLeaveDays: number;
  totalLossOfPayDays: number;
  totalPayableDays: number;
  conflicts: Array<{
    id: string;
    employeeId: string;
    employeeCode?: string;
    employeeName?: string;
    date: string;
    type: ReconciliationConflictType;
    details: string;
  }>;
  summaries: AttendancePeriodSummary[];
}
