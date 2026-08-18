/**
 * PostgreSQL Database & Repository Architecture
 * Phase 1B: Real Organization Master Data Store
 */

import { Company, Branch, Department, Designation, WorkLocation, Holiday } from '../../src/types/organization.js';
import {
  Employee,
  EmployeeAssignment,
  EmployeeAddress,
  EmployeeEmergencyContact,
  EmployeeBankAccount,
  EmployeeStatutoryDetails,
  EmployeeDocument,
  EmployeeStatusHistory,
} from '../../src/types/employee.js';
import {
  Shift,
  ShiftBreak,
  WeeklyOffRule,
  EmployeeShiftAssignment,
  ShiftRosterEntry,
} from '../../src/types/shift.js';
import {
  AttendancePunch,
  DailyAttendance,
  AttendanceRegularizationRequest,
} from '../../src/types/attendance.js';
import {
  OvertimePolicy,
  OvertimeRequest,
} from '../../src/types/overtime.js';
import {
  AttendancePeriod,
  AttendancePeriodSummary,
  AttendancePeriodSnapshot,
} from '../../src/types/period.js';
import {
  LeaveYear,
  LeaveType,
  LeavePolicy,
  LeavePolicyRule,
  LeavePolicyEligibility,
  EmployeeLeavePolicyAssignment,
  LeaveLedgerEntry,
  EmployeeLeaveBalance,
  LeaveBalanceReservation,
  LeaveRequest,
  LeaveAccrualLog,
} from '../../src/types/leave.js';
import {
  LeaveAttendanceReconciliation,
  TimeLeavePeriodSnapshot,
} from '../../src/types/reconciliation.js';
import {
  SalaryComponent,
  SalaryStructure,
  SalaryStructureComponent,
  PayrollCalendar,
  PayrollPeriod,
  EmployeeCompensationAssignment,
  EmployeeComponentOverride,
  ComponentType,
  ComponentNature,
  CalculationBase,
  RoundingRule,
  PayFrequency,
  PayrollPeriodStatus,
  CompensationChangeReason,
  CompensationStatus,
  PayrollRun,
  PayrollRunEmployee,
  PayrollComponentResult,
  PayrollException,
  PayrollRunStatus,
  PayrollRunEmployeeStatus,
  PayrollExceptionType,
  PayrollExceptionSeverity,
  Payslip,
  PayrollPeriodSnapshot,
} from '../../src/types/payroll.js';
import {
  JobRequisition,
  RequisitionPriority,
  RequisitionStatus,
  Candidate,
  CandidateSource,
  Application,
  ApplicationStage,
  ApplicationStatus,
  RecruitmentInterview,
  InterviewType,
  InterviewStatus,
  InterviewRecommendation,
  JobOffer,
  OfferStatus,
  CandidateStatusHistory,
  OnboardingTemplate,
  OnboardingTaskCategory,
  OnboardingDocType,
  EmployeeOnboarding,
  OnboardingStatus,
  OnboardingTask,
  OnboardingTaskStatus,
  OnboardingDocument,
  OnboardingDocStatus,
} from '../../src/types/recruitment.js';
<<<<<<< HEAD
import {
  PerformanceCycle,
  PerformanceCycleType,
  PerformanceCycleStatus,
  MeasurementType,
  PerformanceGoal,
  PerformanceGoalStatus,
  PerformanceReview,
  PerformanceReviewStatus,
  ManagerRecommendation,
  PerformanceReviewTemplate,
  GoalCategory,
  PerformanceReviewHistory,
} from '../../src/types/performance.js';
import {
  ExpenseCategory,
  ExpenseClaim,
  ExpenseClaimItem,
  ExpenseClaimHistory,
} from '../../src/types/expenses.js';
import {
  AssetCategory,
  AssetMaster,
  AssetAssignment,
  AssetAssignmentHistory,
  AssetStatus,
  AssetCondition,
} from '../../src/types/assets.js';
import {
  OffboardingRequest,
  OffboardingClearanceItem,
  ExitInterview,
  OffboardingHistory,
} from '../../src/types/offboarding.js';
import {
  InAppNotification,
  SystemSetting,
  CustomRoleDefinition,
  UserCompanyAccessEntry,
} from '../../src/types/platform.js';
import { PermissionKey, UserRole } from '../../src/types/auth.js';
=======
>>>>>>> 4a1448526a9835d6aa52ec14365c16a1afc6f77f

export interface TenantScopedFilter {
  companyId: string;
  status?: 'ACTIVE' | 'INACTIVE';
  search?: string;
  year?: number;
  workLocationId?: string;
  branchId?: string;
}

// In-Memory Relational Master Storage with PostgreSQL Constraints & Multi-Tenant Boundaries
export class RelationalDatabase {
  private static instance: RelationalDatabase;

  // Phase 1B Organization Master
  public companies: Map<string, Company> = new Map();
  public branches: Map<string, Branch> = new Map();
  public departments: Map<string, Department> = new Map();
  public designations: Map<string, Designation> = new Map();
  public workLocations: Map<string, WorkLocation> = new Map();
  public holidays: Map<string, Holiday> = new Map();

  // Phase 1C Employee Core
  public employees: Map<string, Employee> = new Map();
  public employeeAssignments: Map<string, EmployeeAssignment> = new Map();
  public employeeAddresses: Map<string, EmployeeAddress> = new Map();
  public employeeEmergencyContacts: Map<string, EmployeeEmergencyContact> = new Map();
  public employeeBankAccounts: Map<string, EmployeeBankAccount> = new Map();
  public employeeStatutoryDetails: Map<string, EmployeeStatutoryDetails> = new Map();
  public employeeDocuments: Map<string, EmployeeDocument> = new Map();
  public employeeStatusHistory: Map<string, EmployeeStatusHistory> = new Map();

  // Phase 2A Shift Management & Employee Shift Assignments
  public shifts: Map<string, Shift> = new Map();
  public shiftBreaks: Map<string, ShiftBreak> = new Map();
  public weeklyOffRules: Map<string, WeeklyOffRule> = new Map();
  public employeeShiftAssignments: Map<string, EmployeeShiftAssignment> = new Map();
  public shiftRosterEntries: Map<string, ShiftRosterEntry> = new Map();

  // Phase 2B Attendance Punches & Daily Attendance Engine
  public attendancePunches: Map<string, AttendancePunch> = new Map();
  public dailyAttendance: Map<string, DailyAttendance> = new Map();
  public attendanceRegularizationRequests: Map<string, AttendanceRegularizationRequest> = new Map();

  // Phase 2C Overtime, Attendance Finalization & Payroll-Ready Summary
  public overtimePolicies: Map<string, OvertimePolicy> = new Map();
  public overtimeRequests: Map<string, OvertimeRequest> = new Map();
  public attendancePeriods: Map<string, AttendancePeriod> = new Map();
  public attendancePeriodSummaries: Map<string, AttendancePeriodSummary> = new Map();
  public attendancePeriodSnapshots: Map<string, AttendancePeriodSnapshot> = new Map();

  // Phase 3A Leave Configuration & Policy Engine
  public leaveYears: Map<string, LeaveYear> = new Map();
  public leaveTypes: Map<string, LeaveType> = new Map();
  public leavePolicies: Map<string, LeavePolicy> = new Map();
  public leavePolicyRules: Map<string, LeavePolicyRule> = new Map();
  public leavePolicyEligibilities: Map<string, LeavePolicyEligibility> = new Map();
  public employeeLeavePolicyAssignments: Map<string, EmployeeLeavePolicyAssignment> = new Map();

  // Phase 3B Leave Transactions, Ledger, Balances, Reservations & Requests
  public leaveLedgers: Map<string, LeaveLedgerEntry> = new Map();
  public leaveBalances: Map<string, EmployeeLeaveBalance> = new Map();
  public leaveReservations: Map<string, LeaveBalanceReservation> = new Map();
  public leaveRequests: Map<string, LeaveRequest> = new Map();
  public leaveAccrualLogs: Map<string, LeaveAccrualLog> = new Map();

  // Phase 3C Leave ↔ Attendance Reconciliation & Payroll Snapshots
  public leaveAttendanceReconciliations: Map<string, LeaveAttendanceReconciliation> = new Map();
  public timeLeavePeriodSnapshots: Map<string, TimeLeavePeriodSnapshot> = new Map();

  // Phase 4A Payroll Configuration
  public salaryComponents: Map<string, SalaryComponent> = new Map();
  public salaryStructures: Map<string, SalaryStructure> = new Map();
  public salaryStructureComponents: Map<string, SalaryStructureComponent> = new Map();
  public payrollCalendars: Map<string, PayrollCalendar> = new Map();
  public payrollPeriods: Map<string, PayrollPeriod> = new Map();
  public employeeCompensationAssignments: Map<string, EmployeeCompensationAssignment> = new Map();
  public employeeCompensationOverrides: Map<string, EmployeeComponentOverride> = new Map();

  // Phase 4B Payroll Execution & Calculation Engine
  public payrollRuns: Map<string, PayrollRun> = new Map();
  public payrollRunEmployees: Map<string, PayrollRunEmployee> = new Map();
  public payrollComponentResults: Map<string, PayrollComponentResult> = new Map();
  public payrollExceptions: Map<string, PayrollException> = new Map();

  // Phase 4C Payroll Finalization, Versioned Snapshots & Payslips
  public payslips: Map<string, Payslip> = new Map();
  public payrollPeriodSnapshots: Map<string, PayrollPeriodSnapshot> = new Map();

  // Phase 5 Recruitment & Onboarding Module
  public jobRequisitions: Map<string, JobRequisition> = new Map();
  public candidates: Map<string, Candidate> = new Map();
  public applications: Map<string, Application> = new Map();
  public recruitmentInterviews: Map<string, RecruitmentInterview> = new Map();
  public jobOffers: Map<string, JobOffer> = new Map();
  public candidateStatusHistory: Map<string, CandidateStatusHistory> = new Map();
  public onboardingTemplates: Map<string, OnboardingTemplate> = new Map();
  public employeeOnboardings: Map<string, EmployeeOnboarding> = new Map();
  public onboardingTasks: Map<string, OnboardingTask> = new Map();
  public onboardingDocuments: Map<string, OnboardingDocument> = new Map();

<<<<<<< HEAD
  // Phase 6A Performance Management Module
  public performanceReviewTemplates: Map<string, PerformanceReviewTemplate> = new Map();
  public performanceCycles: Map<string, PerformanceCycle> = new Map();
  public performanceGoalCategories: Map<string, GoalCategory> = new Map();
  public performanceGoals: Map<string, PerformanceGoal> = new Map();
  public performanceReviews: Map<string, PerformanceReview> = new Map();
  public performanceReviewHistory: Map<string, PerformanceReviewHistory> = new Map();

  // Phase 6B Expenses & Assets Module
  public expenseCategories: Map<string, ExpenseCategory> = new Map();
  public expenseClaims: Map<string, ExpenseClaim> = new Map();
  public expenseClaimItems: Map<string, ExpenseClaimItem> = new Map();
  public expenseClaimHistory: Map<string, ExpenseClaimHistory> = new Map();

  public assetCategories: Map<string, AssetCategory> = new Map();
  public assetMaster: Map<string, AssetMaster> = new Map();
  public assetAssignments: Map<string, AssetAssignment> = new Map();
  public assetAssignmentHistory: Map<string, AssetAssignmentHistory> = new Map();

  // Phase 6C Offboarding & Separation Module
  public offboardingRequests: Map<string, OffboardingRequest> = new Map();
  public offboardingClearanceItems: Map<string, OffboardingClearanceItem> = new Map();
  public exitInterviews: Map<string, ExitInterview> = new Map();
  public offboardingHistory: Map<string, OffboardingHistory> = new Map();

  // Phase 7 Platform Services (Notifications, Settings, Custom Roles & Company Access)
  public inAppNotifications: Map<string, InAppNotification> = new Map();
  public systemSettings: Map<string, SystemSetting> = new Map();
  public customRoles: Map<string, CustomRoleDefinition> = new Map();
  public userCompanyAccess: Map<string, UserCompanyAccessEntry> = new Map();

=======
>>>>>>> 4a1448526a9835d6aa52ec14365c16a1afc6f77f
  private constructor() {
    this.seedInitialMasterData();
  }

  public static getInstance(): RelationalDatabase {
    if (!RelationalDatabase.instance) {
      RelationalDatabase.instance = new RelationalDatabase();
    }
    return RelationalDatabase.instance;
  }

