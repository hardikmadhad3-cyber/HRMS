/**
 * HRMS Overtime Domain Types (Phase 2C)
 * Aligned with HRMS Document 2 (Attendance & Overtime Rules), Document 3 (Data Model), and Document 4 (APIs)
 */

export type OvertimeRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

/**
 * 1. Company Overtime Policy
 */
export interface OvertimePolicy {
  id: string;
  companyId: string;
  code: string;
  name: string;
  minQualifyingMinutes: number;      // e.g. 30: worked excess must exceed this before any OT is recognized
  roundingIntervalMinutes: number;   // e.g. 15: round down to nearest multiple
  maxDailyOtMinutes: number;         // e.g. 240 (4 hours)
  maxMonthlyOtMinutes: number;       // e.g. 3600 (60 hours)
  preApprovalRequired: boolean;      // requires pre-approval before OT work
  postApprovalAllowed: boolean;      // allows post-work OT submission
  weeklyOffEligible: boolean;        // work on weekly off qualifies as OT
  holidayEligible: boolean;          // work on holiday qualifies as OT
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

/**
 * 2. Overtime Request & Record
 */
export interface OvertimeRequest {
  id: string;
  companyId: string;
  employeeId: string;
  attendanceDate: string; // YYYY-MM-DD
  dailyAttendanceId?: string;
  calculatedMinutes: number; // Eligible OT based on policy
  requestedMinutes: number;  // Minutes requested
  approvedMinutes: number;   // Authoritative approved minutes
  reason: string;
  status: OvertimeRequestStatus;
  approverId?: string;
  approverComments?: string;
  actionedAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  // Enriched metadata for UI display
  employeeCode?: string;
  displayName?: string;
  employeeName?: string;
  departmentName?: string;
  designationName?: string;
  shiftName?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  firstCheckIn?: string;
  lastCheckOut?: string;
  grossWorkMinutes?: number;
  netWorkMinutes?: number;
  approverName?: string;
  avatarUrl?: string;
}

/**
 * DTOs for Overtime Operations
 */
export interface SubmitOvertimeDTO {
  employeeId?: string; // Optional if submitting as self (inferred from auth)
  attendanceDate: string;
  requestedMinutes: number;
  reason: string;
}

export interface ActionOvertimeDTO {
  status: 'APPROVED' | 'REJECTED';
  approvedMinutes?: number; // Defaults to requestedMinutes if approved and not specified
  approverComments?: string;
}

export interface OvertimeFilter {
  employeeId?: string;
  status?: OvertimeRequestStatus;
  startDate?: string;
  endDate?: string;
  month?: number;
  year?: number;
  departmentId?: string;
  branchId?: string;
  search?: string;
}

export interface OvertimeEligibilityResult {
  isEligible: boolean;
  calculatedMinutes: number;
  reason?: string;
  policyCode?: string;
  grossWorkMinutes: number;
  netWorkMinutes: number;
  scheduledShiftMinutes: number;
}
