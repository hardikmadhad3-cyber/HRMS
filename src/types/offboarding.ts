/**
 * Phase 6C: Employee Offboarding & Separation Types
 * End-to-end Lifecycle, Clearance Checklist & Audit Preservation
 */

export enum SeparationType {
  RESIGNATION = 'RESIGNATION',
  TERMINATION_VOLUNTARY = 'TERMINATION_VOLUNTARY',
  TERMINATION_INVOLUNTARY = 'TERMINATION_INVOLUNTARY',
  RETIREMENT = 'RETIREMENT',
  CONTRACT_END = 'CONTRACT_END',
  PROBATION_SEPARATION = 'PROBATION_SEPARATION',
}

export enum OffboardingStatus {
  INITIATED = 'INITIATED',
  APPROVED = 'APPROVED',
  CLEARANCE_IN_PROGRESS = 'CLEARANCE_IN_PROGRESS',
  CLEARANCE_COMPLETED = 'CLEARANCE_COMPLETED',
  EXIT_INTERVIEW_COMPLETED = 'EXIT_INTERVIEW_COMPLETED',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
}

export enum ClearanceDepartment {
  MANAGER = 'MANAGER',
  IT_ASSET = 'IT_ASSET',
  HR = 'HR',
  FINANCE = 'FINANCE',
}

export enum ClearanceItemStatus {
  PENDING = 'PENDING',
  CLEARED = 'CLEARED',
  WAIVED = 'WAIVED',
  BLOCKED = 'BLOCKED',
}

export interface OffboardingClearanceItem {
  id: string;
  offboardingId: string;
  companyId: string;
  department: ClearanceDepartment;
  itemKey: string;
  itemTitle: string;
  description?: string;
  status: ClearanceItemStatus;
  clearedBy?: string;
  clearedByName?: string;
  clearedAt?: string;
  remarks?: string;
  relatedAssetId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExitInterview {
  id: string;
  offboardingId: string;
  companyId: string;
  employeeId: string;
  interviewDate: string;
  conductedBy: string;
  conductedByName?: string;
  primaryReasonForLeaving: string;
  overallExperienceRating: number; // 1 - 5
  managerFeedbackRating: number; // 1 - 5
  companyCultureRating: number; // 1 - 5
  compensationFeedback?: string;
  suggestionsForImprovement?: string;
  wouldRecommendCompany: boolean;
  confidentialNotes?: string;
  completedAt: string;
}

export interface OffboardingRequest {
  id: string;
  companyId: string;
  requestNumber: string;
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  departmentName?: string;
  designationName?: string;
  managerId?: string;
  managerName?: string;
  separationType: SeparationType;
  reason: string;
  submissionDate: string;
  proposedLastWorkingDate: string;
  officialLastWorkingDate: string;
  noticePeriodDays: number;
  noticePeriodWaivedDays?: number;
  status: OffboardingStatus;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectionReason?: string;
  managerClearanceStatus: ClearanceItemStatus;
  itClearanceStatus: ClearanceItemStatus;
  hrClearanceStatus: ClearanceItemStatus;
  financeClearanceStatus: ClearanceItemStatus;
  allClearancesCompleted: boolean;
  exitInterviewCompleted: boolean;
  finalStatusTransitionDone: boolean;
  remarks?: string;
  clearanceItems?: OffboardingClearanceItem[];
  exitInterview?: ExitInterview;
  createdAt: string;
  updatedAt: string;
}

export interface OffboardingHistory {
  id: string;
  offboardingId: string;
  companyId: string;
  action: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  details: string;
  timestamp: string;
}

export interface InitiateResignationDTO {
  reason: string;
  proposedLastWorkingDate: string;
  noticePeriodDays?: number;
  remarks?: string;
}

export interface InitiateTerminationDTO {
  employeeId: string;
  separationType: SeparationType;
  reason: string;
  officialLastWorkingDate: string;
  noticePeriodDays?: number;
  noticePeriodWaivedDays?: number;
  remarks?: string;
}

export interface ApproveOffboardingDTO {
  officialLastWorkingDate?: string;
  noticePeriodWaivedDays?: number;
  remarks?: string;
}

export interface RejectOffboardingDTO {
  rejectionReason: string;
}

export interface UpdateClearanceItemDTO {
  status: ClearanceItemStatus;
  remarks?: string;
}

export interface SaveExitInterviewDTO {
  interviewDate?: string;
  primaryReasonForLeaving: string;
  overallExperienceRating: number;
  managerFeedbackRating: number;
  companyCultureRating: number;
  compensationFeedback?: string;
  suggestionsForImprovement?: string;
  wouldRecommendCompany: boolean;
  confidentialNotes?: string;
}

export interface CompleteOffboardingDTO {
  remarks?: string;
}

export interface OffboardingDashboardMetrics {
  totalOffboardings: number;
  activeCount: number;
  pendingClearanceCount: number;
  completedCount: number;
  resignationCount: number;
  terminationCount: number;
  avgNoticePeriodDays: number;
}
