/**
 * PHASE 3A — LEAVE MANAGEMENT TYPE DEFINITIONS
 * Source of truth for Leave Years, Leave Types, Leave Policies, Rules,
 * Effective-Dated Policy Assignments, and Policy Eligibility Evaluation.
 * 
 * Invariants: Zero fabricated leave balances or transaction ledgers in Phase 3A.
 */

export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export type LeavePeriodStatus = 'ACTIVE' | 'INACTIVE' | 'CLOSED';

export interface LeaveYear {
  id: string;
  companyId: string;
  code: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  status: LeavePeriodStatus;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export type LeaveCategory = 
  | 'CASUAL'
  | 'SICK'
  | 'PRIVILEGE'
  | 'UNPAID'
  | 'MATERNITY'
  | 'PATERNITY'
  | 'COMP_OFF'
  | 'BEREAVEMENT'
  | 'SPECIAL';

export type LeavePaidType = 'PAID' | 'UNPAID' | 'SPECIAL';

export type LeaveUnit = 'FULL_DAY' | 'HALF_DAY' | 'HOURS';

export type LeaveTypeStatus = 'ACTIVE' | 'INACTIVE';

export interface LeaveType {
  id: string;
  companyId: string;
  code: string;
  name: string;
  description?: string;
  category: LeaveCategory;
  paidType: LeavePaidType;
  unit: LeaveUnit;
  color: string;
  requiresReason: boolean;
  requiresAttachment: boolean;
  attachmentThresholdDays?: number;
  status: LeaveTypeStatus;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export type AccrualFrequency = 
  | 'ANNUAL_UPFRONT'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'HALF_YEARLY'
  | 'NONE';

export type AccrualTiming = 'START_OF_PERIOD' | 'END_OF_PERIOD';

export type ProrationRule = 
  | 'NONE'
  | 'PRORATE_BY_DAYS'
  | 'PRORATE_BY_MONTHS'
  | 'JOINING_MONTH_SPLIT';

export type ApplicableGender = 'ALL' | 'MALE' | 'FEMALE' | 'OTHER';
export type ApplicableMaritalStatus = 'ALL' | 'SINGLE' | 'MARRIED';

export interface LeavePolicyRule {
  id: string;
  companyId: string;
  leavePolicyId: string;
  leaveTypeId: string;
  leaveTypeCode?: string;
  leaveTypeName?: string;
  leaveCategory?: LeaveCategory;
  leavePaidType?: LeavePaidType;
  
  // Entitlement & Accrual
  annualEntitlement: number;
  accrualFrequency: AccrualFrequency;
  accrualTiming: AccrualTiming;
  prorationRule: ProrationRule;
  
  // Carry Forward
  allowCarryForward: boolean;
  maxCarryForwardDays: number;
  carryForwardExpiryMonths?: number;
  
  // Encashment
  allowEncashment: boolean;
  minBalanceForEncashment?: number;
  maxEncashmentDaysPerYear?: number;
  
  // Sandwich & Calendar rules
  sandwichRuleEnabled: boolean;
  includeHolidays: boolean;
  includeWeeklyOffs: boolean;
  
  // Limits & Restrictions
  minDaysPerRequest: number;
  maxConsecutiveDays: number;
  maxRequestsPerMonth?: number;
  maxAdvanceDays?: number;
  allowBackdated: boolean;
  maxBackdatedDays: number;
  allowNegativeBalance: boolean;
  negativeBalanceLimit: number;
  
