/**
 * Phase 4A Payroll Configuration Type Definitions
 * Relational Salary Structures, Components, Calendars, and Effective-Dated Compensation
 */

export enum ComponentType {
  EARNING = 'EARNING',
  DEDUCTION = 'DEDUCTION',
}

export enum ComponentNature {
  FIXED = 'FIXED',
  VARIABLE = 'VARIABLE',
  FORMULA = 'FORMULA',
  REIMBURSEMENT = 'REIMBURSEMENT',
  STATUTORY = 'STATUTORY',
}

export enum CalculationBase {
  FLAT_AMOUNT = 'FLAT_AMOUNT',
  PERCENTAGE_OF_BASIC = 'PERCENTAGE_OF_BASIC',
  PERCENTAGE_OF_GROSS = 'PERCENTAGE_OF_GROSS',
  PERCENTAGE_OF_CTC = 'PERCENTAGE_OF_CTC',
  FORMULA = 'FORMULA',
}

export enum RoundingRule {
  NONE = 'NONE',
  ROUND_NEAREST = 'ROUND_NEAREST',
  ROUND_UP = 'ROUND_UP',
  ROUND_DOWN = 'ROUND_DOWN',
}

export enum PayFrequency {
  MONTHLY = 'MONTHLY',
  BI_WEEKLY = 'BI_WEEKLY',
  SEMI_MONTHLY = 'SEMI_MONTHLY',
  WEEKLY = 'WEEKLY',
}

export enum PayrollPeriodStatus {
  UPCOMING = 'UPCOMING',
  OPEN = 'OPEN',
  PROCESSING = 'PROCESSING',
  CLOSED = 'CLOSED',
}

export enum CompensationChangeReason {
  NEW_HIRE = 'NEW_HIRE',
  PROMOTION = 'PROMOTION',
  ANNUAL_REVISION = 'ANNUAL_REVISION',
  PERFORMANCE_APPRAISAL = 'PERFORMANCE_APPRAISAL',
  MARKET_ADJUSTMENT = 'MARKET_ADJUSTMENT',
  CORRECTION = 'CORRECTION',
  STRUCTURE_MIGRATION = 'STRUCTURE_MIGRATION',
}

export enum CompensationStatus {
  ACTIVE = 'ACTIVE',
  SUPERSEDED = 'SUPERSEDED',
  CANCELLED = 'CANCELLED',
  DRAFT = 'DRAFT',
}

/**
 * Master Salary Component (Earnings & Deductions)
 */
export interface SalaryComponent {
  id: string;
  companyId: string;
  code: string;
  name: string;
  description?: string;
  type: ComponentType; // EARNING | DEDUCTION
  nature: ComponentNature; // FIXED | VARIABLE | FORMULA | STATUTORY
  calculationBase: CalculationBase;
  defaultFormula?: string;
  roundingRule: RoundingRule;
  
  // Taxability & Compliance Flags
  isTaxable: boolean;
  isPfEligible: boolean;
  isEsiEligible: boolean;
  isPtEligible: boolean;
  isTdsApplicable: boolean;
  isLopAffected: boolean; // Deducted on loss of pay / absence
  