  public seedInitialMasterData(): void {
    // 1. Companies
    const c1: Company = {
      id: 'comp-101',
      code: 'ACME',
      name: 'Acme Enterprise Solutions',
      legalName: 'Acme Enterprise Holdings Inc.',
      status: 'ACTIVE',
      currency: 'USD',
      locale: 'en-US',
      timezone: 'America/New_York',
      taxIdentifier: 'TAX-9982310',
      contactEmail: 'hr@acme-corp.com',
      contactPhone: '+1 (555) 019-2831',
      address: '100 Tech Plaza, Suite 400, New York, NY 10001',
      createdAt: '2026-01-10T08:00:00Z',
      updatedAt: '2026-08-01T10:30:00Z',
      createdBy: 'usr-1',
    };

    const c2: Company = {
      id: 'comp-102',
      code: 'NEXUS',
      name: 'Nexus Tech Global',
      legalName: 'Nexus Global Software Services LLC',
      status: 'ACTIVE',
      currency: 'GBP',
      locale: 'en-GB',
      timezone: 'Europe/London',
      taxIdentifier: 'GB-77123901',
      contactEmail: 'hr@nexusglobal.io',
      contactPhone: '+44 20 7946 0912',
      address: '25 Financial Way, London EC2N 2DB, United Kingdom',
      createdAt: '2026-03-15T09:00:00Z',
      updatedAt: '2026-07-20T14:15:00Z',
      createdBy: 'usr-1',
    };

    this.companies.set(c1.id, c1);
    this.companies.set(c2.id, c2);

    // 2. Branches
    const b1: Branch = {
      id: 'br-1',
      companyId: 'comp-101',
      code: 'NY-HQ',
      name: 'New York Headquarters',
      timezoneOverride: 'America/New_York',
      address: '100 Tech Plaza, Suite 400',
      city: 'New York',
      state: 'NY',
      country: 'USA',
      postalCode: '10001',
      status: 'ACTIVE',
      contactPerson: 'David Miller',
      contactEmail: 'dmiller@acme-corp.com',
      contactPhone: '+1 (555) 019-2831',
      createdAt: '2026-01-10T08:00:00Z',
      updatedAt: '2026-01-10T08:00:00Z',
      createdBy: 'usr-1',
    };

    const b2: Branch = {
      id: 'br-2',
      companyId: 'comp-101',
      code: 'SF-OFFICE',
      name: 'San Francisco Innovation Center',
      timezoneOverride: 'America/Los_Angeles',
      address: '450 Market Street, 12th Floor',
      city: 'San Francisco',
      state: 'CA',
      country: 'USA',
      postalCode: '94105',
      status: 'ACTIVE',
      contactPerson: 'Elena Rostova',
      contactEmail: 'erostova@acme-corp.com',
      contactPhone: '+1 (415) 555-0182',
      createdAt: '2026-02-01T08:00:00Z',
      updatedAt: '2026-02-01T08:00:00Z',
      createdBy: 'usr-1',
    };

    const b3: Branch = {
      id: 'br-3',
      companyId: 'comp-102',
      code: 'LDN-HQ',
      name: 'London Central HQ',
      timezoneOverride: 'Europe/London',
      address: '25 Financial Way',
      city: 'London',
      state: 'Greater London',
      country: 'United Kingdom',
      postalCode: 'EC2N 2DB',
      status: 'ACTIVE',
      contactPerson: 'James Sterling',
      contactEmail: 'jsterling@nexusglobal.io',
      contactPhone: '+44 20 7946 0912',
      createdAt: '2026-03-15T09:00:00Z',
      updatedAt: '2026-03-15T09:00:00Z',
      createdBy: 'usr-1',
    };

    this.branches.set(b1.id, b1);
    this.branches.set(b2.id, b2);
    this.branches.set(b3.id, b3);

    // 3. Departments
    const d1: Department = {
      id: 'dept-1',
      companyId: 'comp-101',
      code: 'ENG',
      name: 'Software Engineering',
      departmentHeadName: 'Robert Vance',
      description: 'Core product engineering, platform infrastructure & quality',
      employeeCount: 42,
      status: 'ACTIVE',
      createdAt: '2026-01-10T08:00:00Z',
      updatedAt: '2026-01-10T08:00:00Z',
      createdBy: 'usr-1',
    };

    const d2: Department = {
      id: 'dept-2',
      companyId: 'comp-101',
      code: 'HR',
      name: 'Human Resources & Talent',
      departmentHeadName: 'Sarah Jenkins',
      description: 'Talent acquisition, employee experience, and people operations',
      employeeCount: 8,
      status: 'ACTIVE',
      createdAt: '2026-01-10T08:00:00Z',
      updatedAt: '2026-01-10T08:00:00Z',
      createdBy: 'usr-1',
    };

    const d3: Department = {
      id: 'dept-3',
      companyId: 'comp-101',
      code: 'FIN',
      name: 'Finance & Payroll',
      departmentHeadName: 'Michael Chang',
      description: 'Financial management, compliance, and corporate payroll',
      employeeCount: 6,
      status: 'ACTIVE',
      createdAt: '2026-01-10T08:00:00Z',
      updatedAt: '2026-01-10T08:00:00Z',
      createdBy: 'usr-1',
    };

    const d4: Department = {
      id: 'dept-4',
      companyId: 'comp-102',
      code: 'NEX-ENG',
      name: 'Cloud Infrastructure Engineering',
      departmentHeadName: 'Alistair Brown',
      description: 'Global cloud solutions & client deployments',
      employeeCount: 20,
      status: 'ACTIVE',
      createdAt: '2026-03-15T09:00:00Z',
      updatedAt: '2026-03-15T09:00:00Z',
      createdBy: 'usr-1',
    };

    this.departments.set(d1.id, d1);
    this.departments.set(d2.id, d2);
    this.departments.set(d3.id, d3);
    this.departments.set(d4.id, d4);

    // 4. Designations
    const des1: Designation = {
      id: 'desig-1',
      companyId: 'comp-101',
      code: 'SWE-SR',
      name: 'Senior Software Engineer',
      gradeLevel: 'L5',
      description: 'Lead engineer for microservices and database architecture',
      employeeCount: 18,
      status: 'ACTIVE',
      createdAt: '2026-01-10T08:00:00Z',
      updatedAt: '2026-01-10T08:00:00Z',
      createdBy: 'usr-1',
    };

    const des2: Designation = {
      id: 'desig-2',
      companyId: 'comp-101',
      code: 'HR-MGR',
      name: 'HR Operations Manager',
      gradeLevel: 'M2',
      description: 'Oversees HR workflow, policies and compliance',
      employeeCount: 3,
      status: 'ACTIVE',
      createdAt: '2026-01-10T08:00:00Z',
      updatedAt: '2026-01-10T08:00:00Z',
      createdBy: 'usr-1',
    };

    const des3: Designation = {
      id: 'desig-3',
      companyId: 'comp-101',
      code: 'PAY-SPEC',
      name: 'Payroll Specialist',
      gradeLevel: 'L4',
      description: 'Responsible for payroll cycles, tax deductions, and statutory filings',
      employeeCount: 2,
      status: 'ACTIVE',
      createdAt: '2026-01-10T08:00:00Z',
      updatedAt: '2026-01-10T08:00:00Z',
      createdBy: 'usr-1',
    };

    const des4: Designation = {
      id: 'desig-4',
      companyId: 'comp-102',
      code: 'CLOUD-ARCH',
      name: 'Principal Cloud Architect',
      gradeLevel: 'L6',
      description: 'Chief technical architect for enterprise systems',
      employeeCount: 4,
      status: 'ACTIVE',
      createdAt: '2026-03-15T09:00:00Z',
      updatedAt: '2026-03-15T09:00:00Z',
      createdBy: 'usr-1',
    };

    this.designations.set(des1.id, des1);
    this.designations.set(des2.id, des2);
    this.designations.set(des3.id, des3);
    this.designations.set(des4.id, des4);

    // 5. Work Locations
    const wl1: WorkLocation = {
      id: 'wl-1',
      companyId: 'comp-101',
      branchId: 'br-1',
      branchName: 'New York Headquarters',
      code: 'NYC-TECH-TOWER',
      name: 'NYC Tech Plaza Tower',
      address: '100 Tech Plaza, Suite 400',
      city: 'New York',
      state: 'NY',
      country: 'USA',
      postalCode: '10001',
      timezone: 'America/New_York',
      status: 'ACTIVE',
      createdAt: '2026-01-10T08:00:00Z',
      updatedAt: '2026-01-10T08:00:00Z',
      createdBy: 'usr-1',
    };

    const wl2: WorkLocation = {
      id: 'wl-2',
      companyId: 'comp-101',
      branchId: 'br-2',
      branchName: 'San Francisco Innovation Center',
      code: 'SFO-INNOV-HUB',
      name: 'San Francisco Innovation Hub',
      address: '450 Market Street, 12th Floor',
      city: 'San Francisco',
      state: 'CA',
      country: 'USA',
      postalCode: '94105',
      timezone: 'America/Los_Angeles',
      status: 'ACTIVE',
      createdAt: '2026-02-01T08:00:00Z',
      updatedAt: '2026-02-01T08:00:00Z',
      createdBy: 'usr-1',
    };

    const wl3: WorkLocation = {
      id: 'wl-3',
      companyId: 'comp-102',
      branchId: 'br-3',
      branchName: 'London Central HQ',
      code: 'LDN-FIN-CTR',
      name: 'London Financial Center',
      address: '25 Financial Way',
      city: 'London',
      state: 'Greater London',
      country: 'United Kingdom',
      postalCode: 'EC2N 2DB',
      timezone: 'Europe/London',
      status: 'ACTIVE',
      createdAt: '2026-03-15T09:00:00Z',
      updatedAt: '2026-03-15T09:00:00Z',
      createdBy: 'usr-1',
    };

    this.workLocations.set(wl1.id, wl1);
    this.workLocations.set(wl2.id, wl2);
    this.workLocations.set(wl3.id, wl3);

    // 6. Holidays
    const h1: Holiday = {
      id: 'hol-1',
      companyId: 'comp-101',
      name: "New Year's Day",
      date: '2026-01-01',
      type: 'PUBLIC',
      description: 'Official Public Holiday',
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      createdBy: 'usr-1',
    };

    const h2: Holiday = {
      id: 'hol-2',
      companyId: 'comp-101',
      name: 'Memorial Day',
      date: '2026-05-25',
      type: 'PUBLIC',
      description: 'Federal Memorial Day',
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      createdBy: 'usr-1',
    };

    const h3: Holiday = {
      id: 'hol-3',
      companyId: 'comp-101',
      name: 'Independence Day',
      date: '2026-07-04',
      type: 'PUBLIC',
      description: 'US Independence Day',
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      createdBy: 'usr-1',
    };

    const h4: Holiday = {
      id: 'hol-4',
      companyId: 'comp-101',
      name: 'Annual Foundation Day',
      date: '2026-10-15',
      type: 'COMPANY',
      description: 'Acme Enterprise Global Celebration',
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      createdBy: 'usr-1',
    };

    const h5: Holiday = {
      id: 'hol-5',
      companyId: 'comp-102',
      name: 'Early May Bank Holiday',
      date: '2026-05-04',
      type: 'PUBLIC',
      description: 'UK Statutory Bank Holiday',
      status: 'ACTIVE',
      createdAt: '2026-03-15T09:00:00Z',
      updatedAt: '2026-03-15T09:00:00Z',
      createdBy: 'usr-1',
    };

    this.holidays.set(h1.id, h1);
    this.holidays.set(h2.id, h2);
    this.holidays.set(h3.id, h3);
    this.holidays.set(h4.id, h4);
    this.holidays.set(h5.id, h5);

    // Initial Employee Seed: Alexander Vance (comp-101)
    const emp1: Employee = {
      id: 'emp-101',
      companyId: 'comp-101',
      employeeCode: 'EMP-001',
      firstName: 'Alexander',
      lastName: 'Vance',
      displayName: 'Alexander Vance',
      gender: 'MALE',
      dateOfBirth: '1985-06-15',
      maritalStatus: 'MARRIED',
      nationality: 'American',
      personalEmail: 'alex.vance@personal.com',
      workEmail: 'admin@hrms.enterprise.com',
      mobileNumber: '+1 555-0101',
      joiningDate: '2022-01-10',
      probationPeriodMonths: 0,
      noticePeriodDays: 60,
      employmentType: 'FULL_TIME',
      status: 'ACTIVE',
      createdAt: '2022-01-10T09:00:00Z',
      updatedAt: '2022-01-10T09:00:00Z',
      createdBy: 'usr-1',
      updatedBy: 'usr-1',
    };
    this.employees.set(emp1.id, emp1);

    const asg1: EmployeeAssignment = {
      id: 'asg-101',
      employeeId: emp1.id,
      companyId: 'comp-101',
      branchId: 'br-1',
      departmentId: 'dept-1',
      designationId: 'desig-1',
      workLocationId: 'loc-1',
      effectiveFrom: '2022-01-10',
      changeReason: 'INITIAL_JOINING',
      notes: 'Executive leadership assignment.',
      createdAt: '2022-01-10T09:00:00Z',
      updatedAt: '2022-01-10T09:00:00Z',
      createdBy: 'usr-1',
    };
    this.employeeAssignments.set(asg1.id, asg1);

    // Initial Employee Seed: Sarah Jenkins (comp-101)
    const emp2: Employee = {
      id: 'emp-102',
      companyId: 'comp-101',
      employeeCode: 'EMP-002',
      firstName: 'Sarah',
      lastName: 'Jenkins',
      displayName: 'Sarah Jenkins',
      gender: 'FEMALE',
      dateOfBirth: '1990-03-22',
      maritalStatus: 'MARRIED',
      nationality: 'American',
      personalEmail: 'sarah.j@gmail.com',
      workEmail: 'hr.admin@acme-corp.com',
      mobileNumber: '+1 555-0102',
      joiningDate: '2022-03-01',
      probationPeriodMonths: 3,
      noticePeriodDays: 30,
      employmentType: 'FULL_TIME',
      status: 'ACTIVE',
      createdAt: '2022-03-01T09:00:00Z',
      updatedAt: '2022-03-01T09:00:00Z',
      createdBy: 'usr-1',
      updatedBy: 'usr-1',
    };
    this.employees.set(emp2.id, emp2);

    const asg2: EmployeeAssignment = {
      id: 'asg-102',
      employeeId: emp2.id,
      companyId: 'comp-101',
      branchId: 'br-1',
      departmentId: 'dept-2',
      designationId: 'desig-2',
      workLocationId: 'loc-1',
      managerId: emp1.id,
      effectiveFrom: '2022-03-01',
      changeReason: 'INITIAL_JOINING',
      notes: 'HR Director appointment.',
      createdAt: '2022-03-01T09:00:00Z',
      updatedAt: '2022-03-01T09:00:00Z',
      createdBy: 'usr-1',
    };
    this.employeeAssignments.set(asg2.id, asg2);

    // Initial Employee Seed: Robert Vance (comp-101)
    const emp3: Employee = {
      id: 'emp-103',
      companyId: 'comp-101',
      employeeCode: 'EMP-003',
      firstName: 'Robert',
      lastName: 'Vance',
      displayName: 'Robert Vance',
      gender: 'MALE',
      dateOfBirth: '1988-11-05',
      maritalStatus: 'SINGLE',
      nationality: 'American',
      personalEmail: 'robert.v@gmail.com',
      workEmail: 'manager@acme-corp.com',
      mobileNumber: '+1 555-0103',
      joiningDate: '2022-05-15',
      probationPeriodMonths: 3,
      noticePeriodDays: 30,
      employmentType: 'FULL_TIME',
      status: 'ACTIVE',
      createdAt: '2022-05-15T09:00:00Z',
      updatedAt: '2022-05-15T09:00:00Z',
      createdBy: 'usr-1',
      updatedBy: 'usr-1',
    };
    this.employees.set(emp3.id, emp3);

    const asg3: EmployeeAssignment = {
      id: 'asg-103',
      employeeId: emp3.id,
      companyId: 'comp-101',
      branchId: 'br-1',
      departmentId: 'dept-1',
      designationId: 'desig-3',
      workLocationId: 'loc-1',
      managerId: emp1.id,
      effectiveFrom: '2022-05-15',
      changeReason: 'INITIAL_JOINING',
      notes: 'Engineering management assignment.',
      createdAt: '2022-05-15T09:00:00Z',
      updatedAt: '2022-05-15T09:00:00Z',
      createdBy: 'usr-1',
    };
    this.employeeAssignments.set(asg3.id, asg3);

    // Initial Employee Seed: John Doe (comp-101)
    const emp4: Employee = {
      id: 'emp-104',
      companyId: 'comp-101',
      employeeCode: 'EMP-010',
      firstName: 'John',
      lastName: 'Doe',
      displayName: 'John Doe',
      gender: 'MALE',
      dateOfBirth: '1995-08-20',
      maritalStatus: 'SINGLE',
      nationality: 'American',
      personalEmail: 'johndoe.personal@gmail.com',
      workEmail: 'john.doe@acme-corp.com',
      mobileNumber: '+1 555-0110',
      joiningDate: '2023-02-01',
      probationPeriodMonths: 3,
      noticePeriodDays: 30,
      employmentType: 'FULL_TIME',
      status: 'ACTIVE',
      createdAt: '2023-02-01T09:00:00Z',
      updatedAt: '2023-02-01T09:00:00Z',
      createdBy: 'usr-1',
      updatedBy: 'usr-1',
    };
    this.employees.set(emp4.id, emp4);

    const asg4: EmployeeAssignment = {
      id: 'asg-104',
      employeeId: emp4.id,
      companyId: 'comp-101',
      branchId: 'br-1',
      departmentId: 'dept-1',
      designationId: 'desig-3',
      workLocationId: 'loc-1',
      managerId: emp3.id,
      effectiveFrom: '2023-02-01',
      changeReason: 'INITIAL_JOINING',
      notes: 'Software engineer placement.',
      createdAt: '2023-02-01T09:00:00Z',
      updatedAt: '2023-02-01T09:00:00Z',
      createdBy: 'usr-1',
    };
    this.employeeAssignments.set(asg4.id, asg4);

    // Initial Employee Seed for comp-102: Emily Clark (comp-102 isolation test record)
    const emp5: Employee = {
      id: 'emp-201',
      companyId: 'comp-102',
      employeeCode: 'NEX-001',
      firstName: 'Emily',
      lastName: 'Clark',
      displayName: 'Emily Clark',
      gender: 'FEMALE',
      dateOfBirth: '1992-04-12',
      maritalStatus: 'SINGLE',
      nationality: 'British',
      personalEmail: 'emily.clark@nexus.uk',
      workEmail: 'emily.clark@nexus-tech.co.uk',
      mobileNumber: '+44 20 7946 0991',
      joiningDate: '2023-06-01',
      probationPeriodMonths: 3,
      noticePeriodDays: 60,
      employmentType: 'FULL_TIME',
      status: 'ACTIVE',
      createdAt: '2023-06-01T09:00:00Z',
      updatedAt: '2023-06-01T09:00:00Z',
      createdBy: 'usr-1',
      updatedBy: 'usr-1',
    };
    this.employees.set(emp5.id, emp5);

    const asg5: EmployeeAssignment = {
      id: 'asg-201',
      employeeId: emp5.id,
      companyId: 'comp-102',
      branchId: 'br-3',
      departmentId: 'dept-4',
      designationId: 'desig-5',
      workLocationId: 'loc-3',
      effectiveFrom: '2023-06-01',
      changeReason: 'INITIAL_JOINING',
      notes: 'UK Tech lead assignment.',
      createdAt: '2023-06-01T09:00:00Z',
      updatedAt: '2023-06-01T09:00:00Z',
      createdBy: 'usr-1',
    };
    this.employeeAssignments.set(asg5.id, asg5);

    // =========================================================================
    // PHASE 2A: SHIFTS, BREAKS, WEEKLY OFFS, AND ASSIGNMENTS SEEDING
    // =========================================================================

    // Shift 1: GENERAL (comp-101)
    const s1: Shift = {
      id: 'shift-101',
      companyId: 'comp-101',
      code: 'GENERAL',
      name: 'General Day Shift',
      description: 'Core standard business hours (09:30 to 18:30)',
      startTime: '09:30',
      endTime: '18:30',
      isOvernight: false,
      lateEntryGraceMinutes: 15,
      earlyExitGraceMinutes: 15,
      lateAllowed: true,
      earlyExitAllowed: true,
      halfDayHours: 4.5,
      fullDayHours: 8.0,
      color: '#3B82F6',
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      createdBy: 'usr-1',
      updatedBy: 'usr-1',
    };
    this.shifts.set(s1.id, s1);

    const sb1: ShiftBreak = {
      id: 'brk-101-1',
      shiftId: 'shift-101',
      companyId: 'comp-101',
      breakName: 'Lunch Break',
      startTime: '13:00',
      endTime: '14:00',
      durationMinutes: 60,
      isPaid: false,
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    this.shiftBreaks.set(sb1.id, sb1);

    const wo1: WeeklyOffRule = {
      id: 'wo-101-1',
      companyId: 'comp-101',
      shiftId: 'shift-101',
      name: 'Sunday + Alt Saturday Off',
      daysOfWeek: ['SUNDAY'],
      alternateSaturday: true,
      isDefault: true,
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    this.weeklyOffRules.set(wo1.id, wo1);

    // Shift 2: MORNING (comp-101)
    const s2: Shift = {
      id: 'shift-102',
      companyId: 'comp-101',
      code: 'MORNING',
      name: 'Morning Shift',
      description: 'Early operations & facility logistics (06:00 to 15:00)',
      startTime: '06:00',
      endTime: '15:00',
      isOvernight: false,
      lateEntryGraceMinutes: 15,
      earlyExitGraceMinutes: 15,
      lateAllowed: true,
      earlyExitAllowed: true,
      halfDayHours: 4.5,
      fullDayHours: 8.0,
      color: '#10B981',
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      createdBy: 'usr-1',
      updatedBy: 'usr-1',
    };
    this.shifts.set(s2.id, s2);

    const b2_1: ShiftBreak = {
      id: 'brk-102-1',
      shiftId: 'shift-102',
      companyId: 'comp-101',
      breakName: 'Breakfast Break',
      startTime: '09:00',
      endTime: '09:30',
      durationMinutes: 30,
      isPaid: true,
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    const b2_2: ShiftBreak = {
      id: 'brk-102-2',
      shiftId: 'shift-102',
      companyId: 'comp-101',
      breakName: 'Lunch Break',
      startTime: '12:30',
      endTime: '13:00',
      durationMinutes: 30,
      isPaid: false,
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    this.shiftBreaks.set(b2_1.id, b2_1);
    this.shiftBreaks.set(b2_2.id, b2_2);

    const wo2: WeeklyOffRule = {
      id: 'wo-101-2',
      companyId: 'comp-101',
      shiftId: 'shift-102',
      name: 'Sunday Weekly Off',
      daysOfWeek: ['SUNDAY'],
      alternateSaturday: false,
      isDefault: false,
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    this.weeklyOffRules.set(wo2.id, wo2);

    // Shift 3: NIGHT (comp-101) - Overnight Shift 21:00 -> 06:00
    const s3: Shift = {
      id: 'shift-103',
      companyId: 'comp-101',
      code: 'NIGHT',
      name: 'Night Shift (Overnight)',
      description: 'Overnight technical support & server infrastructure (21:00 to 06:00)',
      startTime: '21:00',
      endTime: '06:00',
      isOvernight: true,
      lateEntryGraceMinutes: 15,
      earlyExitGraceMinutes: 15,
      lateAllowed: true,
      earlyExitAllowed: true,
      halfDayHours: 4.5,
      fullDayHours: 8.0,
      color: '#6366F1',
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      createdBy: 'usr-1',
      updatedBy: 'usr-1',
    };
    this.shifts.set(s3.id, s3);

    const sb3: ShiftBreak = {
      id: 'brk-103-1',
      shiftId: 'shift-103',
      companyId: 'comp-101',
      breakName: 'Midnight Meal Break',
      startTime: '01:00',
      endTime: '01:45',
      durationMinutes: 45,
      isPaid: false,
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    this.shiftBreaks.set(sb3.id, sb3);

    const wo3: WeeklyOffRule = {
      id: 'wo-101-3',
      companyId: 'comp-101',
      shiftId: 'shift-103',
      name: 'Sunday Weekly Off',
      daysOfWeek: ['SUNDAY'],
      alternateSaturday: false,
      isDefault: false,
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    this.weeklyOffRules.set(wo3.id, wo3);

    // Shift 4: UK_GENERAL (comp-102)
    const s4: Shift = {
      id: 'shift-201',
      companyId: 'comp-102',
      code: 'UK_GENERAL',
      name: 'UK Core Standard',
      description: 'UK standard business operations (09:00 to 17:30)',
      startTime: '09:00',
      endTime: '17:30',
      isOvernight: false,
      lateEntryGraceMinutes: 10,
      earlyExitGraceMinutes: 10,
      lateAllowed: true,
      earlyExitAllowed: true,
      halfDayHours: 4.0,
      fullDayHours: 7.5,
      color: '#0EA5E9',
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      createdBy: 'usr-1',
      updatedBy: 'usr-1',
    };
    this.shifts.set(s4.id, s4);

    const sb4: ShiftBreak = {
      id: 'brk-201-1',
      shiftId: 'shift-201',
      companyId: 'comp-102',
      breakName: 'Lunch Break',
      startTime: '12:30',
      endTime: '13:30',
      durationMinutes: 60,
      isPaid: false,
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    this.shiftBreaks.set(sb4.id, sb4);

    const wo4: WeeklyOffRule = {
      id: 'wo-201-1',
      companyId: 'comp-102',
      shiftId: 'shift-201',
      name: 'UK Weekend Off (Sat + Sun)',
      daysOfWeek: ['SATURDAY', 'SUNDAY'],
      alternateSaturday: false,
      isDefault: true,
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    this.weeklyOffRules.set(wo4.id, wo4);

    // Initial Employee Shift Assignments
    const esa1: EmployeeShiftAssignment = {
      id: 'esa-101',
      employeeId: 'emp-101',
      companyId: 'comp-101',
      shiftId: 'shift-101',
      effectiveFrom: '2026-01-10',
      assignmentType: 'PERMANENT',
      reason: 'Initial onboarding assignment to General Shift.',
      status: 'ACTIVE',
      createdAt: '2026-01-10T08:00:00Z',
      updatedAt: '2026-01-10T08:00:00Z',
      createdBy: 'usr-1',
      updatedBy: 'usr-1',
    };
    const esa2: EmployeeShiftAssignment = {
      id: 'esa-102',
      employeeId: 'emp-102',
      companyId: 'comp-101',
      shiftId: 'shift-101',
      effectiveFrom: '2026-01-15',
      assignmentType: 'PERMANENT',
      reason: 'Initial onboarding assignment to General Shift.',
      status: 'ACTIVE',
      createdAt: '2026-01-15T08:00:00Z',
      updatedAt: '2026-01-15T08:00:00Z',
      createdBy: 'usr-1',
      updatedBy: 'usr-1',
    };
    const esa3: EmployeeShiftAssignment = {
      id: 'esa-103',
      employeeId: 'emp-103',
      companyId: 'comp-101',
      shiftId: 'shift-102',
      effectiveFrom: '2026-02-01',
      assignmentType: 'PERMANENT',
      reason: 'Operations morning shift schedule.',
      status: 'ACTIVE',
      createdAt: '2026-02-01T08:00:00Z',
      updatedAt: '2026-02-01T08:00:00Z',
      createdBy: 'usr-1',
      updatedBy: 'usr-1',
    };
    const esa4: EmployeeShiftAssignment = {
      id: 'esa-104',
      employeeId: 'emp-104',
      companyId: 'comp-101',
      shiftId: 'shift-101',
      effectiveFrom: '2026-02-15',
      assignmentType: 'PERMANENT',
      reason: 'Design lead standard schedule.',
      status: 'ACTIVE',
      createdAt: '2026-02-15T08:00:00Z',
      updatedAt: '2026-02-15T08:00:00Z',
      createdBy: 'usr-1',
      updatedBy: 'usr-1',
    };
    const esa5: EmployeeShiftAssignment = {
      id: 'esa-201',
      employeeId: 'emp-201',
      companyId: 'comp-102',
      shiftId: 'shift-201',
      effectiveFrom: '2023-06-01',
      assignmentType: 'PERMANENT',
      reason: 'UK Tech lead standard shift.',
      status: 'ACTIVE',
      createdAt: '2023-06-01T09:00:00Z',
      updatedAt: '2023-06-01T09:00:00Z',
      createdBy: 'usr-1',
      updatedBy: 'usr-1',
    };

    this.employeeShiftAssignments.set(esa1.id, esa1);
    this.employeeShiftAssignments.set(esa2.id, esa2);
    this.employeeShiftAssignments.set(esa3.id, esa3);
    this.employeeShiftAssignments.set(esa4.id, esa4);
    this.employeeShiftAssignments.set(esa5.id, esa5);

    // 8. Phase 2B Attendance Seed Data
    this.seedInitialAttendanceData();
  }

  public seedInitialAttendanceData(): void {
    // Seed sample raw punches and daily attendance for past working days in August 2026
    // August 2026: 
    // 2026-08-01: Saturday (1st Saturday - working)
    // 2026-08-02: Sunday (Weekly Off)
    // 2026-08-03 to 2026-08-07: Mon-Fri (Working)
    // 2026-08-08: Saturday (2nd Saturday - Weekly Off)
    // 2026-08-09: Sunday (Weekly Off)
    // 2026-08-10 to 2026-08-14: Mon-Fri (Working)
    // 2026-08-15: Saturday (Independence Day - HOLIDAY)

    const empList = ['emp-101', 'emp-102', 'emp-103', 'emp-104'];

    // Seed for 2026-08-10 (Monday - Present / Normal)
    const p1: AttendancePunch = {
      id: 'pnch-101-1',
      companyId: 'comp-101',
      employeeId: 'emp-101',
      punchTime: '2026-08-10T09:28:00Z',
      punchType: 'CHECK_IN',
      source: 'WEB',
      createdAt: '2026-08-10T09:28:00Z',
      createdBy: 'usr-1',
    };
    const p2: AttendancePunch = {
      id: 'pnch-101-2',
      companyId: 'comp-101',
      employeeId: 'emp-101',
      punchTime: '2026-08-10T18:35:00Z',
      punchType: 'CHECK_OUT',
      source: 'WEB',
      createdAt: '2026-08-10T18:35:00Z',
      createdBy: 'usr-1',
    };
    this.attendancePunches.set(p1.id, p1);
    this.attendancePunches.set(p2.id, p2);

    const da1: DailyAttendance = {
      id: 'da-101-20260810',
      companyId: 'comp-101',
      employeeId: 'emp-101',
      attendanceDate: '2026-08-10',
      shiftId: 'shift-101',
      shiftCode: 'GEN',
      shiftName: 'General Day Shift',
      scheduledStart: '09:30',
      scheduledEnd: '18:30',
      isOvernight: false,
      firstCheckIn: '2026-08-10T09:28:00Z',
      lastCheckOut: '2026-08-10T18:35:00Z',
      grossWorkMinutes: 547,
      breakMinutes: 60,
      netWorkMinutes: 487, // > 480 mins (8 hours) -> PRESENT
      lateMinutes: 0,
      earlyExitMinutes: 0,
      status: 'PRESENT',
      calculationStatus: 'CALCULATED',
      isLate: false,
      isEarlyExit: false,
      isHalfDay: false,
      isHoliday: false,
      isWeeklyOff: false,
      isOnLeave: false,
      hasException: false,
      calculationVersion: 1,
      calculatedAt: '2026-08-10T18:35:00Z',
      updatedAt: '2026-08-10T18:35:00Z',
    };
    this.dailyAttendance.set(da1.id, da1);

    // 2026-08-11 (Tuesday - Late Arrival by 25 mins)
    const p3: AttendancePunch = {
      id: 'pnch-101-3',
      companyId: 'comp-101',
      employeeId: 'emp-101',
      punchTime: '2026-08-11T09:55:00Z', // 25 mins past 09:30, grace is 15 -> late 25 mins
      punchType: 'CHECK_IN',
      source: 'MOBILE',
      createdAt: '2026-08-11T09:55:00Z',
      createdBy: 'usr-1',
    };
    const p4: AttendancePunch = {
      id: 'pnch-101-4',
      companyId: 'comp-101',
      employeeId: 'emp-101',
      punchTime: '2026-08-11T18:40:00Z',
      punchType: 'CHECK_OUT',
      source: 'MOBILE',
      createdAt: '2026-08-11T18:40:00Z',
      createdBy: 'usr-1',
    };
    this.attendancePunches.set(p3.id, p3);
    this.attendancePunches.set(p4.id, p4);

    const da2: DailyAttendance = {
      id: 'da-101-20260811',
      companyId: 'comp-101',
      employeeId: 'emp-101',
      attendanceDate: '2026-08-11',
      shiftId: 'shift-101',
      shiftCode: 'GEN',
      shiftName: 'General Day Shift',
      scheduledStart: '09:30',
      scheduledEnd: '18:30',
      isOvernight: false,
      firstCheckIn: '2026-08-11T09:55:00Z',
      lastCheckOut: '2026-08-11T18:40:00Z',
      grossWorkMinutes: 525,
      breakMinutes: 60,
      netWorkMinutes: 465,
      lateMinutes: 25,
      earlyExitMinutes: 0,
      status: 'PRESENT',
      calculationStatus: 'CALCULATED',
      isLate: true,
      isEarlyExit: false,
      isHalfDay: false,
      isHoliday: false,
      isWeeklyOff: false,
      isOnLeave: false,
      hasException: true,
      exceptionType: 'LATE_ARRIVAL',
      calculationVersion: 1,
      calculatedAt: '2026-08-11T18:40:00Z',
      updatedAt: '2026-08-11T18:40:00Z',
    };
    this.dailyAttendance.set(da2.id, da2);

    // 2026-08-12 (Wednesday - Missing Check-out punch / Incomplete)
    const p5: AttendancePunch = {
      id: 'pnch-101-5',
      companyId: 'comp-101',
      employeeId: 'emp-101',
      punchTime: '2026-08-12T09:30:00Z',
      punchType: 'CHECK_IN',
      source: 'WEB',
      createdAt: '2026-08-12T09:30:00Z',
      createdBy: 'usr-1',
    };
    this.attendancePunches.set(p5.id, p5);

    const da3: DailyAttendance = {
      id: 'da-101-20260812',
      companyId: 'comp-101',
      employeeId: 'emp-101',
      attendanceDate: '2026-08-12',
      shiftId: 'shift-101',
      shiftCode: 'GEN',
      shiftName: 'General Day Shift',
      scheduledStart: '09:30',
      scheduledEnd: '18:30',
      isOvernight: false,
      firstCheckIn: '2026-08-12T09:30:00Z',
      grossWorkMinutes: 0,
      breakMinutes: 0,
      netWorkMinutes: 0,
      lateMinutes: 0,
      earlyExitMinutes: 0,
      status: 'INCOMPLETE',
      calculationStatus: 'CALCULATED',
      isLate: false,
      isEarlyExit: false,
      isHalfDay: false,
      isHoliday: false,
      isWeeklyOff: false,
      isOnLeave: false,
      hasException: true,
      exceptionType: 'MISSING_OUT',
      calculationVersion: 1,
      calculatedAt: '2026-08-12T18:30:00Z',
      updatedAt: '2026-08-12T18:30:00Z',
    };
    this.dailyAttendance.set(da3.id, da3);

    // Regularization request for 2026-08-12 missing checkout
    const reg1: AttendanceRegularizationRequest = {
      id: 'reg-101-1',
      companyId: 'comp-101',
      employeeId: 'emp-101',
      attendanceDate: '2026-08-12',
      requestedCheckIn: '2026-08-12T09:30:00Z',
      requestedCheckOut: '2026-08-12T18:30:00Z',
      reason: 'Biometric/Web punch missed due to client deployment.',
      reasonDetails: 'Worked continuously at client data center until 18:30.',
      status: 'PENDING',
      createdAt: '2026-08-13T09:00:00Z',
      updatedAt: '2026-08-13T09:00:00Z',
      createdBy: 'usr-1',
    };
    this.attendanceRegularizationRequests.set(reg1.id, reg1);

    // 2026-08-13 (Thursday - Half Day - checked out early at 14:00)
    const p6: AttendancePunch = {
      id: 'pnch-101-6',
      companyId: 'comp-101',
      employeeId: 'emp-101',
      punchTime: '2026-08-13T09:30:00Z',
      punchType: 'CHECK_IN',
      source: 'WEB',
      createdAt: '2026-08-13T09:30:00Z',
      createdBy: 'usr-1',
    };
    const p7: AttendancePunch = {
      id: 'pnch-101-7',
      companyId: 'comp-101',
      employeeId: 'emp-101',
      punchTime: '2026-08-13T14:30:00Z',
      punchType: 'CHECK_OUT',
      source: 'WEB',
      createdAt: '2026-08-13T14:30:00Z',
      createdBy: 'usr-1',
    };
    this.attendancePunches.set(p6.id, p6);
    this.attendancePunches.set(p7.id, p7);

    const da4: DailyAttendance = {
      id: 'da-101-20260813',
      companyId: 'comp-101',
      employeeId: 'emp-101',
      attendanceDate: '2026-08-13',
      shiftId: 'shift-101',
      shiftCode: 'GEN',
      shiftName: 'General Day Shift',
      scheduledStart: '09:30',
      scheduledEnd: '18:30',
      isOvernight: false,
      firstCheckIn: '2026-08-13T09:30:00Z',
      lastCheckOut: '2026-08-13T14:30:00Z',
      grossWorkMinutes: 300,
      breakMinutes: 0,
      netWorkMinutes: 300, // 5 hours (>= 4.5 hrs halfDayHours, < 8 hrs fullDayHours)
      lateMinutes: 0,
      earlyExitMinutes: 240,
      status: 'HALF_DAY',
      calculationStatus: 'CALCULATED',
      isLate: false,
      isEarlyExit: true,
      isHalfDay: true,
      isHoliday: false,
      isWeeklyOff: false,
      isOnLeave: false,
      hasException: true,
      exceptionType: 'EARLY_EXIT',
      calculationVersion: 1,
      calculatedAt: '2026-08-13T14:30:00Z',
      updatedAt: '2026-08-13T14:30:00Z',
    };
    this.dailyAttendance.set(da4.id, da4);

    // 2026-08-14 (Friday - Today - Checked in at 09:25)
    const p8: AttendancePunch = {
      id: 'pnch-101-8',
      companyId: 'comp-101',
      employeeId: 'emp-101',
      punchTime: '2026-08-14T09:25:00Z',
      punchType: 'CHECK_IN',
      source: 'ESS',
      createdAt: '2026-08-14T09:25:00Z',
      createdBy: 'usr-1',
    };
    this.attendancePunches.set(p8.id, p8);

    const da5: DailyAttendance = {
      id: 'da-101-20260814',
      companyId: 'comp-101',
      employeeId: 'emp-101',
      attendanceDate: '2026-08-14',
      shiftId: 'shift-101',
      shiftCode: 'GEN',
      shiftName: 'General Day Shift',
      scheduledStart: '09:30',
      scheduledEnd: '18:30',
      isOvernight: false,
      firstCheckIn: '2026-08-14T09:25:00Z',
      grossWorkMinutes: 0,
      breakMinutes: 0,
      netWorkMinutes: 0,
      lateMinutes: 0,
      earlyExitMinutes: 0,
      status: 'PRESENT',
      calculationStatus: 'CALCULATED',
      isLate: false,
      isEarlyExit: false,
      isHalfDay: false,
      isHoliday: false,
      isWeeklyOff: false,
      isOnLeave: false,
      hasException: false,
      calculationVersion: 1,
      calculatedAt: '2026-08-14T09:25:00Z',
      updatedAt: '2026-08-14T09:25:00Z',
    };
    this.dailyAttendance.set(da5.id, da5);

    // Seed other employees for 2026-08-14 (Today)
    // EMP-102 (Sarah Jenkins)
    const p102_1: AttendancePunch = {
      id: 'pnch-102-1',
      companyId: 'comp-101',
      employeeId: 'emp-102',
      punchTime: '2026-08-14T09:20:00Z',
      punchType: 'CHECK_IN',
      source: 'WEB',
      createdAt: '2026-08-14T09:20:00Z',
    };
    this.attendancePunches.set(p102_1.id, p102_1);
    this.dailyAttendance.set('da-102-20260814', {
      id: 'da-102-20260814',
      companyId: 'comp-101',
      employeeId: 'emp-102',
      attendanceDate: '2026-08-14',
      shiftId: 'shift-101',
      shiftCode: 'GEN',
      shiftName: 'General Day Shift',
      scheduledStart: '09:30',
      scheduledEnd: '18:30',
      isOvernight: false,
      firstCheckIn: '2026-08-14T09:20:00Z',
      grossWorkMinutes: 0,
      breakMinutes: 0,
      netWorkMinutes: 0,
      lateMinutes: 0,
      earlyExitMinutes: 0,
      status: 'PRESENT',
      calculationStatus: 'CALCULATED',
      isLate: false,
      isEarlyExit: false,
      isHalfDay: false,
      isHoliday: false,
      isWeeklyOff: false,
      isOnLeave: false,
      hasException: false,
      calculationVersion: 1,
      calculatedAt: '2026-08-14T09:20:00Z',
      updatedAt: '2026-08-14T09:20:00Z',
    });

    // EMP-103 (Robert Vance - Morning Shift 06:00 to 14:30)
    const p103_1: AttendancePunch = {
      id: 'pnch-103-1',
      companyId: 'comp-101',
      employeeId: 'emp-103',
      punchTime: '2026-08-14T06:02:00Z',
      punchType: 'CHECK_IN',
      source: 'BIOMETRIC',
      createdAt: '2026-08-14T06:02:00Z',
    };
    const p103_2: AttendancePunch = {
      id: 'pnch-103-2',
      companyId: 'comp-101',
      employeeId: 'emp-103',
      punchTime: '2026-08-14T14:35:00Z',
      punchType: 'CHECK_OUT',
      source: 'BIOMETRIC',
      createdAt: '2026-08-14T14:35:00Z',
    };
    this.attendancePunches.set(p103_1.id, p103_1);
    this.attendancePunches.set(p103_2.id, p103_2);
    this.dailyAttendance.set('da-103-20260814', {
      id: 'da-103-20260814',
      companyId: 'comp-101',
      employeeId: 'emp-103',
      attendanceDate: '2026-08-14',
      shiftId: 'shift-102',
      shiftCode: 'MOR',
      shiftName: 'Morning Shift',
      scheduledStart: '06:00',
      scheduledEnd: '14:30',
      isOvernight: false,
      firstCheckIn: '2026-08-14T06:02:00Z',
      lastCheckOut: '2026-08-14T14:35:00Z',
      grossWorkMinutes: 513,
      breakMinutes: 30, // Unpaid lunch
      netWorkMinutes: 483,
      lateMinutes: 0,
      earlyExitMinutes: 0,
      status: 'PRESENT',
      calculationStatus: 'CALCULATED',
      isLate: false,
      isEarlyExit: false,
      isHalfDay: false,
      isHoliday: false,
      isWeeklyOff: false,
      isOnLeave: false,
      hasException: false,
      calculationVersion: 1,
      calculatedAt: '2026-08-14T14:35:00Z',
      updatedAt: '2026-08-14T14:35:00Z',
    });

    // EMP-104 (Elena Rostova - Absent today / not checked in)
    this.dailyAttendance.set('da-104-20260814', {
      id: 'da-104-20260814',
      companyId: 'comp-101',
      employeeId: 'emp-104',
      attendanceDate: '2026-08-14',
      shiftId: 'shift-101',
      shiftCode: 'GEN',
      shiftName: 'General Day Shift',
      scheduledStart: '09:30',
      scheduledEnd: '18:30',
      isOvernight: false,
      grossWorkMinutes: 0,
      breakMinutes: 0,
      netWorkMinutes: 0,
      lateMinutes: 0,
      earlyExitMinutes: 0,
      status: 'ABSENT',
      calculationStatus: 'CALCULATED',
      isLate: false,
      isEarlyExit: false,
      isHalfDay: false,
      isHoliday: false,
      isWeeklyOff: false,
      isOnLeave: false,
      hasException: true,
      exceptionType: 'MISSING_IN',
      calculationVersion: 1,
      calculatedAt: '2026-08-14T09:30:00Z',
      updatedAt: '2026-08-14T09:30:00Z',
    });

    // 14. Phase 2C Overtime Policies
    const otPolicy1: OvertimePolicy = {
      id: 'otp-101',
      companyId: 'comp-101',
      code: 'STD_OT_POLICY',
      name: 'Standard Overtime Policy',
      minQualifyingMinutes: 30,
      roundingIntervalMinutes: 15,
      maxDailyOtMinutes: 240,
      maxMonthlyOtMinutes: 3600,
      preApprovalRequired: false,
      postApprovalAllowed: true,
      weeklyOffEligible: true,
      holidayEligible: true,
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-08-01T00:00:00Z',
      createdBy: 'usr-1',
    };

    const otPolicy2: OvertimePolicy = {
      id: 'otp-102',
      companyId: 'comp-102',
      code: 'NEXUS_OT_POLICY',
      name: 'Nexus Standard Overtime Policy',
      minQualifyingMinutes: 30,
      roundingIntervalMinutes: 15,
      maxDailyOtMinutes: 180,
      maxMonthlyOtMinutes: 2400,
      preApprovalRequired: false,
      postApprovalAllowed: true,
      weeklyOffEligible: true,
      holidayEligible: true,
      status: 'ACTIVE',
      createdAt: '2026-03-01T00:00:00Z',
      updatedAt: '2026-08-01T00:00:00Z',
      createdBy: 'usr-1',
    };

    this.overtimePolicies.set(otPolicy1.id, otPolicy1);
    this.overtimePolicies.set(otPolicy2.id, otPolicy2);

    // 15. Phase 2C Attendance Periods
    // Acme Comp-101: August 2026 (Open / Under Review)
    const periodAugComp1: AttendancePeriod = {
      id: 'period-comp101-202608',
      companyId: 'comp-101',
      code: 'AUG-2026',
      name: 'August 2026 Attendance Period',
      year: 2026,
      month: 8,
      startDate: '2026-08-01',
      endDate: '2026-08-31',
      status: 'OPEN',
      lockVersion: 1,
      createdAt: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-14T00:00:00Z',
      createdBy: 'usr-1',
    };

    // Acme Comp-101: July 2026 (Finalized & Locked)
    const periodJulComp1: AttendancePeriod = {
      id: 'period-comp101-202607',
      companyId: 'comp-101',
      code: 'JUL-2026',
      name: 'July 2026 Attendance Period',
      year: 2026,
      month: 7,
      startDate: '2026-07-01',
      endDate: '2026-07-31',
      status: 'FINALIZED',
      finalizedAt: '2026-08-02T10:00:00Z',
      finalizedBy: 'usr-1',
      finalizedByName: 'Alexander Vance',
      lockVersion: 1,
      createdAt: '2026-07-01T00:00:00Z',
      updatedAt: '2026-08-02T10:00:00Z',
      createdBy: 'usr-1',
    };

    // Nexus Comp-102: August 2026 (Open)
    const periodAugComp2: AttendancePeriod = {
      id: 'period-comp102-202608',
      companyId: 'comp-102',
      code: 'AUG-2026',
      name: 'August 2026 Attendance Period',
      year: 2026,
      month: 8,
      startDate: '2026-08-01',
      endDate: '2026-08-31',
      status: 'OPEN',
      lockVersion: 1,
      createdAt: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-14T00:00:00Z',
      createdBy: 'usr-1',
    };

    this.attendancePeriods.set(periodAugComp1.id, periodAugComp1);
    this.attendancePeriods.set(periodJulComp1.id, periodJulComp1);
    this.attendancePeriods.set(periodAugComp2.id, periodAugComp2);

    // 16. July 2026 Finalized Summaries for Comp-101
    const julSummaryEmp101: AttendancePeriodSummary = {
      id: 'sum-jul-emp101',
      companyId: 'comp-101',
      periodId: 'period-comp101-202607',
      employeeId: 'emp-101',
      calendarDays: 31,
      scheduledWorkDays: 22,
      presentDays: 22,
      absentDays: 0,
      halfDays: 0,
      weeklyOffDays: 8,
      holidayDays: 1,
      missingPunchDays: 0,
      attendanceEquivalentDays: 31,
      paidLeaveDays: null,
      unpaidLeaveDays: null,
      lossOfPayDays: null,
      payableDays: null,
      leaveIntegrationStatus: 'PENDING_LEAVE_INTEGRATION',
      lateArrivalsCount: 0,
      earlyExitsCount: 0,
      totalLateMinutes: 0,
      totalEarlyExitMinutes: 0,
      totalGrossWorkMinutes: 11880,
      totalNetWorkMinutes: 10560,
      calculatedOvertimeMinutes: 120,
      approvedOvertimeMinutes: 120,
      status: 'FINALIZED',
      version: 1,
      finalizedAt: '2026-08-02T10:00:00Z',
      createdAt: '2026-08-02T10:00:00Z',
      updatedAt: '2026-08-02T10:00:00Z',
    };

    const julSummaryEmp102: AttendancePeriodSummary = {
      id: 'sum-jul-emp102',
      companyId: 'comp-101',
      periodId: 'period-comp101-202607',
      employeeId: 'emp-102',
      calendarDays: 31,
      scheduledWorkDays: 22,
      presentDays: 21,
      absentDays: 1,
      halfDays: 0,
      weeklyOffDays: 8,
      holidayDays: 1,
      missingPunchDays: 0,
      attendanceEquivalentDays: 30,
      paidLeaveDays: null,
      unpaidLeaveDays: null,
      lossOfPayDays: null,
      payableDays: null,
      leaveIntegrationStatus: 'PENDING_LEAVE_INTEGRATION',
      lateArrivalsCount: 1,
      earlyExitsCount: 0,
      totalLateMinutes: 18,
      totalEarlyExitMinutes: 0,
      totalGrossWorkMinutes: 11340,
      totalNetWorkMinutes: 10080,
      calculatedOvertimeMinutes: 0,
      approvedOvertimeMinutes: 0,
      status: 'FINALIZED',
      version: 1,
      finalizedAt: '2026-08-02T10:00:00Z',
      createdAt: '2026-08-02T10:00:00Z',
      updatedAt: '2026-08-02T10:00:00Z',
    };

    this.attendancePeriodSummaries.set(julSummaryEmp101.id, julSummaryEmp101);
    this.attendancePeriodSummaries.set(julSummaryEmp102.id, julSummaryEmp102);

    // 17. Sample Overtime Request for Aug 13, 2026 (EMP-101 worked till 20:00, eligible 90m)
    const otReq1: OvertimeRequest = {
      id: 'ot-101-20260813',
      companyId: 'comp-101',
      employeeId: 'emp-101',
      attendanceDate: '2026-08-13',
      dailyAttendanceId: 'da-101-20260813',
      calculatedMinutes: 90,
      requestedMinutes: 90,
      approvedMinutes: 90,
      reason: 'Critical cloud database migration deployment and production release monitoring.',
      status: 'APPROVED',
      approverId: 'emp-103',
      approverComments: 'Approved. Critical release support verified.',
      actionedAt: '2026-08-14T08:30:00Z',
      createdAt: '2026-08-13T20:15:00Z',
      updatedAt: '2026-08-14T08:30:00Z',
      createdBy: 'usr-1',
    };

    this.overtimeRequests.set(otReq1.id, otReq1);

    // Link OT to daily attendance
    const da101Aug13 = this.dailyAttendance.get('da-101-20260813');
    if (da101Aug13) {
      da101Aug13.calculatedOvertimeMinutes = 90;
      da101Aug13.approvedOvertimeMinutes = 90;
      da101Aug13.overtimeRequestId = otReq1.id;
    }

    // 18. Phase 3A Leave Years Master (2026 Calendar Year)
    const ly2026Comp101: LeaveYear = {
      id: 'ly-comp101-2026',
      companyId: 'comp-101',
      code: 'LY-2026',
      name: 'Calendar Year 2026',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      status: 'ACTIVE',
      isDefault: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      createdBy: 'usr-1',
    };
    const ly2026Comp102: LeaveYear = {
      id: 'ly-comp102-2026',
      companyId: 'comp-102',
      code: 'LY-2026',
      name: 'Calendar Year 2026',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      status: 'ACTIVE',
      isDefault: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      createdBy: 'usr-1',
    };
    this.leaveYears.set(ly2026Comp101.id, ly2026Comp101);
    this.leaveYears.set(ly2026Comp102.id, ly2026Comp102);

    // 19. Phase 3A Leave Types Master (CL, SL, PL, UL, ML, COMP_OFF)
    const ltCL: LeaveType = {
      id: 'lt-comp101-cl',
      companyId: 'comp-101',
      code: 'CL',
      name: 'Casual Leave',
      description: 'Short-duration paid leave for personal urgent matters and short errands.',
      category: 'CASUAL',
      paidType: 'PAID',
      unit: 'HALF_DAY',
      color: '#3B82F6', // Blue
      requiresReason: true,
      requiresAttachment: false,
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      createdBy: 'usr-1',
    };

    const ltSL: LeaveType = {
      id: 'lt-comp101-sl',
      companyId: 'comp-101',
      code: 'SL',
      name: 'Sick Leave',
      description: 'Medical and health recuperation leave.',
      category: 'SICK',
      paidType: 'PAID',
      unit: 'HALF_DAY',
      color: '#EF4444', // Red
      requiresReason: true,
      requiresAttachment: true,
      attachmentThresholdDays: 2.0,
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      createdBy: 'usr-1',
    };

    const ltPL: LeaveType = {
      id: 'lt-comp101-pl',
      companyId: 'comp-101',
      code: 'PL',
      name: 'Privilege Leave',
      description: 'Annual earned vacation leave.',
      category: 'PRIVILEGE',
      paidType: 'PAID',
      unit: 'FULL_DAY',
      color: '#10B981', // Emerald Green
      requiresReason: true,
      requiresAttachment: false,
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      createdBy: 'usr-1',
    };

    const ltUL: LeaveType = {
      id: 'lt-comp101-ul',
      companyId: 'comp-101',
      code: 'UL',
      name: 'Unpaid Leave (Loss of Pay)',
      description: 'Unpaid leave when paid leave quotas are exhausted.',
      category: 'UNPAID',
      paidType: 'UNPAID',
      unit: 'HALF_DAY',
      color: '#6B7280', // Gray
      requiresReason: true,
      requiresAttachment: false,
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      createdBy: 'usr-1',
    };

    const ltML: LeaveType = {
      id: 'lt-comp101-ml',
      companyId: 'comp-101',
      code: 'ML',
      name: 'Maternity Leave',
      description: 'Statutory maternity leave for female employees.',
      category: 'MATERNITY',
      paidType: 'PAID',
      unit: 'FULL_DAY',
      color: '#EC4899', // Pink
      requiresReason: true,
      requiresAttachment: true,
      attachmentThresholdDays: 1.0,
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      createdBy: 'usr-1',
    };

    const ltCompOff: LeaveType = {
      id: 'lt-comp101-compoff',
      companyId: 'comp-101',
      code: 'COMP_OFF',
      name: 'Compensatory Off',
      description: 'Compensatory leave earned by working on scheduled weekly offs or holidays.',
      category: 'COMP_OFF',
      paidType: 'PAID',
      unit: 'HALF_DAY',
      color: '#8B5CF6', // Purple
      requiresReason: true,
      requiresAttachment: false,
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      createdBy: 'usr-1',
    };

    this.leaveTypes.set(ltCL.id, ltCL);
    this.leaveTypes.set(ltSL.id, ltSL);
    this.leaveTypes.set(ltPL.id, ltPL);
    this.leaveTypes.set(ltUL.id, ltUL);
    this.leaveTypes.set(ltML.id, ltML);
    this.leaveTypes.set(ltCompOff.id, ltCompOff);

    // Company 102 basic leave type
    const ltCLComp102: LeaveType = {
      id: 'lt-comp102-cl',
      companyId: 'comp-102',
      code: 'CL',
      name: 'Casual Leave (Nexus)',
      description: 'Nexus casual leave.',
      category: 'CASUAL',
      paidType: 'PAID',
      unit: 'HALF_DAY',
      color: '#3B82F6',
      requiresReason: true,
      requiresAttachment: false,
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      createdBy: 'usr-1',
    };
    this.leaveTypes.set(ltCLComp102.id, ltCLComp102);

    // 20. Phase 3A Leave Policies Master (Standard Full-Time Policy)
    const polStandard: LeavePolicy = {
      id: 'pol-comp101-std',
      companyId: 'comp-101',
      code: 'POL-STD-2026',
      name: 'Standard Full-Time Leave Policy',
      description: 'Default annual leave policy for confirmed full-time staff in Acme Corp.',
      priority: 1,
      isDefault: true,
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      createdBy: 'usr-1',
    };
    this.leavePolicies.set(polStandard.id, polStandard);

    // 21. Policy Eligibility
    const polStandardElig: LeavePolicyEligibility = {
      id: 'elig-pol-comp101-std',
      companyId: 'comp-101',
      leavePolicyId: polStandard.id,
      employmentTypes: ['FULL_TIME', 'PROBATION'],
      departmentIds: [], // All departments
      designationIds: [], // All designations
      branchIds: [], // All branches
      workLocationIds: [], // All locations
      minServiceDays: 0,
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    this.leavePolicyEligibilities.set(polStandardElig.id, polStandardElig);

    // 22. Policy Rules
    const ruleCL: LeavePolicyRule = {
      id: 'rule-pol-std-cl',
      companyId: 'comp-101',
      leavePolicyId: polStandard.id,
      leaveTypeId: ltCL.id,
      annualEntitlement: 12.0,
      accrualFrequency: 'MONTHLY',
      accrualTiming: 'START_OF_PERIOD',
      prorationRule: 'PRORATE_BY_MONTHS',
      allowCarryForward: false,
      maxCarryForwardDays: 0,
      allowEncashment: false,
      sandwichRuleEnabled: false,
      includeHolidays: false,
      includeWeeklyOffs: false,
      minDaysPerRequest: 0.5,
      maxConsecutiveDays: 3.0,
      maxRequestsPerMonth: 2,
      maxAdvanceDays: 60,
      allowBackdated: true,
      maxBackdatedDays: 3,
      allowNegativeBalance: false,
      negativeBalanceLimit: 0,
      requiresAttachment: false,
      minServiceDaysRequired: 0,
      allowDuringProbation: true,
      applicableGender: 'ALL',
      applicableMaritalStatus: 'ALL',
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    const ruleSL: LeavePolicyRule = {
      id: 'rule-pol-std-sl',
      companyId: 'comp-101',
      leavePolicyId: polStandard.id,
      leaveTypeId: ltSL.id,
      annualEntitlement: 10.0,
      accrualFrequency: 'ANNUAL_UPFRONT',
      accrualTiming: 'START_OF_PERIOD',
      prorationRule: 'PRORATE_BY_DAYS',
      allowCarryForward: true,
      maxCarryForwardDays: 5.0,
      carryForwardExpiryMonths: 12,
      allowEncashment: false,
      sandwichRuleEnabled: false,
      includeHolidays: false,
      includeWeeklyOffs: false,
      minDaysPerRequest: 0.5,
      maxConsecutiveDays: 14.0,
      allowBackdated: true,
      maxBackdatedDays: 7,
      allowNegativeBalance: false,
      negativeBalanceLimit: 0,
      requiresAttachment: true,
      attachmentThresholdDays: 2.0,
      minServiceDaysRequired: 0,
      allowDuringProbation: true,
      applicableGender: 'ALL',
      applicableMaritalStatus: 'ALL',
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    const rulePL: LeavePolicyRule = {
      id: 'rule-pol-std-pl',
      companyId: 'comp-101',
      leavePolicyId: polStandard.id,
      leaveTypeId: ltPL.id,
      annualEntitlement: 15.0,
      accrualFrequency: 'MONTHLY',
      accrualTiming: 'END_OF_PERIOD',
      prorationRule: 'PRORATE_BY_DAYS',
      allowCarryForward: true,
      maxCarryForwardDays: 30.0,
      carryForwardExpiryMonths: 24,
      allowEncashment: true,
      minBalanceForEncashment: 10.0,
      maxEncashmentDaysPerYear: 10.0,
      sandwichRuleEnabled: true,
      includeHolidays: false,
      includeWeeklyOffs: false,
      minDaysPerRequest: 1.0,
      maxConsecutiveDays: 21.0,
      maxAdvanceDays: 90,
      allowBackdated: false,
      maxBackdatedDays: 0,
      allowNegativeBalance: false,
      negativeBalanceLimit: 0,
      requiresAttachment: false,
      minServiceDaysRequired: 90, // Eligible after 90 days of service
      allowDuringProbation: false,
      applicableGender: 'ALL',
      applicableMaritalStatus: 'ALL',
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    const ruleML: LeavePolicyRule = {
      id: 'rule-pol-std-ml',
      companyId: 'comp-101',
      leavePolicyId: polStandard.id,
      leaveTypeId: ltML.id,
      annualEntitlement: 182.0, // 26 weeks statutory maternity
      accrualFrequency: 'ANNUAL_UPFRONT',
      accrualTiming: 'START_OF_PERIOD',
      prorationRule: 'NONE',
      allowCarryForward: false,
      maxCarryForwardDays: 0,
      allowEncashment: false,
      sandwichRuleEnabled: true,
      includeHolidays: true,
      includeWeeklyOffs: true,
      minDaysPerRequest: 14.0,
      maxConsecutiveDays: 182.0,
      allowBackdated: false,
      maxBackdatedDays: 0,
      allowNegativeBalance: false,
      negativeBalanceLimit: 0,
      requiresAttachment: true,
      attachmentThresholdDays: 1.0,
      minServiceDaysRequired: 80, // Statutory min service
      allowDuringProbation: true,
      applicableGender: 'FEMALE',
      applicableMaritalStatus: 'ALL',
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    this.leavePolicyRules.set(ruleCL.id, ruleCL);
    this.leavePolicyRules.set(ruleSL.id, ruleSL);
    this.leavePolicyRules.set(rulePL.id, rulePL);
    this.leavePolicyRules.set(ruleML.id, ruleML);

    // 23. Employee Leave Policy Assignments (Effective-Dated History)
    const assignEmp101: EmployeeLeavePolicyAssignment = {
      id: 'lpa-emp101-std',
      companyId: 'comp-101',
      employeeId: 'emp-101',
      leavePolicyId: polStandard.id,
      effectiveFrom: '2026-01-01',
      effectiveTo: null,
      assignmentReason: 'Initial onboarding assignment to standard company leave policy.',
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      createdBy: 'usr-1',
    };

    const assignEmp102: EmployeeLeavePolicyAssignment = {
      id: 'lpa-emp102-std',
      companyId: 'comp-101',
      employeeId: 'emp-102',
      leavePolicyId: polStandard.id,
      effectiveFrom: '2026-01-01',
      effectiveTo: null,
      assignmentReason: 'Standard corporate policy allocation.',
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      createdBy: 'usr-1',
    };

    this.employeeLeavePolicyAssignments.set(assignEmp101.id, assignEmp101);
    this.employeeLeavePolicyAssignments.set(assignEmp102.id, assignEmp102);

    // 24. Phase 4A Salary Components Master
    const compBasic: SalaryComponent = {
      id: 'sc-basic-101',
      companyId: 'comp-101',
      code: 'BASIC',
      name: 'Basic Salary',
      description: 'Foundational taxable earnings component of salary structure.',
      type: ComponentType.EARNING,
      nature: ComponentNature.FIXED,
      calculationBase: CalculationBase.PERCENTAGE_OF_CTC,
      roundingRule: RoundingRule.ROUND_NEAREST,
      isTaxable: true,
      isPfEligible: true,
      isEsiEligible: true,
      isPtEligible: true,
      isTdsApplicable: true,
      isLopAffected: true,
      displayOrder: 1,
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      createdBy: 'usr-1',
    };

    const compHRA: SalaryComponent = {
      id: 'sc-hra-101',
      companyId: 'comp-101',
      code: 'HRA',
      name: 'House Rent Allowance',
      description: 'Housing rent allowance calculated as percentage of Basic salary.',
      type: ComponentType.EARNING,
      nature: ComponentNature.FIXED,
      calculationBase: CalculationBase.PERCENTAGE_OF_BASIC,
      roundingRule: RoundingRule.ROUND_NEAREST,
      isTaxable: true,
      isPfEligible: false,
      isEsiEligible: true,
      isPtEligible: true,
      isTdsApplicable: true,
      isLopAffected: true,
      displayOrder: 2,
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      createdBy: 'usr-1',
    };

    const compSpecial: SalaryComponent = {
      id: 'sc-special-101',
      companyId: 'comp-101',
      code: 'SPECIAL_ALLOW',
      name: 'Special Allowance',
      description: 'Balancing / flexible allowance component.',
      type: ComponentType.EARNING,
      nature: ComponentNature.FIXED,
      calculationBase: CalculationBase.FLAT_AMOUNT,
      roundingRule: RoundingRule.ROUND_NEAREST,
      isTaxable: true,
      isPfEligible: false,
      isEsiEligible: false,
      isPtEligible: true,
      isTdsApplicable: true,
      isLopAffected: true,
      displayOrder: 3,
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      createdBy: 'usr-1',
    };

    const compMedical: SalaryComponent = {
      id: 'sc-med-101',
      companyId: 'comp-101',
      code: 'MED_ALLOW',
      name: 'Medical Allowance',
      description: 'Fixed monthly medical allowance.',
      type: ComponentType.EARNING,
      nature: ComponentNature.FIXED,
      calculationBase: CalculationBase.FLAT_AMOUNT,
      roundingRule: RoundingRule.ROUND_NEAREST,
      isTaxable: true,
      isPfEligible: false,
      isEsiEligible: false,
      isPtEligible: false,
      isTdsApplicable: true,
      isLopAffected: true,
      displayOrder: 4,
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      createdBy: 'usr-1',
    };

    const compPF: SalaryComponent = {
      id: 'sc-pf-101',
      companyId: 'comp-101',
      code: 'PF_EMP',
      name: 'Provident Fund (Employee)',
      description: 'Statutory Provident Fund employee contribution (12% of Basic).',
      type: ComponentType.DEDUCTION,
      nature: ComponentNature.STATUTORY,
      calculationBase: CalculationBase.PERCENTAGE_OF_BASIC,
      roundingRule: RoundingRule.ROUND_NEAREST,
      isTaxable: false,
      isPfEligible: false,
      isEsiEligible: false,
      isPtEligible: false,
      isTdsApplicable: false,
      isLopAffected: false,
      displayOrder: 5,
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      createdBy: 'usr-1',
    };

    const compPT: SalaryComponent = {
      id: 'sc-pt-101',
      companyId: 'comp-101',
      code: 'PROF_TAX',
      name: 'Professional Tax',
      description: 'Statutory state professional tax deduction.',
      type: ComponentType.DEDUCTION,
      nature: ComponentNature.STATUTORY,
      calculationBase: CalculationBase.FLAT_AMOUNT,
      roundingRule: RoundingRule.ROUND_NEAREST,
      isTaxable: false,
      isPfEligible: false,
      isEsiEligible: false,
      isPtEligible: false,
      isTdsApplicable: false,
      isLopAffected: false,
      displayOrder: 6,
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      createdBy: 'usr-1',
    };

    this.salaryComponents.set(compBasic.id, compBasic);
    this.salaryComponents.set(compHRA.id, compHRA);
    this.salaryComponents.set(compSpecial.id, compSpecial);
    this.salaryComponents.set(compMedical.id, compMedical);
    this.salaryComponents.set(compPF.id, compPF);
    this.salaryComponents.set(compPT.id, compPT);

    // Company B Salary Component (Isolated)
    const compBasicB: SalaryComponent = {
      id: 'sc-basic-102',
      companyId: 'comp-102',
      code: 'BASIC',
      name: 'Basic Pay UK',
      description: 'Base salary for UK operations.',
      type: ComponentType.EARNING,
      nature: ComponentNature.FIXED,
      calculationBase: CalculationBase.PERCENTAGE_OF_CTC,
      roundingRule: RoundingRule.ROUND_NEAREST,
      isTaxable: true,
      isPfEligible: false,
      isEsiEligible: false,
      isPtEligible: false,
      isTdsApplicable: true,
      isLopAffected: true,
      displayOrder: 1,
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      createdBy: 'usr-1',
    };
    this.salaryComponents.set(compBasicB.id, compBasicB);

    // 25. Phase 4A Salary Structure Master & Components
    const structStandard: SalaryStructure = {
      id: 'ss-std-101',
      companyId: 'comp-101',
      code: 'ENG-STANDARD',
      name: 'Standard Corporate Engineering Structure',
      description: 'Standard compensation structure with Basic (40%), HRA (50% of Basic), PF (12% of Basic) and Special Allowance.',
      payFrequency: PayFrequency.MONTHLY,
      currency: 'USD',
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      createdBy: 'usr-1',
    };

    const ssc1: SalaryStructureComponent = {
      id: 'ssc-ss-std-101-1',
      companyId: 'comp-101',
      salaryStructureId: structStandard.id,
      salaryComponentId: compBasic.id,
      calculationType: CalculationBase.PERCENTAGE_OF_CTC,
      factorValue: 0.40, // 40% of CTC
      isMandatory: true,
      allowOverride: false,
      displayOrder: 1,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    const ssc2: SalaryStructureComponent = {
      id: 'ssc-ss-std-101-2',
      companyId: 'comp-101',
      salaryStructureId: structStandard.id,
      salaryComponentId: compHRA.id,
      calculationType: CalculationBase.PERCENTAGE_OF_BASIC,
      factorValue: 0.50, // 50% of Basic
      baseComponentId: compBasic.id,
      isMandatory: true,
      allowOverride: false,
      displayOrder: 2,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    const ssc3: SalaryStructureComponent = {
      id: 'ssc-ss-std-101-3',
      companyId: 'comp-101',
      salaryStructureId: structStandard.id,
      salaryComponentId: compSpecial.id,
      calculationType: CalculationBase.FLAT_AMOUNT,
      factorValue: 1500, // Monthly special allowance default
      isMandatory: false,
      allowOverride: true,
      displayOrder: 3,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    const ssc4: SalaryStructureComponent = {
      id: 'ssc-ss-std-101-4',
      companyId: 'comp-101',
      salaryStructureId: structStandard.id,
      salaryComponentId: compPF.id,
      calculationType: CalculationBase.PERCENTAGE_OF_BASIC,
      factorValue: 0.12, // 12% of Basic deduction
      baseComponentId: compBasic.id,
      isMandatory: true,
      allowOverride: false,
      displayOrder: 4,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    const ssc5: SalaryStructureComponent = {
      id: 'ssc-ss-std-101-5',
      companyId: 'comp-101',
      salaryStructureId: structStandard.id,
      salaryComponentId: compPT.id,
      calculationType: CalculationBase.FLAT_AMOUNT,
      factorValue: 200, // $200 flat professional tax
      isMandatory: true,
      allowOverride: false,
      displayOrder: 5,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    this.salaryStructures.set(structStandard.id, structStandard);
    this.salaryStructureComponents.set(ssc1.id, ssc1);
    this.salaryStructureComponents.set(ssc2.id, ssc2);
    this.salaryStructureComponents.set(ssc3.id, ssc3);
    this.salaryStructureComponents.set(ssc4.id, ssc4);
    this.salaryStructureComponents.set(ssc5.id, ssc5);

    // 26. Phase 4A Payroll Calendar Master & Periods
    const cal2026: PayrollCalendar = {
      id: 'pc-2026-101',
      companyId: 'comp-101',
      code: 'CAL-2026-MONTHLY',
      name: '2026 Standard Monthly Calendar',
      year: 2026,
      payFrequency: PayFrequency.MONTHLY,
      startMonth: 1,
      endMonth: 12,
      cycleStartDay: 1,
      cycleEndDay: 31,
      payDay: 1,
      cutoffDay: 25,
      isDefault: true,
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      createdBy: 'usr-1',
    };
    this.payrollCalendars.set(cal2026.id, cal2026);

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    for (let m = 1; m <= 12; m++) {
      const monthStr = m.toString().padStart(2, '0');
      const pCode = `2026-M${monthStr}`;
      const pName = `${monthNames[m - 1]} 2026`;
      const daysInMonth = new Date(2026, m, 0).getDate();
      const pStart = `2026-${monthStr}-01`;
      const pEnd = `2026-${monthStr}-${daysInMonth.toString().padStart(2, '0')}`;
      const pPay = m < 12 ? `2026-${(m + 1).toString().padStart(2, '0')}-01` : '2027-01-01';
      const pCutoff = `2026-${monthStr}-25`;

      const period: PayrollPeriod = {
        id: `pp-${cal2026.id}-${pCode}`,
        companyId: 'comp-101',
        payrollCalendarId: cal2026.id,
        periodNumber: m,
        periodCode: pCode,
        periodName: pName,
        startDate: pStart,
        endDate: pEnd,
        payDate: pPay,
        cutoffDate: pCutoff,
        status: m < 8 ? PayrollPeriodStatus.CLOSED : (m === 8 ? PayrollPeriodStatus.OPEN : PayrollPeriodStatus.UPCOMING),
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };
      this.payrollPeriods.set(period.id, period);
    }

    // 27. Phase 4A Employee Compensation Assignments (Effective-Dated)
    const compAssignEmp101: EmployeeCompensationAssignment = {
      id: 'eca-emp101-2026',
      companyId: 'comp-101',
      employeeId: 'emp-101',
      salaryStructureId: structStandard.id,
      annualCtc: 120000.00,
      monthlyGross: 10000.00,
      currency: 'USD',
      payFrequency: PayFrequency.MONTHLY,
      effectiveFrom: '2026-01-01',
      effectiveTo: null,
      changeReason: CompensationChangeReason.NEW_HIRE,
      remarks: 'Initial hire compensation structure allocation.',
      status: CompensationStatus.ACTIVE,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      createdBy: 'usr-1',
    };

    const compAssignEmp102: EmployeeCompensationAssignment = {
      id: 'eca-emp102-2026',
      companyId: 'comp-101',
      employeeId: 'emp-102',
      salaryStructureId: structStandard.id,
      annualCtc: 95000.00,
      monthlyGross: 7916.67,
      currency: 'USD',
      payFrequency: PayFrequency.MONTHLY,
      effectiveFrom: '2026-01-01',
      effectiveTo: null,
      changeReason: CompensationChangeReason.NEW_HIRE,
      remarks: 'Standard HR Operations compensation assignment.',
      status: CompensationStatus.ACTIVE,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      createdBy: 'usr-1',
    };

    this.employeeCompensationAssignments.set(compAssignEmp101.id, compAssignEmp101);
    this.employeeCompensationAssignments.set(compAssignEmp102.id, compAssignEmp102);

    // =========================================================================
    // Phase 5 Seed Data: Recruitment & Onboarding Module
    // =========================================================================

    // 1. Job Requisitions
    const req1: JobRequisition = {
      id: 'req-101',
      companyId: 'comp-101',
      requisitionNumber: 'REQ-2026-001',
      title: 'Senior Full Stack Engineer',
      departmentId: 'dept-1',
      departmentName: 'Engineering',
      designationId: 'desig-2',
      designationName: 'Senior Full Stack Engineer',
      branchId: 'br-1',
      branchName: 'New York Headquarters',
      workLocationId: 'loc-1',
      workLocationName: 'New York HQ Main Campus',
      openingsCount: 2,
      filledCount: 0,
      minExperienceYears: 5,
      maxExperienceYears: 9,
      minSalary: 140000,
      maxSalary: 180000,
      currency: 'USD',
      employmentType: 'FULL_TIME',
      priority: RequisitionPriority.HIGH,
      status: RequisitionStatus.APPROVED,
      hiringManagerId: 'emp-101',
      hiringManagerName: 'John Doe',
      recruiterId: 'emp-102',
      recruiterName: 'Jane Smith',
      jobDescription: 'Architect and develop core multi-tenant microservices, distributed event workflows, and modern React interfaces.',
      requiredSkills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Cloud'],
      targetHireDate: '2026-09-30',
      activeApplicationsCount: 3,
      createdBy: 'usr-1',
      createdByName: 'System Admin',
      createdAt: '2026-07-01T09:00:00Z',
      updatedAt: '2026-07-05T14:00:00Z',
    };

    const req2: JobRequisition = {
      id: 'req-102',
      companyId: 'comp-101',
      requisitionNumber: 'REQ-2026-002',
      title: 'Senior HR Operations Specialist',
      departmentId: 'dept-2',
      departmentName: 'Human Resources',
      designationId: 'desig-4',
      designationName: 'Senior HR Operations Specialist',
      branchId: 'br-1',
      branchName: 'New York Headquarters',
      workLocationId: 'loc-1',
      workLocationName: 'New York HQ Main Campus',
      openingsCount: 1,
      filledCount: 0,
      minExperienceYears: 4,
      maxExperienceYears: 7,
      minSalary: 95000,
      maxSalary: 120000,
      currency: 'USD',
      employmentType: 'FULL_TIME',
      priority: RequisitionPriority.MEDIUM,
      status: RequisitionStatus.APPROVED,
      hiringManagerId: 'emp-102',
      hiringManagerName: 'Jane Smith',
      recruiterId: 'emp-102',
      recruiterName: 'Jane Smith',
      jobDescription: 'Oversee multi-state employee lifecycle, statutory onboarding documents, and leave/benefits coordination.',
      requiredSkills: ['HR Operations', 'Compliance', 'HRMS Systems', 'Onboarding'],
      targetHireDate: '2026-09-15',
      activeApplicationsCount: 1,
      createdBy: 'usr-1',
      createdByName: 'System Admin',
      createdAt: '2026-07-10T10:00:00Z',
      updatedAt: '2026-07-12T11:30:00Z',
    };

    this.jobRequisitions.set(req1.id, req1);
    this.jobRequisitions.set(req2.id, req2);

    // 2. Candidates
    const cand1: Candidate = {
      id: 'cand-1',
      companyId: 'comp-101',
      firstName: 'Alexander',
      lastName: 'Wright',
      fullName: 'Alexander Wright',
      email: 'alex.wright@example.com',
      phone: '+1 (555) 401-9281',
      currentCompany: 'Stripe',
      currentDesignation: 'Software Engineer',
      currentCtc: 135000,
      expectedCtc: 160000,
      currency: 'USD',
      experienceYears: 6.0,
      noticePeriodDays: 30,
      skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker'],
      source: CandidateSource.LINKEDIN,
      status: 'ACTIVE',
      notes: 'Strong backend architecture knowledge and distributed transaction background.',
      createdAt: '2026-07-15T11:00:00Z',
      updatedAt: '2026-07-15T11:00:00Z',
    };

    const cand2: Candidate = {
      id: 'cand-2',
      companyId: 'comp-101',
      firstName: 'Sophia',
      lastName: 'Martinez',
      fullName: 'Sophia Martinez',
      email: 'sophia.m@example.com',
      phone: '+1 (555) 782-1144',
      currentCompany: 'Salesforce',
      currentDesignation: 'Senior Full Stack Engineer',
      currentCtc: 145000,
      expectedCtc: 165000,
      currency: 'USD',
      experienceYears: 5.5,
      noticePeriodDays: 15,
      skills: ['React', 'TypeScript', 'GraphQL', 'AWS', 'TailwindCSS'],
      source: CandidateSource.REFERRAL,
      status: 'ACTIVE',
      notes: 'Excellent design systems and React rendering performance expertise.',
      createdAt: '2026-07-18T14:30:00Z',
      updatedAt: '2026-07-18T14:30:00Z',
    };

    const cand3: Candidate = {
      id: 'cand-3',
      companyId: 'comp-101',
      firstName: 'Marcus',
      lastName: 'Vance',
      fullName: 'Marcus Vance',
      email: 'marcus.vance@example.com',
      phone: '+1 (555) 612-8899',
      currentCompany: 'Datadog',
      currentDesignation: 'Backend Engineer',
      currentCtc: 140000,
      expectedCtc: 170000,
      currency: 'USD',
      experienceYears: 7.0,
      noticePeriodDays: 30,
      skills: ['Go', 'Node.js', 'PostgreSQL', 'Kubernetes', 'Redis'],
      source: CandidateSource.CAREER_PAGE,
      status: 'ACTIVE',
      notes: 'Passed initial resume screening with flying colors.',
      createdAt: '2026-07-22T08:15:00Z',
      updatedAt: '2026-07-22T08:15:00Z',
    };

    const cand4: Candidate = {
      id: 'cand-4',
      companyId: 'comp-101',
      firstName: 'Rachel',
      lastName: 'Green',
      fullName: 'Rachel Green',
      email: 'rachel.green@example.com',
      phone: '+1 (555) 334-9021',
      currentCompany: 'Workday',
      currentDesignation: 'HR Specialist',
      currentCtc: 90000,
      expectedCtc: 105000,
      currency: 'USD',
      experienceYears: 4.5,
      noticePeriodDays: 30,
      skills: ['HR Operations', 'Compliance', 'Onboarding', 'Payroll Support'],
      source: CandidateSource.DIRECT,
      status: 'ACTIVE',
      notes: 'Accepted offer; onboarding in progress.',
      createdAt: '2026-07-12T10:00:00Z',
      updatedAt: '2026-07-28T16:00:00Z',
    };

    this.candidates.set(cand1.id, cand1);
    this.candidates.set(cand2.id, cand2);
    this.candidates.set(cand3.id, cand3);
    this.candidates.set(cand4.id, cand4);

    // 3. Applications
    const app1: Application = {
      id: 'app-1',
      companyId: 'comp-101',
      candidateId: cand1.id,
      candidateName: cand1.fullName,
      candidateEmail: cand1.email,
      candidatePhone: cand1.phone,
      candidateSkills: cand1.skills,
      candidateExperienceYears: cand1.experienceYears,
      requisitionId: req1.id,
      requisitionTitle: req1.title,
      requisitionNumber: req1.requisitionNumber,
      departmentName: req1.departmentName,
      designationName: req1.designationName,
      applicationNumber: 'APP-2026-001',
      appliedDate: '2026-07-16',
      stage: ApplicationStage.INTERVIEW,
      status: ApplicationStatus.INTERVIEW_SCHEDULED,
      source: CandidateSource.LINKEDIN,
      rating: 4,
      recruiterId: 'emp-102',
      recruiterName: 'Jane Smith',
      hiringManagerId: 'emp-101',
      hiringManagerName: 'John Doe',
      interviewsCount: 2,
      createdAt: '2026-07-16T10:00:00Z',
      updatedAt: '2026-07-20T15:00:00Z',
    };

    const app2: Application = {
      id: 'app-2',
      companyId: 'comp-101',
      candidateId: cand2.id,
      candidateName: cand2.fullName,
      candidateEmail: cand2.email,
      candidatePhone: cand2.phone,
      candidateSkills: cand2.skills,
      candidateExperienceYears: cand2.experienceYears,
      requisitionId: req1.id,
      requisitionTitle: req1.title,
      requisitionNumber: req1.requisitionNumber,
      departmentName: req1.departmentName,
      designationName: req1.designationName,
      applicationNumber: 'APP-2026-002',
      appliedDate: '2026-07-19',
      stage: ApplicationStage.OFFER,
      status: ApplicationStatus.OFFERED,
      source: CandidateSource.REFERRAL,
      rating: 5,
      recruiterId: 'emp-102',
      recruiterName: 'Jane Smith',
      hiringManagerId: 'emp-101',
      hiringManagerName: 'John Doe',
      interviewsCount: 2,
      hasOffer: true,
      offerStatus: OfferStatus.SENT,
      offerId: 'off-1',
      createdAt: '2026-07-19T09:30:00Z',
      updatedAt: '2026-07-26T14:20:00Z',
    };

    const app3: Application = {
      id: 'app-3',
      companyId: 'comp-101',
      candidateId: cand3.id,
      candidateName: cand3.fullName,
      candidateEmail: cand3.email,
      candidatePhone: cand3.phone,
      candidateSkills: cand3.skills,
      candidateExperienceYears: cand3.experienceYears,
      requisitionId: req1.id,
      requisitionTitle: req1.title,
      requisitionNumber: req1.requisitionNumber,
      departmentName: req1.departmentName,
      designationName: req1.designationName,
      applicationNumber: 'APP-2026-003',
      appliedDate: '2026-07-23',
      stage: ApplicationStage.SCREENING,
      status: ApplicationStatus.SHORTLISTED,
      source: CandidateSource.CAREER_PAGE,
      rating: 4,
      recruiterId: 'emp-102',
      recruiterName: 'Jane Smith',
      hiringManagerId: 'emp-101',
      hiringManagerName: 'John Doe',
      interviewsCount: 0,
      createdAt: '2026-07-23T11:00:00Z',
      updatedAt: '2026-07-24T09:00:00Z',
    };

    const app4: Application = {
      id: 'app-4',
      companyId: 'comp-101',
      candidateId: cand4.id,
      candidateName: cand4.fullName,
      candidateEmail: cand4.email,
      candidatePhone: cand4.phone,
      candidateSkills: cand4.skills,
      candidateExperienceYears: cand4.experienceYears,
      requisitionId: req2.id,
      requisitionTitle: req2.title,
      requisitionNumber: req2.requisitionNumber,
      departmentName: req2.departmentName,
      designationName: req2.designationName,
      applicationNumber: 'APP-2026-004',
      appliedDate: '2026-07-13',
      stage: ApplicationStage.OFFER,
      status: ApplicationStatus.OFFER_ACCEPTED,
      source: CandidateSource.DIRECT,
      rating: 5,
      recruiterId: 'emp-102',
      recruiterName: 'Jane Smith',
      hiringManagerId: 'emp-102',
      hiringManagerName: 'Jane Smith',
      interviewsCount: 2,
      hasOffer: true,
      offerStatus: OfferStatus.ACCEPTED,
      offerId: 'off-2',
      createdAt: '2026-07-13T14:00:00Z',
      updatedAt: '2026-07-28T16:00:00Z',
    };

    this.applications.set(app1.id, app1);
    this.applications.set(app2.id, app2);
    this.applications.set(app3.id, app3);
    this.applications.set(app4.id, app4);

    // 4. Interviews
    const int1: RecruitmentInterview = {
      id: 'int-1',
      companyId: 'comp-101',
      applicationId: app1.id,
      candidateId: cand1.id,
      candidateName: cand1.fullName,
      requisitionId: req1.id,
      requisitionTitle: req1.title,
      roundNumber: 1,
      roundName: 'Technical Architecture & Code Screen',
      interviewType: InterviewType.VIDEO,
      scheduledStartTime: '2026-07-22T14:00:00Z',
      scheduledEndTime: '2026-07-22T15:00:00Z',
      meetingLink: 'https://meet.google.com/xyz-tech-test',
      interviewerIds: ['emp-101'],
      interviewerNames: ['John Doe'],
      status: InterviewStatus.COMPLETED,
      feedbackSubmitted: true,
      feedbackRating: 4,
      feedbackRecommendation: InterviewRecommendation.YES,
      feedbackStrengths: 'Clear understanding of state isolation, concurrency and schema migrations.',
      feedbackWeaknesses: 'Could elaborate more on modern CSS layout primitives.',
      feedbackNotes: 'Strong candidate for next round.',
      feedbackSubmittedAt: '2026-07-22T15:30:00Z',
      feedbackSubmittedBy: 'emp-101',
      feedbackSubmittedByName: 'John Doe',
      createdAt: '2026-07-18T10:00:00Z',
      updatedAt: '2026-07-22T15:30:00Z',
    };

    const int2: RecruitmentInterview = {
      id: 'int-2',
      companyId: 'comp-101',
      applicationId: app1.id,
      candidateId: cand1.id,
      candidateName: cand1.fullName,
      requisitionId: req1.id,
      requisitionTitle: req1.title,
      roundNumber: 2,
      roundName: 'System Design & Culture Fit',
      interviewType: InterviewType.VIDEO,
      scheduledStartTime: '2026-08-20T16:00:00Z',
      scheduledEndTime: '2026-08-20T17:00:00Z',
      meetingLink: 'https://meet.google.com/abc-arch-sys',
      interviewerIds: ['emp-101', 'emp-102'],
      interviewerNames: ['John Doe', 'Jane Smith'],
      status: InterviewStatus.SCHEDULED,
      feedbackSubmitted: false,
      createdAt: '2026-07-23T11:00:00Z',
      updatedAt: '2026-07-23T11:00:00Z',
    };

    this.recruitmentInterviews.set(int1.id, int1);
    this.recruitmentInterviews.set(int2.id, int2);

    // 5. Job Offers
    const off1: JobOffer = {
      id: 'off-1',
      companyId: 'comp-101',
      applicationId: app2.id,
      candidateId: cand2.id,
      candidateName: cand2.fullName,
      candidateEmail: cand2.email,
      requisitionId: req1.id,
      requisitionTitle: req1.title,
      offerNumber: 'OFF-2026-001',
      version: 1,
      designationId: 'desig-2',
      designationName: 'Senior Full Stack Engineer',
      departmentId: 'dept-1',
      departmentName: 'Engineering',
      branchId: 'br-1',
      branchName: 'New York Headquarters',
      workLocationId: 'loc-1',
      workLocationName: 'New York HQ Main Campus',
      joiningDate: '2026-09-01',
      annualCtc: 165000,
      currency: 'USD',
      basicSalary: 82500,
      hraSalary: 41250,
      specialAllowance: 33000,
      variableBonus: 8250,
      probationMonths: 3,
      noticePeriodDays: 30,
      status: OfferStatus.SENT,
      issuedDate: '2026-07-26',
      expiryDate: '2026-08-10',
      createdBy: 'emp-102',
      createdByName: 'Jane Smith',
      approvedBy: 'emp-101',
      approvedByName: 'John Doe',
      notes: 'Standard competitive offer with signing stock bonus provisions.',
      createdAt: '2026-07-26T10:00:00Z',
      updatedAt: '2026-07-26T14:00:00Z',
    };

    const off2: JobOffer = {
      id: 'off-2',
      companyId: 'comp-101',
      applicationId: app4.id,
      candidateId: cand4.id,
      candidateName: cand4.fullName,
      candidateEmail: cand4.email,
      requisitionId: req2.id,
      requisitionTitle: req2.title,
      offerNumber: 'OFF-2026-002',
      version: 1,
      designationId: 'desig-4',
      designationName: 'Senior HR Operations Specialist',
      departmentId: 'dept-2',
      departmentName: 'Human Resources',
      branchId: 'br-1',
      branchName: 'New York Headquarters',
      workLocationId: 'loc-1',
      workLocationName: 'New York HQ Main Campus',
      joiningDate: '2026-08-25',
      annualCtc: 105000,
      currency: 'USD',
      basicSalary: 52500,
      hraSalary: 26250,
      specialAllowance: 21000,
      variableBonus: 5250,
      probationMonths: 3,
      noticePeriodDays: 30,
      status: OfferStatus.ACCEPTED,
      issuedDate: '2026-07-25',
      expiryDate: '2026-08-05',
      acceptedAt: '2026-07-28T16:00:00Z',
      createdBy: 'emp-102',
      createdByName: 'Jane Smith',
      approvedBy: 'emp-101',
      approvedByName: 'John Doe',
      notes: 'Candidate accepted electronically. Ready for onboarding tasks.',
      createdAt: '2026-07-25T11:00:00Z',
      updatedAt: '2026-07-28T16:00:00Z',
    };

    this.jobOffers.set(off1.id, off1);
    this.jobOffers.set(off2.id, off2);

    // 6. Onboarding Template
    const onbTmpl1: OnboardingTemplate = {
      id: 'onb-tmpl-1',
      companyId: 'comp-101',
      templateName: 'Standard Corporate & Tech Onboarding',
      description: 'Comprehensive checklist for engineering and operations hires including background verification, hardware, and account provisioning.',
      isActive: true,
      tasks: [
        { title: 'HR Orientation & Welcome Kit', description: 'Schedule 30-min welcome call and review handbook.', category: OnboardingTaskCategory.HR, daysFromJoining: 0 },
        { title: 'IT Hardware & Workstation Setup', description: 'Ship configured MacBook Pro, external monitor, and YubiKey.', category: OnboardingTaskCategory.IT, daysFromJoining: -3 },
        { title: 'Google Workspace & Slack Provisioning', description: 'Create work email and add to primary department Slack channels.', category: OnboardingTaskCategory.IT, daysFromJoining: -1 },
        { title: 'Bank Account & Direct Deposit Setup', description: 'Verify bank details and cancelled cheque for payroll processing.', category: OnboardingTaskCategory.FINANCE, daysFromJoining: 2 },
        { title: 'Security Awareness & Compliance Training', description: 'Complete SOC2 compliance and data privacy quiz.', category: OnboardingTaskCategory.COMPLIANCE, daysFromJoining: 5 },
      ],
      requiredDocuments: [
        OnboardingDocType.GOVERNMENT_ID,
        OnboardingDocType.ADDRESS_PROOF,
        OnboardingDocType.EDUCATION_CERTIFICATE,
        OnboardingDocType.SIGNED_OFFER_LETTER,
        OnboardingDocType.BANK_PASSBOOK_OR_CHEQUE,
      ],
      createdAt: '2026-06-01T08:00:00Z',
      updatedAt: '2026-06-01T08:00:00Z',
    };

    this.onboardingTemplates.set(onbTmpl1.id, onbTmpl1);

    // 7. Employee Onboardings & Tasks/Docs
    const onb1: EmployeeOnboarding = {
      id: 'onb-1',
      companyId: 'comp-101',
      candidateId: cand4.id,
      applicationId: app4.id,
      jobOfferId: off2.id,
      templateId: onbTmpl1.id,
      onboardingNumber: 'ONB-2026-001',
      firstName: cand4.firstName,
      lastName: cand4.lastName,
      fullName: cand4.fullName,
      email: cand4.email,
      phone: cand4.phone,
      departmentId: 'dept-2',
      departmentName: 'Human Resources',
      designationId: 'desig-4',
      designationName: 'Senior HR Operations Specialist',
      branchId: 'br-1',
      branchName: 'New York Headquarters',
      workLocationId: 'loc-1',
      workLocationName: 'New York HQ Main Campus',
      joiningDate: '2026-08-25',
      status: OnboardingStatus.IN_PROGRESS,
      overallProgress: 45,
      tasksCompletedCount: 2,
      tasksTotalCount: 5,
      docsVerifiedCount: 3,
      docsTotalCount: 5,
      joiningDetails: {
        gender: 'FEMALE',
        dateOfBirth: '1996-05-18',
        maritalStatus: 'SINGLE',
        nationality: 'American',
        bloodGroup: 'O+',
        reportingManagerId: 'emp-102',
        reportingManagerName: 'Jane Smith',
        employmentType: 'FULL_TIME',
        bankName: 'Chase Bank',
        accountNumber: '••••••••4892',
        ifscCode: 'CHASUS33',
        panNumber: 'ABCDE1234F',
        emergencyContactName: 'Monica Geller',
        emergencyContactPhone: '+1 (555) 998-1122',
        emergencyContactRelation: 'Friend',
        addressLine1: '495 Grove Street, Apt 20',
        city: 'New York',
        state: 'NY',
        postalCode: '10014',
        annualCtc: 105000,
        basicSalary: 52500,
        hraSalary: 26250,
      },
      createdAt: '2026-07-28T16:05:00Z',
      updatedAt: '2026-08-01T12:00:00Z',
    };

    this.employeeOnboardings.set(onb1.id, onb1);

    // Onboarding Tasks for onb1
    const task1: OnboardingTask = {
      id: 'task-1',
      companyId: 'comp-101',
      onboardingId: onb1.id,
      title: 'HR Orientation & Welcome Kit',
      category: OnboardingTaskCategory.HR,
      dueDate: '2026-08-25',
      assigneeId: 'emp-102',
      assigneeName: 'Jane Smith',
      status: OnboardingTaskStatus.PENDING,
      createdAt: '2026-07-28T16:05:00Z',
      updatedAt: '2026-07-28T16:05:00Z',
    };

    const task2: OnboardingTask = {
      id: 'task-2',
      companyId: 'comp-101',
      onboardingId: onb1.id,
      title: 'IT Hardware & Workstation Setup',
      category: OnboardingTaskCategory.IT,
      dueDate: '2026-08-22',
      assigneeId: 'emp-101',
      assigneeName: 'John Doe',
      status: OnboardingTaskStatus.COMPLETED,
      completedAt: '2026-08-01T11:00:00Z',
      completedBy: 'emp-101',
      completedByName: 'John Doe',
      notes: 'Shipped Apple M3 Pro MacBook to home address via FedEx tracking #99281726.',
      createdAt: '2026-07-28T16:05:00Z',
      updatedAt: '2026-08-01T11:00:00Z',
    };

    const task3: OnboardingTask = {
      id: 'task-3',
      companyId: 'comp-101',
      onboardingId: onb1.id,
      title: 'Google Workspace & Slack Provisioning',
      category: OnboardingTaskCategory.IT,
      dueDate: '2026-08-24',
      assigneeId: 'emp-101',
      assigneeName: 'John Doe',
      status: OnboardingTaskStatus.COMPLETED,
      completedAt: '2026-08-01T11:30:00Z',
      completedBy: 'emp-101',
      completedByName: 'John Doe',
      notes: 'Created rgreen@acme-corp.com and added to hr-team channels.',
      createdAt: '2026-07-28T16:05:00Z',
      updatedAt: '2026-08-01T11:30:00Z',
    };

    this.onboardingTasks.set(task1.id, task1);
    this.onboardingTasks.set(task2.id, task2);
    this.onboardingTasks.set(task3.id, task3);

    // Onboarding Docs for onb1
    const doc1: OnboardingDocument = {
      id: 'doc-1',
      companyId: 'comp-101',
      onboardingId: onb1.id,
      documentType: OnboardingDocType.GOVERNMENT_ID,
      documentName: 'US Passport / Driver License',
      fileUrl: '/uploads/docs/cand-4/passport.pdf',
      status: OnboardingDocStatus.VERIFIED,
      submittedAt: '2026-07-29T10:00:00Z',
      verifiedAt: '2026-07-30T14:00:00Z',
      verifiedBy: 'emp-102',
      verifiedByName: 'Jane Smith',
      createdAt: '2026-07-28T16:05:00Z',
      updatedAt: '2026-07-30T14:00:00Z',
    };

    const doc2: OnboardingDocument = {
      id: 'doc-2',
      companyId: 'comp-101',
      onboardingId: onb1.id,
      documentType: OnboardingDocType.SIGNED_OFFER_LETTER,
      documentName: 'Signed Offer Letter OFF-2026-002',
      fileUrl: '/uploads/docs/cand-4/signed_offer.pdf',
      status: OnboardingDocStatus.VERIFIED,
      submittedAt: '2026-07-28T16:10:00Z',
      verifiedAt: '2026-07-29T09:00:00Z',
      verifiedBy: 'emp-102',
      verifiedByName: 'Jane Smith',
      createdAt: '2026-07-28T16:05:00Z',
      updatedAt: '2026-07-29T09:00:00Z',
    };

    const doc3: OnboardingDocument = {
      id: 'doc-3',
      companyId: 'comp-101',
      onboardingId: onb1.id,
      documentType: OnboardingDocType.BANK_PASSBOOK_OR_CHEQUE,
      documentName: 'Voided Direct Deposit Cheque',
      fileUrl: '/uploads/docs/cand-4/voided_cheque.pdf',
      status: OnboardingDocStatus.SUBMITTED,
      submittedAt: '2026-07-30T16:00:00Z',
      createdAt: '2026-07-28T16:05:00Z',
      updatedAt: '2026-07-30T16:00:00Z',
    };

    this.onboardingDocuments.set(doc1.id, doc1);
    this.onboardingDocuments.set(doc2.id, doc2);
    this.onboardingDocuments.set(doc3.id, doc3);
<<<<<<< HEAD

    // ==========================================
    // PHASE 6A: PERFORMANCE MANAGEMENT MASTER SEED
    // ==========================================

    // 1. Goal Categories
    const cat1: GoalCategory = {
      id: 'cat-1',
      companyId: 'comp-101',
      code: 'FINANCIAL',
      name: 'Financial & Revenue',
      description: 'Revenue targets, cost optimization, and budget stewardship',
      defaultWeightage: 25.0,
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
    };
    const cat2: GoalCategory = {
      id: 'cat-2',
      companyId: 'comp-101',
      code: 'OPERATIONAL',
      name: 'Operational & Execution',
      description: 'Service uptime, sprint deliveries, code quality, and efficiency',
      defaultWeightage: 35.0,
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
    };
    const cat3: GoalCategory = {
      id: 'cat-3',
      companyId: 'comp-101',
      code: 'CUSTOMER',
      name: 'Customer & Client Success',
      description: 'Customer satisfaction, SLA compliance, and stakeholder feedback',
      defaultWeightage: 20.0,
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
    };
    const cat4: GoalCategory = {
      id: 'cat-4',
      companyId: 'comp-101',
      code: 'LEARNING_GROWTH',
      name: 'Learning & Team Development',
      description: 'Certifications, mentoring, skill development, and cross-functional leadership',
      defaultWeightage: 20.0,
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
    };
    const catNexus: GoalCategory = {
      id: 'cat-nexus-1',
      companyId: 'comp-102',
      code: 'DELIVERY',
      name: 'Client Engineering Delivery',
      description: 'Nexus global software deliverables and uptime',
      defaultWeightage: 100.0,
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
    };

    this.performanceGoalCategories.set(cat1.id, cat1);
    this.performanceGoalCategories.set(cat2.id, cat2);
    this.performanceGoalCategories.set(cat3.id, cat3);
    this.performanceGoalCategories.set(cat4.id, cat4);
    this.performanceGoalCategories.set(catNexus.id, catNexus);

    // 2. Review Templates
    const tmpl1: PerformanceReviewTemplate = {
      id: 'tmpl-101',
      companyId: 'comp-101',
      code: 'STD-APPRAISAL-2026',
      name: 'Enterprise Balanced Performance Appraisal (60/40)',
      description: 'Standard enterprise appraisal framework: 60% Goal / KRA achievement + 40% Core competencies.',
      ratingScale: [
        { rating: 5, label: 'Outstanding (O)', description: 'Consistently far exceeds expectations', minScore: 4.5, maxScore: 5.0 },
        { rating: 4, label: 'Exceeds Expectations (EE)', description: 'Regularly exceeds standard performance goals', minScore: 3.5, maxScore: 4.49 },
        { rating: 3, label: 'Meets Expectations (ME)', description: 'Consistently meets role objectives successfully', minScore: 2.5, maxScore: 3.49 },
        { rating: 2, label: 'Needs Improvement (NI)', description: 'Performance fell short in key priority areas', minScore: 1.5, maxScore: 2.49 },
        { rating: 1, label: 'Unsatisfactory (U)', description: 'Substantially below acceptable operational baseline', minScore: 1.0, maxScore: 1.49 },
      ],
      competencies: [
        { id: 'comp-c1', name: 'Technical Excellence & Quality', category: 'Functional', description: 'Architectural sound designs, clean code, and zero regression defects.', weightage: 25.0 },
        { id: 'comp-c2', name: 'Ownership & Accountability', category: 'Behavioral', description: 'Takes proactive responsibility for end-to-end execution and commitments.', weightage: 25.0 },
        { id: 'comp-c3', name: 'Collaboration & Teamwork', category: 'Behavioral', description: 'Effective cross-functional communication, helpful code reviews, and empathy.', weightage: 25.0 },
        { id: 'comp-c4', name: 'Innovation & Problem Solving', category: 'Core', description: 'Proposes creative solutions, optimizes performance bottlenecks, and drives improvements.', weightage: 25.0 },
      ],
      goalWeightagePct: 60.0,
      competencyWeightagePct: 40.0,
      isActive: true,
      createdBy: 'usr-1',
      createdAt: '2026-01-05T09:00:00Z',
      updatedAt: '2026-01-05T09:00:00Z',
    };

    const tmplNexus: PerformanceReviewTemplate = {
      id: 'tmpl-201',
      companyId: 'comp-102',
      code: 'NEXUS-TECH-ANNUAL',
      name: 'Nexus Cloud Engineering Review',
      description: 'Nexus technical appraisal framework (70/30).',
      ratingScale: [
        { rating: 5, label: 'Distinguished', minScore: 4.5, maxScore: 5.0 },
        { rating: 4, label: 'Strong', minScore: 3.5, maxScore: 4.49 },
        { rating: 3, label: 'Effective', minScore: 2.5, maxScore: 3.49 },
        { rating: 2, label: 'Developing', minScore: 1.5, maxScore: 2.49 },
        { rating: 1, label: 'Low', minScore: 1.0, maxScore: 1.49 },
      ],
      competencies: [
        { id: 'comp-nx-1', name: 'Cloud Architecture & Reliability', category: 'Technical', description: 'AWS/GCP scalable infrastructure delivery.', weightage: 50.0 },
        { id: 'comp-nx-2', name: 'Agile Velocity & Client Partnership', category: 'Operational', description: 'Sprint delivery on schedule.', weightage: 50.0 },
      ],
      goalWeightagePct: 70.0,
      competencyWeightagePct: 30.0,
      isActive: true,
      createdBy: 'usr-1',
      createdAt: '2026-01-05T09:00:00Z',
      updatedAt: '2026-01-05T09:00:00Z',
    };

    this.performanceReviewTemplates.set(tmpl1.id, tmpl1);
    this.performanceReviewTemplates.set(tmplNexus.id, tmplNexus);

    // 3. Performance Cycles
    const cyc1: PerformanceCycle = {
      id: 'cyc-101',
      companyId: 'comp-101',
      code: 'CYC-2026-H1',
      name: '2026 H1 Mid-Year Appraisal Cycle',
      cycleType: PerformanceCycleType.HALF_YEARLY,
      startDate: '2026-01-01',
      endDate: '2026-06-30',
      selfReviewDeadline: '2026-07-15',
      managerReviewDeadline: '2026-07-31',
      status: PerformanceCycleStatus.ACTIVE,
      description: 'Formal Mid-Year 2026 Performance Appraisal for all permanent employees.',
      defaultTemplateId: tmpl1.id,
      createdBy: 'usr-1',
      createdAt: '2026-01-10T08:00:00Z',
      updatedAt: '2026-08-01T10:00:00Z',
    };

    const cyc2: PerformanceCycle = {
      id: 'cyc-102',
      companyId: 'comp-101',
      code: 'CYC-2026-ANNUAL',
      name: '2026 Annual Enterprise Appraisal',
      cycleType: PerformanceCycleType.ANNUAL,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      selfReviewDeadline: '2027-01-15',
      managerReviewDeadline: '2027-01-31',
      status: PerformanceCycleStatus.GOAL_SETTING,
      description: 'Full year 2026 review cycle for strategic objectives.',
      defaultTemplateId: tmpl1.id,
      createdBy: 'usr-1',
      createdAt: '2026-02-01T08:00:00Z',
      updatedAt: '2026-02-01T08:00:00Z',
    };

    const cycNexus: PerformanceCycle = {
      id: 'cyc-201',
      companyId: 'comp-102',
      code: 'NEXUS-2026-Q1',
      name: 'Nexus Q1 2026 Performance Review',
      cycleType: PerformanceCycleType.QUARTERLY,
      startDate: '2026-01-01',
      endDate: '2026-03-31',
      selfReviewDeadline: '2026-04-10',
      managerReviewDeadline: '2026-04-20',
      status: PerformanceCycleStatus.COMPLETED,
      description: 'Nexus Q1 Cloud Delivery Appraisal Cycle',
      defaultTemplateId: tmplNexus.id,
      createdBy: 'usr-1',
      createdAt: '2026-01-01T08:00:00Z',
      updatedAt: '2026-04-25T10:00:00Z',
    };

    this.performanceCycles.set(cyc1.id, cyc1);
    this.performanceCycles.set(cyc2.id, cyc2);
    this.performanceCycles.set(cycNexus.id, cycNexus);

    // 4. Performance Goals (Manager & Employee Goals)
    // Goal 1: Manager Goal (emp-101)
    const goal1: PerformanceGoal = {
      id: 'goal-101',
      companyId: 'comp-101',
      cycleId: cyc1.id,
      employeeId: 'emp-101',
      category: 'OPERATIONAL',
      title: 'Maintain 99.95% System Uptime and Zero Critical Security Vulnerabilities',
      description: 'Ensure core HRMS services maintain high reliability, sub-200ms latency, and continuous ISO/SOC2 security adherence.',
      measurementType: MeasurementType.PERCENTAGE,
      targetValue: 99.95,
      unit: '%',
      currentValue: 99.98,
      weightage: 50.0,
      dueDate: '2026-06-30',
      status: PerformanceGoalStatus.COMPLETED,
      isManagerGoal: true,
      selfRating: 4.8,
      selfComment: 'Achieved 99.98% uptime with zero Sev-1 outages during H1.',
      managerRating: 5.0,
      managerComment: 'Outstanding leadership and infrastructure stability.',
      finalScore: 98.0,
      createdBy: 'emp-101',
      approvedBy: 'emp-101',
      approvedAt: '2026-01-15T10:00:00Z',
      createdAt: '2026-01-15T09:00:00Z',
      updatedAt: '2026-06-30T18:00:00Z',
    };

    // Goal 2: Employee Goal (emp-102 reporting to emp-101)
    const goal2: PerformanceGoal = {
      id: 'goal-102',
      companyId: 'comp-101',
      cycleId: cyc1.id,
      employeeId: 'emp-102',
      category: 'OPERATIONAL',
      title: 'Architect and Deliver Phase 4 Payroll Calculation Engine',
      description: 'Implement deterministic payroll calculation rules, statutory deductions, tax regimes, and payslip generator.',
      measurementType: MeasurementType.MILESTONE,
      targetValue: 100.0,
      unit: '%',
      currentValue: 100.0,
      weightage: 60.0,
      dueDate: '2026-06-15',
      status: PerformanceGoalStatus.COMPLETED,
      parentGoalId: goal1.id,
      isManagerGoal: false,
      selfRating: 4.5,
      selfComment: 'Delivered Phase 4 on time with 100% test coverage across all salary formulas.',
      managerRating: 4.8,
      managerComment: 'Exceptional architectural delivery and documentation.',
      finalScore: 95.0,
      createdBy: 'emp-102',
      approvedBy: 'emp-101',
      approvedAt: '2026-01-20T11:00:00Z',
      createdAt: '2026-01-16T10:00:00Z',
      updatedAt: '2026-06-25T14:00:00Z',
    };

    // Goal 3: Employee Goal (emp-102 second goal)
    const goal3: PerformanceGoal = {
      id: 'goal-103',
      companyId: 'comp-101',
      cycleId: cyc1.id,
      employeeId: 'emp-102',
      category: 'LEARNING_GROWTH',
      title: 'Complete AWS Certified Solutions Architect & Mentor 2 Junior Engineers',
      description: 'Upskill in distributed systems and conduct bi-weekly code review mentorship sessions.',
      measurementType: MeasurementType.NUMERIC,
      targetValue: 2.0,
      unit: 'Engineers',
      currentValue: 2.0,
      weightage: 40.0,
      dueDate: '2026-06-30',
      status: PerformanceGoalStatus.COMPLETED,
      isManagerGoal: false,
      selfRating: 4.0,
      selfComment: 'Passed AWS certification in May and guided Marcus through backend assignments.',
      managerRating: 4.5,
      managerComment: 'Marcus has grown significantly under Sophia’s guidance.',
      finalScore: 90.0,
      createdBy: 'emp-102',
      approvedBy: 'emp-101',
      approvedAt: '2026-01-20T11:00:00Z',
      createdAt: '2026-01-16T10:00:00Z',
      updatedAt: '2026-06-28T16:00:00Z',
    };

    // Goal 4: Employee Goal (emp-103 reporting to emp-101)
    const goal4: PerformanceGoal = {
      id: 'goal-104',
      companyId: 'comp-101',
      cycleId: cyc1.id,
      employeeId: 'emp-103',
      category: 'OPERATIONAL',
      title: 'Implement React Front-end Components for Attendance & Leaves',
      description: 'Build responsive calendar matrix, regularization workflows, and leave application drawer.',
      measurementType: MeasurementType.PERCENTAGE,
      targetValue: 100.0,
      unit: '%',
      currentValue: 85.0,
      weightage: 70.0,
      dueDate: '2026-06-30',
      status: PerformanceGoalStatus.IN_PROGRESS,
      parentGoalId: goal1.id,
      isManagerGoal: false,
      selfRating: 3.8,
      selfComment: 'Completed 85% of views with great UX feedback.',
      managerRating: 4.0,
      managerComment: 'Solid execution, UI animations and responsiveness look great.',
      finalScore: 82.0,
      createdBy: 'emp-103',
      approvedBy: 'emp-101',
      approvedAt: '2026-01-22T09:30:00Z',
      createdAt: '2026-01-18T14:00:00Z',
      updatedAt: '2026-06-29T11:00:00Z',
    };

    this.performanceGoals.set(goal1.id, goal1);
    this.performanceGoals.set(goal2.id, goal2);
    this.performanceGoals.set(goal3.id, goal3);
    this.performanceGoals.set(goal4.id, goal4);

    // 5. Performance Reviews
    // Review 1: emp-102 reviewed by emp-101 (FINALIZED state)
    const rev1: PerformanceReview = {
      id: 'rev-101',
      companyId: 'comp-101',
      cycleId: cyc1.id,
      employeeId: 'emp-102',
      reviewerId: 'emp-101',
      templateId: tmpl1.id,
      status: PerformanceReviewStatus.FINALIZED,
      selfOverallRating: 4.3,
      selfOverallComments: 'H1 was an impactful semester delivering the Payroll engine and mentoring colleagues.',
      selfStrengths: 'High ownership, deep architectural clarity, and rapid execution under tight deadlines.',
      selfImprovements: 'Could delegate initial schema scaffolding more effectively.',
      selfSubmittedAt: '2026-07-10T14:30:00Z',
      selfCompetencyRatings: [
        { competencyId: 'comp-c1', competencyName: 'Technical Excellence & Quality', weightage: 25.0, rating: 4.5, comment: 'Led payroll formula engine' },
        { competencyId: 'comp-c2', competencyName: 'Ownership & Accountability', weightage: 25.0, rating: 4.5, comment: 'Owned production rollout' },
        { competencyId: 'comp-c3', competencyName: 'Collaboration & Teamwork', weightage: 25.0, rating: 4.0, comment: 'Good pairing with frontend team' },
        { competencyId: 'comp-c4', competencyName: 'Innovation & Problem Solving', weightage: 25.0, rating: 4.2, comment: 'Optimized snapshot query' },
      ],
      managerOverallRating: 4.7,
      managerOverallComments: 'Sophia is a pillar of our engineering team. Her work on Phase 4 was textbook excellence.',
      managerStrengths: 'Exceptional domain comprehension, flawless code standards, and selfless mentorship.',
      managerImprovements: 'Encouraged to take on broader cross-departmental roadmap planning.',
      managerRecommendations: ManagerRecommendation.PROMOTION,
      managerSubmittedAt: '2026-07-25T16:00:00Z',
      managerCompetencyRatings: [
        { competencyId: 'comp-c1', competencyName: 'Technical Excellence & Quality', weightage: 25.0, rating: 5.0, comment: 'Top-tier code and tests' },
        { competencyId: 'comp-c2', competencyName: 'Ownership & Accountability', weightage: 25.0, rating: 4.8, comment: 'Dependable lead' },
        { competencyId: 'comp-c3', competencyName: 'Collaboration & Teamwork', weightage: 25.0, rating: 4.5, comment: 'Valued team player' },
        { competencyId: 'comp-c4', competencyName: 'Innovation & Problem Solving', weightage: 25.0, rating: 4.6, comment: 'Creative solutions' },
      ],
      finalRating: 4.65,
      finalScore: 93.0,
      finalGrade: 'Outstanding (O)',
      finalComments: 'Promoted to Lead Staff Software Engineer effective Q3 2026.',
      finalizedBy: 'emp-101',
      finalizedAt: '2026-07-28T10:00:00Z',
      isFinalized: true,
      createdAt: '2026-01-10T08:00:00Z',
      updatedAt: '2026-07-28T10:00:00Z',
    };

    // Review 2: emp-103 reviewed by emp-101 (MANAGER_REVIEW_PENDING state)
    const rev2: PerformanceReview = {
      id: 'rev-102',
      companyId: 'comp-101',
      cycleId: cyc1.id,
      employeeId: 'emp-103',
      reviewerId: 'emp-101',
      templateId: tmpl1.id,
      status: PerformanceReviewStatus.MANAGER_REVIEW_PENDING,
      selfOverallRating: 3.9,
      selfOverallComments: 'Proud of delivering the attendance and leave user interfaces with modern reactive feedback.',
      selfStrengths: 'CSS mastery, Tailwind proficiency, responsive UI and rapid bug turnaround.',
      selfImprovements: 'Deepening understanding of backend transaction isolation and PostgreSQL concurrency.',
      selfSubmittedAt: '2026-07-12T11:00:00Z',
      selfCompetencyRatings: [
        { competencyId: 'comp-c1', competencyName: 'Technical Excellence & Quality', weightage: 25.0, rating: 4.0, comment: 'Clean React code' },
        { competencyId: 'comp-c2', competencyName: 'Ownership & Accountability', weightage: 25.0, rating: 4.0, comment: 'Prompt delivery' },
        { competencyId: 'comp-c3', competencyName: 'Collaboration & Teamwork', weightage: 25.0, rating: 4.2, comment: 'Great pairing with Sophia' },
        { competencyId: 'comp-c4', competencyName: 'Innovation & Problem Solving', weightage: 25.0, rating: 3.5, comment: 'Learning deeper backend concepts' },
      ],
      managerCompetencyRatings: [],
      isFinalized: false,
      createdAt: '2026-01-10T08:00:00Z',
      updatedAt: '2026-07-12T11:00:00Z',
    };

    this.performanceReviews.set(rev1.id, rev1);
    this.performanceReviews.set(rev2.id, rev2);

    // 6. Performance Review History (Audit Ledger)
    const hist1: PerformanceReviewHistory = {
      id: 'hist-rev-101-1',
      companyId: 'comp-101',
      reviewId: rev1.id,
      action: 'CYCLE_INITIALIZED',
      previousStatus: undefined,
      newStatus: PerformanceReviewStatus.SELF_REVIEW_PENDING,
      actorId: 'usr-1',
      actorName: 'System Administrator',
      actorRole: 'SUPER_ADMIN',
      comment: 'Review record initialized from Active Performance Cycle CYC-2026-H1',
      snapshotData: { employeeId: 'emp-102', cycleId: cyc1.id, templateId: tmpl1.id },
      createdAt: '2026-01-10T08:00:00Z',
    };
    const hist2: PerformanceReviewHistory = {
      id: 'hist-rev-101-2',
      companyId: 'comp-101',
      reviewId: rev1.id,
      action: 'SELF_REVIEW_SUBMITTED',
      previousStatus: PerformanceReviewStatus.SELF_REVIEW_PENDING,
      newStatus: PerformanceReviewStatus.MANAGER_REVIEW_PENDING,
      actorId: 'emp-102',
      actorName: 'Sophia Martinez',
      actorRole: 'EMPLOYEE',
      comment: 'Self review submitted with overall self-rating 4.30',
      snapshotData: { selfOverallRating: 4.3, selfOverallComments: rev1.selfOverallComments },
      createdAt: '2026-07-10T14:30:00Z',
    };
    const hist3: PerformanceReviewHistory = {
      id: 'hist-rev-101-3',
      companyId: 'comp-101',
      reviewId: rev1.id,
      action: 'MANAGER_REVIEW_SUBMITTED',
      previousStatus: PerformanceReviewStatus.MANAGER_REVIEW_PENDING,
      newStatus: PerformanceReviewStatus.COMPLETED,
      actorId: 'emp-101',
      actorName: 'Alexander Vance',
      actorRole: 'MANAGER',
      comment: 'Manager review completed with recommendation: PROMOTION',
      snapshotData: { managerOverallRating: 4.7, managerRecommendations: 'PROMOTION' },
      createdAt: '2026-07-25T16:00:00Z',
    };
    const hist4: PerformanceReviewHistory = {
      id: 'hist-rev-101-4',
      companyId: 'comp-101',
      reviewId: rev1.id,
      action: 'REVIEW_FINALIZED',
      previousStatus: PerformanceReviewStatus.COMPLETED,
      newStatus: PerformanceReviewStatus.FINALIZED,
      actorId: 'emp-101',
      actorName: 'Alexander Vance',
      actorRole: 'MANAGER',
      comment: 'Final review score computed (93.00) and locked into immutable history ledger.',
      snapshotData: { finalRating: 4.65, finalScore: 93.0, finalGrade: 'Outstanding (O)' },
      createdAt: '2026-07-28T10:00:00Z',
    };

    this.performanceReviewHistory.set(hist1.id, hist1);
    this.performanceReviewHistory.set(hist2.id, hist2);
    this.performanceReviewHistory.set(hist3.id, hist3);
    this.performanceReviewHistory.set(hist4.id, hist4);

    // =========================================================================
    // PHASE 6B: EXPENSES & ASSETS SEED DATA
    // =========================================================================
    const expCatTravel: ExpenseCategory = {
      id: 'exp-cat-101',
      companyId: 'comp-101',
      code: 'TRAVEL',
      name: 'Business Travel & Commute',
      description: 'Flights, trains, taxis, car rentals, lodging and fuel',
      maxLimitPerClaim: 5000,
      requiresReceipt: true,
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    const expCatMeals: ExpenseCategory = {
      id: 'exp-cat-102',
      companyId: 'comp-101',
      code: 'MEALS',
      name: 'Client Entertainment & Team Meals',
      description: 'Business lunches, client dinners, working team catering',
      maxLimitPerClaim: 500,
      requiresReceipt: true,
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    const expCatHardware: ExpenseCategory = {
      id: 'exp-cat-103',
      companyId: 'comp-101',
      code: 'HARDWARE',
      name: 'Hardware & Work Peripherals',
      description: 'Keyboards, mice, ergonomic accessories, cables',
      maxLimitPerClaim: 1000,
      requiresReceipt: true,
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    const expCatTraining: ExpenseCategory = {
      id: 'exp-cat-104',
      companyId: 'comp-101',
      code: 'TRAINING',
      name: 'Professional Training & Certifications',
      description: 'Courses, tech conferences, exam vouchers',
      maxLimitPerClaim: 2500,
      requiresReceipt: true,
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    this.expenseCategories.set(expCatTravel.id, expCatTravel);
    this.expenseCategories.set(expCatMeals.id, expCatMeals);
    this.expenseCategories.set(expCatHardware.id, expCatHardware);
    this.expenseCategories.set(expCatTraining.id, expCatTraining);

    // Sample Expense Claim
    const sampleClaim: ExpenseClaim = {
      id: 'exp-clm-101',
      companyId: 'comp-101',
      claimNumber: 'EXP-2026-0001',
      employeeId: 'emp-102',
      title: 'Q1 Client Onsite Visit - San Francisco',
      description: 'Flight tickets, airport transfers, and team dinner with Enterprise client',
      currency: 'USD',
      totalAmount: 685.50,
      status: 'SUBMITTED' as any,
      submittedAt: '2026-02-10T09:00:00Z',
      managerId: 'emp-101',
      receiptsCount: 2,
      createdAt: '2026-02-09T15:30:00Z',
      updatedAt: '2026-02-10T09:00:00Z',
    };
    const claimItem1: ExpenseClaimItem = {
      id: 'exp-item-101-1',
      claimId: sampleClaim.id,
      companyId: 'comp-101',
      categoryId: expCatTravel.id,
      categoryName: expCatTravel.name,
      expenseDate: '2026-02-08',
      amount: 450.00,
      currency: 'USD',
      taxAmount: 35.00,
      description: 'United Airlines Roundtrip Flight SFO',
      merchantName: 'United Airlines',
      receiptAttachmentUrl: '/uploads/receipts/flight_sfo_001.pdf',
      receiptFileName: 'flight_sfo_001.pdf',
      receiptFileSize: 245000,
      receiptMimeType: 'application/pdf',
      isReceiptVerified: true,
      createdAt: '2026-02-09T15:35:00Z',
      updatedAt: '2026-02-09T15:35:00Z',
    };
    const claimItem2: ExpenseClaimItem = {
      id: 'exp-item-101-2',
      claimId: sampleClaim.id,
      companyId: 'comp-101',
      categoryId: expCatMeals.id,
      categoryName: expCatMeals.name,
      expenseDate: '2026-02-08',
      amount: 235.50,
      currency: 'USD',
      taxAmount: 21.50,
      description: 'Dinner with Client Stakeholders',
      merchantName: 'The Rotunda SF',
      receiptAttachmentUrl: '/uploads/receipts/dinner_sfo_002.jpg',
      receiptFileName: 'dinner_sfo_002.jpg',
      receiptFileSize: 850000,
      receiptMimeType: 'image/jpeg',
      isReceiptVerified: true,
      createdAt: '2026-02-09T15:40:00Z',
      updatedAt: '2026-02-09T15:40:00Z',
    };

    this.expenseClaims.set(sampleClaim.id, sampleClaim);
    this.expenseClaimItems.set(claimItem1.id, claimItem1);
    this.expenseClaimItems.set(claimItem2.id, claimItem2);

    const expHist1: ExpenseClaimHistory = {
      id: 'exp-hist-101-1',
      claimId: sampleClaim.id,
      companyId: 'comp-101',
      action: 'CLAIM_SUBMITTED',
      actorId: 'emp-102',
      actorName: 'Sarah Connor',
      actorRole: 'EMPLOYEE',
      fromStatus: 'DRAFT' as any,
      toStatus: 'SUBMITTED' as any,
      remarks: 'Submitted for manager review with 2 itemized receipts',
      timestamp: '2026-02-10T09:00:00Z',
    };
    this.expenseClaimHistory.set(expHist1.id, expHist1);

    // Asset Categories
    const astCatLaptop: AssetCategory = {
      id: 'ast-cat-101',
      companyId: 'comp-101',
      code: 'LAPTOPS',
      name: 'Laptops & Workstations',
      description: 'MacBooks, Dell XPS, ThinkPads',
      depreciationYears: 3,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    const astCatMonitor: AssetCategory = {
      id: 'ast-cat-102',
      companyId: 'comp-101',
      code: 'MONITORS',
      name: 'Monitors & Displays',
      description: '4K monitors, curved ultrawides, portable screens',
      depreciationYears: 4,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    const astCatPeripheral: AssetCategory = {
      id: 'ast-cat-103',
      companyId: 'comp-101',
      code: 'PERIPHERALS',
      name: 'Keyboards, Headsets & Docks',
      description: 'Mechanical keyboards, ANC headsets, Thunderbolt docks',
      depreciationYears: 2,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    this.assetCategories.set(astCatLaptop.id, astCatLaptop);
    this.assetCategories.set(astCatMonitor.id, astCatMonitor);
    this.assetCategories.set(astCatPeripheral.id, astCatPeripheral);

    // Asset Master
    const asset1: AssetMaster = {
      id: 'ast-mst-101',
      companyId: 'comp-101',
      assetCode: 'AST-LAP-001',
      name: 'Apple MacBook Pro 16" M3 Max (36GB / 1TB)',
      categoryId: astCatLaptop.id,
      categoryName: astCatLaptop.name,
      serialNumber: 'C02G89XYMD6R',
      modelNumber: 'MBP16-M3MAX-2024',
      manufacturer: 'Apple Inc.',
      purchaseDate: '2025-11-15',
      purchaseCost: 3499.00,
      currency: 'USD',
      warrantyExpiryDate: '2027-11-15',
      status: AssetStatus.ASSIGNED,
      condition: AssetCondition.EXCELLENT,
      location: 'HQ Building - Floor 4',
      currentEmployeeId: 'emp-102',
      assignedDate: '2025-12-01',
      notes: 'Primary engineering workstation assigned to Principal Architect',
      createdAt: '2025-11-20T10:00:00Z',
      updatedAt: '2025-12-01T09:00:00Z',
    };
    const asset2: AssetMaster = {
      id: 'ast-mst-102',
      companyId: 'comp-101',
      assetCode: 'AST-MON-001',
      name: 'Dell UltraSharp 27" 4K USB-C Hub Monitor',
      categoryId: astCatMonitor.id,
      categoryName: astCatMonitor.name,
      serialNumber: 'CN-0X981-74261',
      modelNumber: 'U2723QE',
      manufacturer: 'Dell',
      purchaseDate: '2025-11-15',
      purchaseCost: 620.00,
      currency: 'USD',
      warrantyExpiryDate: '2028-11-15',
      status: AssetStatus.ASSIGNED,
      condition: AssetCondition.NEW,
      location: 'HQ Building - Desk 412',
      currentEmployeeId: 'emp-102',
      assignedDate: '2025-12-01',
      notes: '4K Display paired with MacBook workstation',
      createdAt: '2025-11-20T10:00:00Z',
      updatedAt: '2025-12-01T09:00:00Z',
    };
    const asset3: AssetMaster = {
      id: 'ast-mst-103',
      companyId: 'comp-101',
      assetCode: 'AST-LAP-002',
      name: 'Lenovo ThinkPad X1 Carbon Gen 11 (32GB / 1TB)',
      categoryId: astCatLaptop.id,
      categoryName: astCatLaptop.name,
      serialNumber: 'PF-3K79LA',
      modelNumber: 'X1-CARBON-G11',
      manufacturer: 'Lenovo',
      purchaseDate: '2026-01-10',
      purchaseCost: 2199.00,
      currency: 'USD',
      warrantyExpiryDate: '2029-01-10',
      status: AssetStatus.AVAILABLE,
      condition: AssetCondition.NEW,
      location: 'IT Storage Locker 2B',
      notes: 'Spare developer workstation ready for onboarding allocation',
      createdAt: '2026-01-15T11:00:00Z',
      updatedAt: '2026-01-15T11:00:00Z',
    };

    this.assetMaster.set(asset1.id, asset1);
    this.assetMaster.set(asset2.id, asset2);
    this.assetMaster.set(asset3.id, asset3);

    // Asset Assignment Records
    const assign1: AssetAssignment = {
      id: 'ast-asg-101',
      companyId: 'comp-101',
      assetId: asset1.id,
      employeeId: 'emp-102',
      assignedDate: '2025-12-01',
      assignedCondition: AssetCondition.NEW,
      assignedBy: 'emp-101',
      assignmentNotes: 'Assigned during technical leadership onboarding',
      isReturned: false,
      createdAt: '2025-12-01T09:00:00Z',
      updatedAt: '2025-12-01T09:00:00Z',
    };
    const assign2: AssetAssignment = {
      id: 'ast-asg-102',
      companyId: 'comp-101',
      assetId: asset2.id,
      employeeId: 'emp-102',
      assignedDate: '2025-12-01',
      assignedCondition: AssetCondition.NEW,
      assignedBy: 'emp-101',
      assignmentNotes: 'Desk monitor allocation',
      isReturned: false,
      createdAt: '2025-12-01T09:00:00Z',
      updatedAt: '2025-12-01T09:00:00Z',
    };

    this.assetAssignments.set(assign1.id, assign1);
    this.assetAssignments.set(assign2.id, assign2);

    // ==========================================
    // Phase 7: Platform Services Seeds
    // ==========================================

    // 1. System Settings Defaults
    const defaultSettings: SystemSetting[] = [
      {
        id: 'sett-101',
        companyId: 'comp-101',
        settingKey: 'security.session_timeout_minutes',
        settingValue: '30',
        category: 'SECURITY',
        description: 'Automatic session invalidation threshold for idle users',
        updatedAt: '2026-01-01T00:00:00Z',
        updatedBy: 'usr-1',
      },
      {
        id: 'sett-102',
        companyId: 'comp-101',
        settingKey: 'security.multi_company_isolation',
        settingValue: 'STRICT',
        category: 'SECURITY',
        description: 'Server-side multi-tenant header isolation policy',
        updatedAt: '2026-01-01T00:00:00Z',
        updatedBy: 'usr-1',
      },
      {
        id: 'sett-103',
        companyId: 'comp-101',
        settingKey: 'attendance.grace_period_minutes',
        settingValue: '15',
        category: 'ATTENDANCE',
        description: 'Standard daily punctuality grace window before late penalty',
        updatedAt: '2026-01-01T00:00:00Z',
        updatedBy: 'usr-1',
      },
      {
        id: 'sett-104',
        companyId: 'comp-101',
        settingKey: 'leave.auto_escalation_days',
        settingValue: '3',
        category: 'LEAVE',
        description: 'Days before unapproved leave requests escalate to secondary manager',
        updatedAt: '2026-01-01T00:00:00Z',
        updatedBy: 'usr-1',
      },
      {
        id: 'sett-105',
        companyId: 'comp-101',
        settingKey: 'payroll.default_pay_cycle_day',
        settingValue: '28',
        category: 'PAYROLL',
        description: 'Default calendar day of month for monthly payroll finalization',
        updatedAt: '2026-01-01T00:00:00Z',
        updatedBy: 'usr-1',
      },
      {
        id: 'sett-106',
        companyId: 'comp-101',
        settingKey: 'notifications.in_app_enabled',
        settingValue: 'true',
        category: 'NOTIFICATIONS',
        description: 'Enable real-time in-app notification routing engine',
        updatedAt: '2026-01-01T00:00:00Z',
        updatedBy: 'usr-1',
      },
    ];

    for (const setting of defaultSettings) {
      this.systemSettings.set(setting.id, setting);
    }

    // 2. Custom Roles & System Roles
    const systemRoles: CustomRoleDefinition[] = [
      {
        id: 'role-101',
        companyId: 'comp-101',
        roleKey: UserRole.SUPER_ADMIN,
        name: 'Super Administrator',
        description: 'Unrestricted full system administrative and technical governance access',
        isSystemRole: true,
        permissions: Object.values(PermissionKey),
        userCount: 1,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'role-102',
        companyId: 'comp-101',
        roleKey: UserRole.HR_ADMIN,
        name: 'Human Resources Administrator',
        description: 'Full operational control over organization, employees, attendance, leave and separation',
        isSystemRole: true,
        permissions: [
          PermissionKey.ORGANIZATION_VIEW,
          PermissionKey.ORGANIZATION_MANAGE,
          PermissionKey.EMPLOYEE_VIEW,
          PermissionKey.EMPLOYEE_MANAGE,
          PermissionKey.ATTENDANCE_VIEW,
          PermissionKey.ATTENDANCE_RECORD,
          PermissionKey.ATTENDANCE_APPROVE,
          PermissionKey.ATTENDANCE_MANAGE,
          PermissionKey.SHIFT_VIEW,
          PermissionKey.SHIFT_MANAGE,
          PermissionKey.SHIFT_ASSIGN,
          PermissionKey.OVERTIME_VIEW,
          PermissionKey.OVERTIME_APPLY,
          PermissionKey.OVERTIME_APPROVE,
          PermissionKey.OVERTIME_MANAGE,
          PermissionKey.ATTENDANCE_PERIOD_VIEW,
          PermissionKey.ATTENDANCE_PERIOD_MANAGE,
          PermissionKey.ATTENDANCE_PERIOD_FINALIZE,
          PermissionKey.ATTENDANCE_PERIOD_REOPEN,
          PermissionKey.LEAVE_VIEW,
          PermissionKey.LEAVE_APPLY,
          PermissionKey.LEAVE_APPROVE,
          PermissionKey.RECRUITMENT_VIEW,
          PermissionKey.RECRUITMENT_MANAGE,
          PermissionKey.ONBOARDING_MANAGE,
          PermissionKey.PERFORMANCE_VIEW,
          PermissionKey.PERFORMANCE_MANAGE,
          PermissionKey.ASSET_VIEW,
          PermissionKey.ASSET_MANAGE,
          PermissionKey.OFFBOARDING_VIEW,
          PermissionKey.OFFBOARDING_MANAGE,
          PermissionKey.REPORTS_VIEW,
          PermissionKey.REPORTS_EXPORT,
          PermissionKey.ADMIN_USERS_MANAGE,
          PermissionKey.ADMIN_AUDIT_VIEW,
        ],
        userCount: 1,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'role-103',
        companyId: 'comp-101',
        roleKey: UserRole.MANAGER,
        name: 'Department / Line Manager',
        description: 'Team management, direct approvals for attendance, leave, expenses and appraisals',
        isSystemRole: true,
        permissions: [
          PermissionKey.ORGANIZATION_VIEW,
          PermissionKey.EMPLOYEE_VIEW,
          PermissionKey.ATTENDANCE_VIEW,
          PermissionKey.ATTENDANCE_RECORD,
          PermissionKey.ATTENDANCE_APPROVE,
          PermissionKey.SHIFT_VIEW,
          PermissionKey.OVERTIME_VIEW,
          PermissionKey.OVERTIME_APPLY,
          PermissionKey.OVERTIME_APPROVE,
          PermissionKey.LEAVE_VIEW,
          PermissionKey.LEAVE_APPLY,
          PermissionKey.LEAVE_APPROVE,
          PermissionKey.PERFORMANCE_VIEW,
          PermissionKey.EXPENSE_APPLY,
          PermissionKey.EXPENSE_APPROVE,
          PermissionKey.ASSET_VIEW,
          PermissionKey.OFFBOARDING_VIEW,
          PermissionKey.OFFBOARDING_MANAGE,
          PermissionKey.REPORTS_VIEW,
          PermissionKey.PAYROLL_PAYSLIP_SELF_VIEW,
        ],
        userCount: 1,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'role-104',
        companyId: 'comp-101',
        roleKey: UserRole.EMPLOYEE,
        name: 'Employee Self-Service (ESS)',
        description: 'Standard employee portal access for personal requests, punches, balances and payslips',
        isSystemRole: true,
        permissions: [
          PermissionKey.ATTENDANCE_VIEW,
          PermissionKey.ATTENDANCE_RECORD,
          PermissionKey.OVERTIME_VIEW,
          PermissionKey.OVERTIME_APPLY,
          PermissionKey.LEAVE_VIEW,
          PermissionKey.LEAVE_APPLY,
          PermissionKey.EXPENSE_APPLY,
          PermissionKey.ASSET_VIEW,
          PermissionKey.OFFBOARDING_VIEW,
          PermissionKey.PAYROLL_PAYSLIP_SELF_VIEW,
        ],
        userCount: 1,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'role-105',
        companyId: 'comp-101',
        roleKey: 'COMPLIANCE_OFFICER',
        name: 'Internal Auditor & Compliance Officer',
        description: 'Custom governance role with read-only access across audit trails, reports and logs',
        isSystemRole: false,
        permissions: [
          PermissionKey.ORGANIZATION_VIEW,
          PermissionKey.EMPLOYEE_VIEW,
          PermissionKey.ATTENDANCE_VIEW,
          PermissionKey.LEAVE_VIEW,
          PermissionKey.PAYROLL_VIEW,
          PermissionKey.REPORTS_VIEW,
          PermissionKey.REPORTS_EXPORT,
          PermissionKey.ADMIN_AUDIT_VIEW,
        ],
        userCount: 0,
        createdAt: '2026-02-01T00:00:00Z',
        updatedAt: '2026-02-01T00:00:00Z',
      },
    ];

    for (const role of systemRoles) {
      this.customRoles.set(role.id, role);
    }

    // 3. User Multi-Company Access
    const accessEntries: UserCompanyAccessEntry[] = [
      {
        id: 'uca-101',
        userId: 'usr-1',
        companyId: 'comp-101',
        companyName: 'Acme Enterprise Solutions',
        companyCode: 'ACME',
        isDefault: true,
        grantedAt: '2026-01-01T00:00:00Z',
        grantedBy: 'system',
      },
      {
        id: 'uca-102',
        userId: 'usr-1',
        companyId: 'comp-102',
        companyName: 'Nexus Tech Global',
        companyCode: 'NEXUS',
        isDefault: false,
        grantedAt: '2026-01-01T00:00:00Z',
        grantedBy: 'system',
      },
      {
        id: 'uca-103',
        userId: 'usr-2',
        companyId: 'comp-101',
        companyName: 'Acme Enterprise Solutions',
        companyCode: 'ACME',
        isDefault: true,
        grantedAt: '2026-01-01T00:00:00Z',
        grantedBy: 'usr-1',
      },
      {
        id: 'uca-104',
        userId: 'usr-3',
        companyId: 'comp-101',
        companyName: 'Acme Enterprise Solutions',
        companyCode: 'ACME',
        isDefault: true,
        grantedAt: '2026-01-01T00:00:00Z',
        grantedBy: 'usr-1',
      },
      {
        id: 'uca-105',
        userId: 'usr-4',
        companyId: 'comp-101',
        companyName: 'Acme Enterprise Solutions',
        companyCode: 'ACME',
        isDefault: true,
        grantedAt: '2026-01-01T00:00:00Z',
        grantedBy: 'usr-1',
      },
    ];

    for (const uca of accessEntries) {
      this.userCompanyAccess.set(uca.id, uca);
    }

    // 4. Initial In-App Notifications
    const initialNotifs: InAppNotification[] = [
      {
        id: 'notif-101',
        companyId: 'comp-101',
        recipientUserId: 'usr-1',
        category: 'APPROVAL',
        eventType: 'LEAVE_REQUEST_SUBMITTED',
        title: 'Pending Leave Approval',
        message: 'John Doe has submitted an Annual Leave request for 2 days (Oct 12-13).',
        linkUrl: '/leave/requests',
        severity: 'INFO',
        isRead: false,
        createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      },
      {
        id: 'notif-102',
        companyId: 'comp-101',
        recipientUserId: 'usr-1',
        category: 'EXPENSE',
        eventType: 'EXPENSE_SUBMITTED',
        title: 'Expense Claim Awaiting Review',
        message: 'Claim EXP-2026-001 ($670.00) requires manager approval.',
        linkUrl: '/expenses',
        severity: 'WARNING',
        isRead: false,
        createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      },
      {
        id: 'notif-103',
        companyId: 'comp-101',
        recipientUserId: 'usr-1',
        category: 'PAYROLL',
        eventType: 'PAYROLL_FINALIZED',
        title: 'Payroll Cycle Finalized',
        message: 'January 2026 payroll run has been finalized and payslips published.',
        linkUrl: '/payroll/runs',
        severity: 'SUCCESS',
        isRead: true,
        readAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      },
    ];

    for (const notif of initialNotifs) {
      this.inAppNotifications.set(notif.id, notif);
    }
  }

  public rollbackPerformanceCycle(cycleId: string): void {
    this.performanceCycles.delete(cycleId);
    for (const [id, g] of this.performanceGoals.entries()) {
      if (g.cycleId === cycleId) this.performanceGoals.delete(id);
    }
    for (const [id, r] of this.performanceReviews.entries()) {
      if (r.cycleId === cycleId) {
        this.performanceReviews.delete(id);
        for (const [hId, h] of this.performanceReviewHistory.entries()) {
          if (h.reviewId === id) this.performanceReviewHistory.delete(hId);
        }
      }
    }
  }

  public rollbackPerformanceGoal(goalId: string): void {
    this.performanceGoals.delete(goalId);
  }

  public rollbackPerformanceReview(reviewId: string): void {
    this.performanceReviews.delete(reviewId);
    for (const [id, h] of this.performanceReviewHistory.entries()) {
      if (h.reviewId === reviewId) this.performanceReviewHistory.delete(id);
    }
=======
>>>>>>> 4a1448526a9835d6aa52ec14365c16a1afc6f77f
  }

  public rollbackSalaryStructure(structureId: string): void {
    this.salaryStructures.delete(structureId);
    for (const [id, sc] of this.salaryStructureComponents.entries()) {
      if (sc.salaryStructureId === structureId) {
        this.salaryStructureComponents.delete(id);
      }
    }
  }

  public rollbackCompensationAssignment(assignmentId: string): void {
    this.employeeCompensationAssignments.delete(assignmentId);
    for (const [id, o] of this.employeeCompensationOverrides.entries()) {
      if (o.compensationAssignmentId === assignmentId) {
        this.employeeCompensationOverrides.delete(id);
      }
    }
  }

  public rollbackPayrollCalendar(calendarId: string): void {
    this.payrollCalendars.delete(calendarId);
    for (const [id, p] of this.payrollPeriods.entries()) {
      if (p.payrollCalendarId === calendarId) {
        this.payrollPeriods.delete(id);
      }
    }
  }

  public rollbackLeavePolicy(policyId: string): void {
    this.leavePolicies.delete(policyId);
    for (const [id, r] of this.leavePolicyRules.entries()) {
      if (r.leavePolicyId === policyId) {
        this.leavePolicyRules.delete(id);
      }
    }
    for (const [id, e] of this.leavePolicyEligibilities.entries()) {
      if (e.leavePolicyId === policyId) {
        this.leavePolicyEligibilities.delete(id);
      }
    }
  }

  public rollbackLeaveAssignment(assignmentId: string): void {
    this.employeeLeavePolicyAssignments.delete(assignmentId);
  }

  public rollbackOvertime(companyId: string, employeeId?: string, attendanceDate?: string): void {
    for (const [id, req] of this.overtimeRequests.entries()) {
      if (req.companyId === companyId) {
        if (!employeeId || req.employeeId === employeeId) {
          if (!attendanceDate || req.attendanceDate === attendanceDate) {
            this.overtimeRequests.delete(id);
          }
        }
      }
    }
  }

  public rollbackPeriod(periodId: string): void {
    this.attendancePeriods.delete(periodId);
    for (const [id, s] of this.attendancePeriodSummaries.entries()) {
      if (s.periodId === periodId) {
        this.attendancePeriodSummaries.delete(id);
      }
    }
  }

  public rollbackEmployee(employeeId: string): void {
    this.employees.delete(employeeId);
    for (const [id, a] of this.employeeAssignments.entries()) {
      if (a.employeeId === employeeId) this.employeeAssignments.delete(id);
    }
    for (const [id, addr] of this.employeeAddresses.entries()) {
      if (addr.employeeId === employeeId) this.employeeAddresses.delete(id);
    }
    for (const [id, emg] of this.employeeEmergencyContacts.entries()) {
      if (emg.employeeId === employeeId) this.employeeEmergencyContacts.delete(id);
    }
    for (const [id, b] of this.employeeBankAccounts.entries()) {
      if (b.employeeId === employeeId) this.employeeBankAccounts.delete(id);
    }
    for (const [id, s] of this.employeeStatutoryDetails.entries()) {
      if (s.employeeId === employeeId) this.employeeStatutoryDetails.delete(id);
    }
    for (const [id, d] of this.employeeDocuments.entries()) {
      if (d.employeeId === employeeId) this.employeeDocuments.delete(id);
    }
    for (const [id, h] of this.employeeStatusHistory.entries()) {
      if (h.employeeId === employeeId) this.employeeStatusHistory.delete(id);
    }
    for (const [id, esa] of this.employeeShiftAssignments.entries()) {
      if (esa.employeeId === employeeId) this.employeeShiftAssignments.delete(id);
    }
    for (const [id, r] of this.shiftRosterEntries.entries()) {
      if (r.employeeId === employeeId) this.shiftRosterEntries.delete(id);
    }
    for (const [id, p] of this.attendancePunches.entries()) {
      if (p.employeeId === employeeId) this.attendancePunches.delete(id);
    }
    for (const [id, d] of this.dailyAttendance.entries()) {
      if (d.employeeId === employeeId) this.dailyAttendance.delete(id);
    }
    for (const [id, reg] of this.attendanceRegularizationRequests.entries()) {
      if (reg.employeeId === employeeId) this.attendanceRegularizationRequests.delete(id);
    }
  }

  public rollbackShift(shiftId: string): void {
    this.shifts.delete(shiftId);
    for (const [id, b] of this.shiftBreaks.entries()) {
      if (b.shiftId === shiftId) this.shiftBreaks.delete(id);
    }
    for (const [id, w] of this.weeklyOffRules.entries()) {
      if (w.shiftId === shiftId) this.weeklyOffRules.delete(id);
    }
  }

  public rollbackAttendance(employeeId: string, attendanceDate?: string): void {
    for (const [id, p] of this.attendancePunches.entries()) {
      if (p.employeeId === employeeId) {
        if (!attendanceDate || p.punchTime.startsWith(attendanceDate)) {
          this.attendancePunches.delete(id);
        }
      }
    }
    for (const [id, d] of this.dailyAttendance.entries()) {
      if (d.employeeId === employeeId) {
        if (!attendanceDate || d.attendanceDate === attendanceDate) {
          this.dailyAttendance.delete(id);
        }
      }
    }
    for (const [id, r] of this.attendanceRegularizationRequests.entries()) {
      if (r.employeeId === employeeId) {
        if (!attendanceDate || r.attendanceDate === attendanceDate) {
          this.attendanceRegularizationRequests.delete(id);
        }
      }
    }
  }

  public rollbackReconciliation(companyId: string, employeeId?: string, attendanceDate?: string): void {
    for (const [id, rec] of this.leaveAttendanceReconciliations.entries()) {
      if (rec.companyId === companyId) {
        if (!employeeId || rec.employeeId === employeeId) {
          if (!attendanceDate || rec.attendanceDate === attendanceDate) {
            this.leaveAttendanceReconciliations.delete(id);
          }
        }
      }
    }
  }

  public rollbackJobRequisition(requisitionId: string): void {
    this.jobRequisitions.delete(requisitionId);
  }

  public rollbackCandidate(candidateId: string): void {
    this.candidates.delete(candidateId);
  }

  public rollbackApplication(applicationId: string): void {
    this.applications.delete(applicationId);
    for (const [id, int] of this.recruitmentInterviews.entries()) {
      if (int.applicationId === applicationId) this.recruitmentInterviews.delete(id);
    }
    for (const [id, off] of this.jobOffers.entries()) {
      if (off.applicationId === applicationId) this.jobOffers.delete(id);
    }
    for (const [id, hist] of this.candidateStatusHistory.entries()) {
      if (hist.applicationId === applicationId) this.candidateStatusHistory.delete(id);
    }
  }

  public rollbackOnboarding(onboardingId: string): void {
    this.employeeOnboardings.delete(onboardingId);
    for (const [id, t] of this.onboardingTasks.entries()) {
      if (t.onboardingId === onboardingId) this.onboardingTasks.delete(id);
    }
    for (const [id, d] of this.onboardingDocuments.entries()) {
      if (d.onboardingId === onboardingId) this.onboardingDocuments.delete(id);
    }
  }
}