  // Documentation & Tenure rules
  requiresAttachment: boolean;
  attachmentThresholdDays?: number;
  minServiceDaysRequired: number;
  allowDuringProbation: boolean;
  applicableGender: ApplicableGender;
  applicableMaritalStatus: ApplicableMaritalStatus;
  
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface LeavePolicyEligibility {
  id: string;
  companyId: string;
  leavePolicyId: string;
  employmentTypes: string[];
  departmentIds: string[];
  designationIds: string[];
  branchIds: string[];
  workLocationIds: string[];
  minServiceDays: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export type LeavePolicyStatus = 'ACTIVE' | 'INACTIVE';

export interface LeavePolicy {
  id: string;
  companyId: string;
  code: string;
  name: string;
  description?: string;
  priority: number;
  isDefault: boolean;
  status: LeavePolicyStatus;
  rules?: LeavePolicyRule[];
  eligibility?: LeavePolicyEligibility;
  assignedEmployeesCount?: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export type LeavePolicyAssignmentStatus = 'ACTIVE' | 'SUPERSEDED' | 'CANCELLED';

export interface EmployeeLeavePolicyAssignment {
  id: string;
  companyId: string;
  employeeId: string;
  leavePolicyId: string;
  effectiveFrom: string; // YYYY-MM-DD
  effectiveTo?: string | null; // YYYY-MM-DD
  assignmentReason: string;
  status: LeavePolicyAssignmentStatus;
  
  // Enriched metadata
  leavePolicyName?: string;
  leavePolicyCode?: string;
  employeeName?: string;
  employeeCode?: string;
  departmentName?: string;
  designationName?: string;
  
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface LeavePolicyRuleEvaluation {
  ruleId?: string;
  leaveTypeId: string;
  leaveTypeCode: string;
  leaveTypeName: string;
  category: LeaveCategory;
  paidType: LeavePaidType;
  unit: LeaveUnit;
  color: string;
  
  eligible: boolean;
  ineligibilityReasons: string[];
  
  annualEntitlement: number;
  accrualFrequency: AccrualFrequency;
  accrualTiming: AccrualTiming;
  prorationRule: ProrationRule;
  
  allowCarryForward: boolean;
  maxCarryForwardDays: number;
  carryForwardExpiryMonths?: number;
  
  allowEncashment: boolean;
  minBalanceForEncashment?: number;
  maxEncashmentDaysPerYear?: number;
  
  sandwichRuleEnabled: boolean;
  includeHolidays: boolean;
  includeWeeklyOffs: boolean;
  
  minDaysPerRequest: number;
  maxConsecutiveDays: number;
  allowBackdated: boolean;
  maxBackdatedDays: number;
  allowNegativeBalance: boolean;
  negativeBalanceLimit: number;
  
  requiresAttachment: boolean;
  attachmentThresholdDays?: number;
  minServiceDaysRequired: number;
  allowDuringProbation: boolean;
}

export interface LeavePolicyEvaluationResult {
  employeeId: string;
  employeeCode?: string;
  employeeName?: string;
  companyId: string;
  asOfDate: string;
  serviceDays: number;
  isProbation: boolean;
  gender?: string;
  
  policy: {
    id: string;
    code: string;
    name: string;
    priority: number;
    isDefault: boolean;
  } | null;
  
  assignment: {
    id: string;
    effectiveFrom: string;
    effectiveTo: string | null;
    status: LeavePolicyAssignmentStatus;
  } | null;
  
  rules: LeavePolicyRuleEvaluation[];
}

// =========================================================================
// PHASE 3B — LEAVE TRANSACTIONS, LEDGER, BALANCES & APPROVALS
// =========================================================================

export type LeaveTransactionType =
  | 'OPENING'
  | 'ACCRUAL'
  | 'CARRY_FORWARD'
  | 'ADJUSTMENT_CREDIT'
  | 'ADJUSTMENT_DEBIT'
  | 'LEAVE_CONSUMPTION'
  | 'LEAVE_REVERSAL'
  | 'EXPIRY'
  | 'ENCASHMENT_DEBIT';

export interface LeaveLedgerEntry {
  id: string;
  companyId: string;
  employeeId: string;
  leaveTypeId: string;
  leaveYearId: string;
  transactionType: LeaveTransactionType;
  quantity: number; // Positive for credits/reversals, negative for debits/consumption
  effectiveDate: string; // YYYY-MM-DD
  referenceType: string; // 'OPENING_POSTING' | 'ACCRUAL_RUN' | 'MANUAL_ADJUSTMENT' | 'LEAVE_REQUEST' | 'LEAVE_CANCELLATION' | 'YEAR_END_CARRY_FORWARD'
  referenceId?: string;
  policyRuleId?: string;
  remarks?: string;
  createdBy?: string;
  createdAt: string;

  // Enriched display properties
  leaveTypeCode?: string;
  leaveTypeName?: string;
  employeeName?: string;
  employeeCode?: string;
  createdByName?: string;
}

export interface EmployeeLeaveBalance {
  id: string;
  companyId: string;
  employeeId: string;
  leaveTypeId: string;
  leaveYearId: string;

  openingBalance: number;
  accruedBalance: number;
  carryForwardBalance: number;
  adjustmentCredit: number;
  adjustmentDebit: number;
  consumedBalance: number;
  reversedBalance: number;
  expiredBalance: number;
  encashedBalance: number;

  postedBalance: number;    // opening + accrued + carry_forward + adjustment_credit + reversed - adjustment_debit - consumed - expired - encashed
  reservedBalance: number;  // Sum of active pending requests
  availableBalance: number; // postedBalance - reservedBalance

  lastRebuiltAt: string;
  updatedAt: string;

  // Enriched UI metadata
  leaveTypeCode?: string;
  leaveTypeName?: string;
  leaveCategory?: LeaveCategory;
  paidType?: LeavePaidType;
  unit?: LeaveUnit;
  color?: string;
  annualEntitlement?: number;
  accrualFrequency?: AccrualFrequency;
  allowNegativeBalance?: boolean;
  negativeBalanceLimit?: number;
  employeeName?: string;
  employeeCode?: string;
  departmentName?: string;
}

export type ReservationStatus = 'ACTIVE' | 'RELEASED' | 'CONSUMED';

export interface LeaveBalanceReservation {
  id: string;
  companyId: string;
  employeeId: string;
  leaveTypeId: string;
  leaveYearId: string;
  leaveRequestId: string;
  quantity: number;
  status: ReservationStatus;
  createdAt: string;
  updatedAt: string;
}

export type LeaveRequestStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'RETURNED'
  | 'CANCELLED';

export type HalfDayPeriod = 'FIRST_HALF' | 'SECOND_HALF' | 'NONE';

export interface LeaveDayCalculationDetail {
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  isHoliday: boolean;
  holidayName?: string;
  isWeeklyOff: boolean;
  isSandwich: boolean;
  isChargeable: boolean;
  chargeableUnits: number;
  reason: 'WORKING_DAY' | 'EXCLUDED_HOLIDAY' | 'EXCLUDED_WEEKLY_OFF' | 'SANDWICH_CHARGEABLE' | 'HALF_DAY_FIRST' | 'HALF_DAY_SECOND';
}

export interface LeaveCalculationResult {
  fromDate: string;
  toDate: string;
  totalDaysInRange: number;
  workingDays: number;
  holidaysCount: number;
  weeklyOffsCount: number;
  sandwichDaysCount: number;
  chargeableUnits: number;
  unit: LeaveUnit;
  halfDayPeriod?: HalfDayPeriod;
  dateBreakdown: LeaveDayCalculationDetail[];
  policyRuleSnapshot?: Partial<LeavePolicyRule>;
  eligible: boolean;
  ineligibilityReasons: string[];
}

export interface LeaveAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSizeBytes: number;
  mimeType: string;
  uploadedAt: string;
}

export interface LeaveRequest {
  id: string;
  companyId: string;
  employeeId: string;
  leaveTypeId: string;
  leaveYearId: string;

  fromDate: string; // YYYY-MM-DD
  toDate: string;   // YYYY-MM-DD
  unit: LeaveUnit;
  halfDayPeriod?: HalfDayPeriod;

  requestedUnits: number;
  approvedUnits?: number | null;
  chargeableDays: number;
  sandwichDays: number;

  reason: string;
  status: LeaveRequestStatus;

  currentApproverId?: string | null;
  submittedAt: string;

  actionedAt?: string | null;
  actionedBy?: string | null;
  approverRemarks?: string | null;

  cancellationReason?: string | null;
  cancelledAt?: string | null;
  cancelledBy?: string | null;

  leavePolicyId?: string;
  leavePolicyRuleId?: string;

  calculationBreakdown?: LeaveDayCalculationDetail[];
  attachments?: LeaveAttachment[];

  createdAt: string;
  updatedAt: string;
  createdBy?: string;

  // Enriched presentation fields
  employeeName?: string;
  employeeCode?: string;
  departmentName?: string;
  designationName?: string;
  leaveTypeCode?: string;
  leaveTypeName?: string;
  leaveCategory?: LeaveCategory;
  paidType?: LeavePaidType;
  color?: string;
  currentApproverName?: string;
  actionedByName?: string;
}

export interface LeaveAccrualLog {
  id: string;
  companyId: string;
  accrualRunKey: string;
  accrualPeriod: string; // e.g. '2026-08'
  leaveYearId: string;
  leaveTypeId: string;
  postingDate: string;
  totalEmployeesProcessed: number;
  totalUnitsAccrued: number;
  status: 'COMPLETED' | 'FAILED' | 'PARTIAL';
  createdBy?: string;
  createdAt: string;

  leaveTypeCode?: string;
  leaveTypeName?: string;
}

// DTOs for Phase 3B Transactions
export interface PostOpeningBalanceDTO {
  employeeId: string;
  leaveTypeId: string;
  leaveYearId?: string;
  quantity: number;
  effectiveDate?: string;
  remarks?: string;
}

export interface PostAccrualRunDTO {
  accrualPeriod: string; // YYYY-MM
  leaveYearId?: string;
  leaveTypeId?: string;
  postingDate?: string;
  dryRun?: boolean;
}

export interface PostManualAdjustmentDTO {
  employeeId: string;
  leaveTypeId: string;
  leaveYearId?: string;
  adjustmentType: 'CREDIT' | 'DEBIT';
  quantity: number;
  effectiveDate: string;
  remarks: string;
}

export interface CreateLeaveRequestDTO {
  employeeId?: string; // Optional if submitted by ESS self
  leaveTypeId: string;
  fromDate: string;
  toDate: string;
  unit?: LeaveUnit;
  halfDayPeriod?: HalfDayPeriod;
  reason: string;
  attachments?: LeaveAttachment[];
}

export interface ActionLeaveRequestDTO {
  action: 'APPROVE' | 'REJECT' | 'RETURN';
  remarks?: string;
}

export interface CancelLeaveRequestDTO {
  cancellationReason: string;
}

export interface LeaveCalendarEvent {
  id: string;
  requestId: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  departmentName?: string;
  leaveTypeId: string;
  leaveTypeCode: string;
  leaveTypeName: string;
  color: string;
  fromDate: string;
  toDate: string;
  unit: LeaveUnit;
  chargeableUnits: number;
  status: LeaveRequestStatus;
}

