/**
 * HRMS Attendance Period & Finalization Types (Phase 2C)
 * Aligned with HRMS Document 2 (Attendance Finalization), Document 3 (Data Model), and Document 4 (APIs)
 */

export type AttendancePeriodStatus = 'OPEN' | 'REVIEW' | 'FINALIZED' | 'LOCKED';
export type AttendancePeriodSummaryStatus = 'DRAFT' | 'FINALIZED';

/**
 * 1. Attendance Period Master
 */
export interface AttendancePeriod {
  id: string;
  companyId: string;
  code: string;        // e.g. "AUG-2026"
  name: string;        // e.g. "August 2026 Attendance Period"
  year: number;        // 2026
  month: number;       // 1 - 12 (8)
  startDate: string;   // YYYY-MM-DD ("2026-08-01")
  endDate: string;     // YYYY-MM-DD ("2026-08-31")
  status: AttendancePeriodStatus;
  isLocked?: boolean;
  finalizedAt?: string;
  finalizedBy?: string;
  finalizedByName?: string;
  reopenedAt?: string;
  reopenedBy?: string;
  reopenedByName?: string;
  reopenReason?: string;
  lockVersion: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

/**
 * 2. Attendance Period Summary (Authoritative Attendance Fact Snapshot)
 * Clearly delineates authoritative attendance facts from future leave reconciliation placeholders.
 */
export interface AttendancePeriodSummary {
  id: string;
  companyId: string;
  periodId: string;
  employeeId: string;
  // Normalized integration fields (Authoritative attendance facts)
  calendarDays: number;
  scheduledWorkDays: number;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  weeklyOffDays: number;
  holidayDays: number;
  missingPunchDays?: number;

  // Preliminary Attendance Calculation (attendance facts only, strictly not final payroll LOP)
  attendanceEquivalentDays: number; // presentDays + (halfDays * 0.5) + weeklyOffDays + holidayDays

  // Leave Integration & Final Payroll interpretation (Phase 3C Reconciled)
  paidLeaveDays: number | null;     // Reconciled paid leave days
  unpaidLeaveDays: number | null;   // Reconciled unpaid leave days
  lossOfPayDays: number | null;     // Authoritative Loss of Pay days (unpaid leave + uncovered absence)
  payableDays: number | null;       // Authoritative Final Payable Days (calendarDays - lossOfPayDays)
  leaveIntegrationStatus: 'PENDING_LEAVE_INTEGRATION' | 'INTEGRATED' | 'RECONCILED';
  uncoveredAbsenceDays?: number;
  conflictDaysCount?: number;
  reconciliationVersion?: number;

  // Work duration & Overtime facts
  lateArrivalsCount: number;
  earlyExitsCount: number;
  totalLateMinutes: number;
  totalEarlyExitMinutes: number;
  totalGrossWorkMinutes: number;
  totalNetWorkMinutes: number;
  calculatedOvertimeMinutes: number;
  approvedOvertimeMinutes: number;

  status: AttendancePeriodSummaryStatus;
  version?: number;
  finalizedAt?: string;
  createdAt: string;
  updatedAt: string;
  // Enriched metadata for UI display
  employeeCode?: string;
  displayName?: string;
  employeeName?: string;
  departmentName?: string;
  designationName?: string;
  branchName?: string;
  avatarUrl?: string;
}

/**
 * 3. Immutable Period Snapshot Archive (Retains historical versions across reopens)
 */
export interface AttendancePeriodSnapshot {
  id: string;
  periodId: string;
  companyId: string;
  version: number;
  status: AttendancePeriodStatus;
  finalizedAt: string;
  finalizedBy: string;
  summariesCount: number;
  summaries: AttendancePeriodSummary[];
  createdAt: string;
}

/**
 * 3. Structured Finalization Blocker
 */
export interface FinalizationBlocker {
  type: 
    | 'MISSING_PUNCH' 
    | 'PENDING_REGULARIZATION' 
    | 'PENDING_OVERTIME' 
    | 'UNPROCESSED_DAILY' 
    | 'ALREADY_FINALIZED'
    | 'LEAVE_ATTENDANCE_CONFLICT'
    | 'LEAVE_ACCOUNTING_INCONSISTENT'
    | 'PENDING_LEAVE_REQUEST'
    | 'UNRECONCILED_LEAVE';
  count: number;
  message: string;
  details?: Array<{
    id: string;
    employeeId: string;
    employeeCode?: string;
    employeeName?: string;
    date: string;
    description: string;
  }>;
}

/**
 * 4. Attendance Period Review Metrics & Report
 */
export interface AttendancePeriodReviewReport {
  period: AttendancePeriod;
  metrics: {
    totalEmployees: number;
    calendarDays: number;
    presentDays: number;
    absentDays: number;
    halfDays: number;
    weeklyOffDays: number;
    holidayDays: number;
    paidLeaveDays: number;
    unpaidLeaveDays?: number;
    lossOfPayDays?: number;
    payableDays?: number;
    missingPunchesCount: number;
    pendingRegularizationsCount: number;
    pendingOvertimeCount: number;
    exceptionsCount: number;
    leaveConflictCount?: number;
    pendingLeaveRequestsCount?: number;
    totalApprovedOvertimeMinutes: number;
    totalApprovedOvertimeHours: number;
    isFinalizable: boolean;
  };
  blockers: FinalizationBlocker[];
  summaries: AttendancePeriodSummary[];
}

/**
 * DTOs & Operations
 */
export interface CreatePeriodDTO {
  year: number;
  month: number;
  startDate?: string;
  endDate?: string;
  name?: string;
  code?: string;
}

export interface FinalizePeriodDTO {
  periodId: string;
  forceFinalize?: boolean; // If false, fails if blockers exist
  notes?: string;
}

export interface ReopenPeriodDTO {
  periodId: string;
  reason: string; // Mandatory reason (minimum 10 characters)
}