  // General Metadata
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

/**
 * Child item inside a Salary Structure
 */
export interface SalaryStructureComponent {
  id: string;
  salaryStructureId: string;
  companyId: string;
  salaryComponentId: string;
  component?: SalaryComponent;
  calculationType: CalculationBase;
  factorValue: number; // Flat amount or percentage (e.g. 0.40 for 40% of CTC, or 25000 flat)
  formulaExpression?: string;
  baseComponentId?: string; // e.g. for HRA which is 50% of Basic
  isMandatory: boolean;
  allowOverride: boolean; // Whether employee-level override is permitted
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Master Salary Structure Template (Relational header)
 */
export interface SalaryStructure {
  id: string;
  companyId: string;
  code: string;
  name: string;
  description?: string;
  payFrequency: PayFrequency;
  currency: string;
  isActive: boolean;
  components?: SalaryStructureComponent[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

/**
 * Payroll Calendar Definition
 */
export interface PayrollCalendar {
  id: string;
  companyId: string;
  code: string;
  name: string;
  year: number;
  payFrequency: PayFrequency;
  startMonth: number; // 1-12
  endMonth: number; // 1-12
  cycleStartDay: number; // e.g. 1st or 26th
  cycleEndDay: number; // e.g. 30th or 25th
  payDay: number; // e.g. 1st or 31st
  cutoffDay: number; // e.g. 24th
  isDefault: boolean;
  isActive: boolean;
  periods?: PayrollPeriod[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

/**
 * Individual Payroll Period within a Calendar
 */
export interface PayrollPeriod {
  id: string;
  companyId: string;
  payrollCalendarId: string;
  periodNumber: number; // 1 to 12
  periodCode: string; // e.g. "2026-08" or "2026-M08"
  periodName: string; // e.g. "August 2026"
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  payDate: string; // YYYY-MM-DD
  cutoffDate: string; // YYYY-MM-DD
  status: PayrollPeriodStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Employee Component Override (Child of Compensation Assignment)
 */
export interface EmployeeComponentOverride {
  id: string;
  companyId: string;
  compensationAssignmentId: string;
  salaryComponentId: string;
  component?: SalaryComponent;
  calculationType: CalculationBase;
  overrideValue: number;
  reason?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Effective-Dated Employee Compensation Assignment (Header)
 */
export interface EmployeeCompensationAssignment {
  id: string;
  companyId: string;
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  departmentName?: string;
  designationName?: string;
  
  salaryStructureId: string;
  salaryStructure?: SalaryStructure;
  
  annualCtc: number; // Annual Cost to Company
  monthlyGross: number; // Computed or stated monthly base
  currency: string;
  payFrequency: PayFrequency;
  
  effectiveFrom: string; // YYYY-MM-DD
  effectiveTo?: string; // YYYY-MM-DD or null if active ongoing
  
  changeReason: CompensationChangeReason;
  remarks?: string;
  status: CompensationStatus;
  
  overrides?: EmployeeComponentOverride[];
  
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

/**
 * Phase 4B Payroll Engine Types
 */

export enum PayrollRunStatus {
  DRAFT = 'DRAFT',
  CALCULATING = 'CALCULATING',
  CALCULATED = 'CALCULATED',
  REVIEW = 'REVIEW',
  APPROVED = 'APPROVED',
  FINALIZED = 'FINALIZED',
  CANCELLED = 'CANCELLED',
}

export enum PayrollRunEmployeeStatus {
  DRAFT = 'DRAFT',
  CALCULATED = 'CALCULATED',
  HAS_EXCEPTIONS = 'HAS_EXCEPTIONS',
  EXCLUDED = 'EXCLUDED',
}

export enum PayrollExceptionType {
  MISSING_COMPENSATION = 'MISSING_COMPENSATION',
  MISSING_ATTENDANCE_SNAPSHOT = 'MISSING_ATTENDANCE_SNAPSHOT',
  ZERO_PAYABLE_DAYS = 'ZERO_PAYABLE_DAYS',
  NEGATIVE_NET_PAY = 'NEGATIVE_NET_PAY',
  COMPONENT_FORMULA_ERROR = 'COMPONENT_FORMULA_ERROR',
  UNFINALIZED_ATTENDANCE_PERIOD = 'UNFINALIZED_ATTENDANCE_PERIOD',
  INACTIVE_STRUCTURE = 'INACTIVE_STRUCTURE',
  SALARY_OVERRIDE_CONFLICT = 'SALARY_OVERRIDE_CONFLICT',
}

export enum PayrollExceptionSeverity {
  BLOCKING = 'BLOCKING',
  WARNING = 'WARNING',
}

/**
 * Master Payroll Run
 */
export interface PayrollRun {
  id: string;
  companyId: string;
  payrollPeriodId: string;
  attendanceSnapshotId: string;
  runNumber: number;
  runDate: string;
  status: PayrollRunStatus;
  
  totalEmployees: number;
  totalGrossEarnings: number;
  totalGrossDeductions: number;
  totalNetPay: number;
  totalLopDays: number;
  totalOtHours: number;
  exceptionsCount: number;
  
  calculatedAt?: string;
  calculatedBy?: string;
  calculatedByName?: string;
  approvedAt?: string;
  approvedBy?: string;
  approvedByName?: string;
  finalizedAt?: string;
  finalizedBy?: string;
  finalizedByName?: string;
  isLocked?: boolean;
  reopenReason?: string;
  reopenedAt?: string;
  reopenedBy?: string;
  notes?: string;
  
  // Populated relations / metadata
  payrollPeriod?: PayrollPeriod;
  employees?: PayrollRunEmployee[];
  exceptions?: PayrollException[];
  
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

/**
 * Granular Per-Employee Payroll Line Item Result
 */
export interface PayrollComponentResult {
  id: string;
  companyId: string;
  payrollRunId: string;
  payrollRunEmployeeId: string;
  employeeId: string;
  salaryComponentId?: string;
  
  componentCode: string;
  componentName: string;
  componentType: ComponentType; // EARNING | DEDUCTION
  componentNature: ComponentNature;
  calculationBase: CalculationBase;
  
  baseAmount: number;
  factorValue: number;
  isOverride: boolean;
  
  originalAmount: number;
  isLopAffected: boolean;
  proratedAmount: number;
  finalAmount: number;
  
  formulaDerivation?: string;
  displayOrder: number;
  
  createdAt: string;
  updatedAt: string;
}

/**
 * Per-Employee Payroll Run Result with Immutable Snapshots
 */
export interface PayrollRunEmployee {
  id: string;
  companyId: string;
  payrollRunId: string;
  employeeId: string;
  compensationAssignmentId?: string;
  salaryStructureId?: string;
  
  // Baseline contractual figures
  annualCtc: number;
  monthlyGross: number;
  currency: string;
  
  // Authoritative Attendance Facts (from Phase 3C Finalized Snapshot)
  periodCalendarDays: number;
  presentDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  uncoveredAbsenceDays: number;
  lossOfPayDays: number;
  payableDays: number;
  prorationFactor: number;
  
  // Overtime facts & calculation
  approvedOtMinutes: number;
  approvedOtHours: number;
  otRatePerHour: number;
  otAmount: number;
  
  // Output figures
  baseGrossEarnings: number;
  proratedGrossEarnings: number;
  lopDeductionAmount: number;
  grossEarnings: number;
  grossDeductions: number;
  netPay: number;
  
  status: PayrollRunEmployeeStatus;
  
  // Snapshots & Explanations
  compensationSnapshot: Record<string, any>;
  attendanceSnapshot: Record<string, any>;
  calculationExplanation: Record<string, any>;
  
  // Populated UI / child records
  employeeName?: string;
  employeeCode?: string;
  departmentName?: string;
  designationName?: string;
  components?: PayrollComponentResult[];
  exceptions?: PayrollException[];
  
  createdAt: string;
  updatedAt: string;
}

/**
 * Validation & Audit Exception for Payroll Run
 */
export interface PayrollException {
  id: string;
  companyId: string;
  payrollRunId: string;
  payrollRunEmployeeId?: string;
  employeeId?: string;
  employeeName?: string;
  employeeCode?: string;
  
  exceptionType: PayrollExceptionType;
  severity: PayrollExceptionSeverity;
  message: string;
  details?: Record<string, any>;
  
  isResolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNote?: string;
  
  createdAt: string;
}

export interface PayrollCalculationInput {
  payrollPeriodId: string;
  attendanceSnapshotId?: string; // Optional: if omitted, auto-find latest FINALIZED snapshot for matching dates
  notes?: string;
}

export interface PayrollRunSummary {
  run: PayrollRun;
  employees: PayrollRunEmployee[];
  exceptions: PayrollException[];
  period: PayrollPeriod;
}

/**
 * Phase 4C: Payroll Finalization, Snapshots & Payslips
 */

export enum PayslipStatus {
  GENERATED = 'GENERATED',
  PUBLISHED = 'PUBLISHED',
  WITHHELD = 'WITHHELD',
  CANCELLED = 'CANCELLED',
}

export enum PayrollSnapshotStatus {
  FINALIZED = 'FINALIZED',
  SUPERSEDED = 'SUPERSEDED',
  REOPENED = 'REOPENED',
}

export interface PayslipLineItem {
  componentCode: string;
  componentName: string;
  componentType: ComponentType; // EARNING | DEDUCTION
  componentNature: ComponentNature;
  calculationBase?: CalculationBase;
  baseAmount?: number;
  factorValue?: number;
  originalAmount: number;
  proratedAmount: number;
  amount: number;
  isLopAffected?: boolean;
  isOverride?: boolean;
  formulaDerivation?: string;
  displayOrder?: number;
}

export interface PayslipEmployeeSnapshot {
  employeeId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  departmentId?: string;
  departmentName?: string;
  designationId?: string;
  designationName?: string;
  joiningDate?: string;
  panNumber?: string; // Masked e.g. ABCDE****F
  taxIdentifier?: string;
  uanNumber?: string;
  pfNumber?: string;
  bankName?: string;
  accountNumberMasked?: string;
  bankBranch?: string;
  ifscOrRouting?: string;
}

export interface PayslipOrgSnapshot {
  companyId: string;
  companyName: string;
  legalName?: string;
  taxIdentifier?: string;
  registrationNumber?: string;
  address?: string;
  city?: string;
  country?: string;
  logoUrl?: string;
}

export interface Payslip {
  id: string;
  companyId: string;
  payrollRunId: string;
  payrollRunEmployeeId: string;
  payrollPeriodId: string;
  employeeId: string;
  
  payslipNumber: string;
  version: number;
  issueDate: string; // YYYY-MM-DD
  payDate: string; // YYYY-MM-DD
  currency: string;
  
  // Period Facts
  periodName: string;
  periodCode: string;
  periodStartDate: string;
  periodEndDate: string;
  
  // Attendance & Compensation Baseline
  annualCtc: number;
  monthlyGross: number;
  calendarDays: number;
  payableDays: number;
  lossOfPayDays: number;
  approvedOtHours: number;
  
  // Financial Breakdowns
  grossEarnings: number;
  grossDeductions: number;
  netPay: number;
  netPayInWords: string;
  
  // Year-to-Date Aggregations
  ytdGrossEarnings: number;
  ytdGrossDeductions: number;
  ytdNetPay: number;
  ytdTaxDeducted: number;
  ytdPfDeducted: number;
  
  // Distribution & Access
  status: PayslipStatus;
  publishedAt?: string;
  publishedBy?: string;
  viewedAt?: string;
  downloadedAt?: string;
  downloadToken: string;
  
  // Immutable Snapshots
  employeeSnapshot: PayslipEmployeeSnapshot;
  organizationSnapshot: PayslipOrgSnapshot;
  earningsBreakdown: PayslipLineItem[];
  deductionsBreakdown: PayslipLineItem[];
  notes?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface PayrollPeriodSnapshot {
  id: string;
  companyId: string;
  payrollPeriodId: string;
  payrollRunId: string;
  snapshotVersion: number;
  status: PayrollSnapshotStatus;
  
  finalizedAt: string;
  finalizedBy: string;
  finalizedByName?: string;
  
  totalEmployees: number;
  totalGrossEarnings: number;
  totalGrossDeductions: number;
  totalNetPay: number;
  totalLopDays: number;
  totalOtHours: number;
  
  runSummary: Record<string, any>;
  employeeResults: any[];
  
  reopenReason?: string;
  reopenedAt?: string;
  reopenedBy?: string;
  
  createdAt: string;
}

export interface PayrollFinalizeInput {
  payDate?: string;
  publishPayslipsImmediately?: boolean;
  notes?: string;
}

export interface PayrollReopenInput {
  reason: string;
}

export interface PayrollRegisterItem {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  departmentName: string;
  designationName: string;
  bankAccountMasked?: string;
  panOrTaxIdMasked?: string;
  
  calendarDays: number;
  payableDays: number;
  lossOfPayDays: number;
  approvedOtHours: number;
  
  monthlyGross: number;
  basicEarned: number;
  hraEarned: number;
  allowancesEarned: number;
  otEarned: number;
  totalGrossEarnings: number;
  
  pfDeduction: number;
  taxOrPtDeduction: number;
  otherDeductions: number;
  totalGrossDeductions: number;
  
  netPay: number;
  payslipNumber: string;
  payslipId: string;
  payslipStatus: PayslipStatus;
}

export interface PayrollRegisterSummary {
  payrollRunId: string;
  payrollPeriodId: string;
  periodName: string;
  periodCode: string;
  runNumber: number;
  status: PayrollRunStatus;
  currency: string;
  
  totalEmployees: number;
  totalGrossEarnings: number;
  totalGrossDeductions: number;
  totalNetPay: number;
  totalLopDays: number;
  totalOtHours: number;
  
  departmentSummaries: Array<{
    departmentName: string;
    employeeCount: number;
    totalGross: number;
    totalDeductions: number;
    totalNetPay: number;
  }>;
  
  items: PayrollRegisterItem[];
}


