/**
 * Performance Management Types (Phase 6A)
 * Covers Performance Cycles, Goal/KRA/KPIs, Templates, Self & Manager Reviews, Ratings, History & Dashboard
 */

export enum PerformanceCycleType {
  ANNUAL = 'ANNUAL',
  HALF_YEARLY = 'HALF_YEARLY',
  QUARTERLY = 'QUARTERLY',
  PROBATION = 'PROBATION',
  PROJECT = 'PROJECT',
}

export enum PerformanceCycleStatus {
  DRAFT = 'DRAFT',
  GOAL_SETTING = 'GOAL_SETTING',
  ACTIVE = 'ACTIVE',
  SELF_REVIEW = 'SELF_REVIEW',
  MANAGER_REVIEW = 'MANAGER_REVIEW',
  FINALIZING = 'FINALIZING',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

export enum MeasurementType {
  PERCENTAGE = 'PERCENTAGE',
  NUMERIC = 'NUMERIC',
  CURRENCY = 'CURRENCY',
  BOOLEAN = 'BOOLEAN',
  MILESTONE = 'MILESTONE',
}

export enum PerformanceGoalStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum PerformanceReviewStatus {
  DRAFT = 'DRAFT',
  GOALS_SUBMITTED = 'GOALS_SUBMITTED',
  SELF_REVIEW_PENDING = 'SELF_REVIEW_PENDING',
  MANAGER_REVIEW_PENDING = 'MANAGER_REVIEW_PENDING',
  IN_REVIEW = 'IN_REVIEW',
  COMPLETED = 'COMPLETED',
  FINALIZED = 'FINALIZED',
}

export enum ManagerRecommendation {
  NONE = 'NONE',
  PROMOTION = 'PROMOTION',
  SALARY_HIKE = 'SALARY_HIKE',
  BONUS = 'BONUS',
  TRAINING = 'TRAINING',
  PIP = 'PIP',
  ROLE_CHANGE = 'ROLE_CHANGE',
}

export interface RatingScaleItem {
  rating: number;
  label: string;
  description?: string;
  minScore: number;
  maxScore: number;
}

export interface CompetencyItem {
  id: string;
  name: string;
  category?: string;
  description: string;
  weightage: number; // e.g. 20 (sum = 100)
}

export interface PerformanceReviewTemplate {
  id: string;
  companyId: string;
  code: string;
  name: string;
  description?: string;
  ratingScale: RatingScaleItem[];
  competencies: CompetencyItem[];
  goalWeightagePct: number; // e.g. 60%
  competencyWeightagePct: number; // e.g. 40%
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PerformanceCycle {
  id: string;
  companyId: string;
  code: string;
  name: string;
  cycleType: PerformanceCycleType;
  startDate: string;
  endDate: string;
  selfReviewDeadline: string;
  managerReviewDeadline: string;
  status: PerformanceCycleStatus;
  description?: string;
  defaultTemplateId?: string;
  templateName?: string;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
  // Aggregate stats
  totalParticipants?: number;
  goalsSubmittedCount?: number;
  selfReviewsCompletedCount?: number;
  managerReviewsCompletedCount?: number;
  finalizedReviewsCount?: number;
}

export interface GoalCategory {
  id: string;
  companyId: string;
  code: string;
  name: string;
  description?: string;
  defaultWeightage: number;
  isActive: boolean;
  createdAt: string;
}

export interface PerformanceGoal {
  id: string;
  companyId: string;
  cycleId: string;
  cycleName?: string;
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  departmentName?: string;
  category: string;
  title: string;
  description?: string;
  measurementType: MeasurementType;
  targetValue: number;
  unit: string;
  currentValue: number;
  weightage: number; // 0 - 100
  dueDate?: string;
  status: PerformanceGoalStatus;
  parentGoalId?: string;
  parentGoalTitle?: string;
  isManagerGoal: boolean;
  selfRating?: number;
  selfComment?: string;
  managerRating?: number;
  managerComment?: string;
  finalScore?: number;
  createdBy: string;
  createdByName?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewCompetencyRating {
  competencyId: string;
  competencyName: string;
  weightage: number;
  rating: number; // 1 - 5
  comment?: string;
}

export interface PerformanceReview {
  id: string;
  companyId: string;
  cycleId: string;
  cycleName?: string;
  cycleStatus?: PerformanceCycleStatus;
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  employeeDepartment?: string;
  employeeDesignation?: string;
  reviewerId: string;
  reviewerName?: string;
  reviewerCode?: string;
  templateId: string;
  templateName?: string;
  status: PerformanceReviewStatus;
  // Self Review Section
  selfOverallRating?: number;
  selfOverallComments?: string;
  selfStrengths?: string;
  selfImprovements?: string;
  selfSubmittedAt?: string;
  selfCompetencyRatings: ReviewCompetencyRating[];
  // Manager Review Section
  managerOverallRating?: number;
  managerOverallComments?: string;
  managerStrengths?: string;
  managerImprovements?: string;
  managerRecommendations?: ManagerRecommendation;
  managerSubmittedAt?: string;
  managerCompetencyRatings: ReviewCompetencyRating[];
  // Final Review Result
  finalRating?: number;
  finalScore?: number;
  finalGrade?: string;
  finalComments?: string;
  finalizedBy?: string;
  finalizedByName?: string;
  finalizedAt?: string;
  isFinalized: boolean;
  // Goals associated with this review
  goals?: PerformanceGoal[];
  createdAt: string;
  updatedAt: string;
}

export interface PerformanceReviewHistory {
  id: string;
  companyId: string;
  reviewId: string;
  action: string;
  previousStatus?: string;
  newStatus: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  comment?: string;
  snapshotData?: Record<string, any>;
  createdAt: string;
}

export interface PerformanceDashboardMetrics {
  totalCycles: number;
  activeCycle?: PerformanceCycle;
  totalEmployeesInScope: number;
  goalsSubmittedCount: number;
  goalsApprovedCount: number;
  selfReviewsPending: number;
  managerReviewsPending: number;
  reviewsFinalized: number;
  completionRatePct: number;
  averageRating: number;
  gradeDistribution: {
    grade: string;
    label: string;
    count: number;
    percentage: number;
  }[];
  departmentRatings: {
    departmentId: string;
    departmentName: string;
    averageRating: number;
    averageScore: number;
    count: number;
  }[];
  recentActivity: PerformanceReviewHistory[];
}

// DTOs
export interface CreatePerformanceCycleDTO {
  code: string;
  name: string;
  cycleType: PerformanceCycleType;
  startDate: string;
  endDate: string;
  selfReviewDeadline: string;
  managerReviewDeadline: string;
  description?: string;
  defaultTemplateId?: string;
}

export interface UpdatePerformanceCycleDTO {
  name?: string;
  cycleType?: PerformanceCycleType;
  startDate?: string;
  endDate?: string;
  selfReviewDeadline?: string;
  managerReviewDeadline?: string;
  description?: string;
  defaultTemplateId?: string;
  status?: PerformanceCycleStatus;
}

export interface CreatePerformanceTemplateDTO {
  code: string;
  name: string;
  description?: string;
  ratingScale: RatingScaleItem[];
  competencies: CompetencyItem[];
  goalWeightagePct: number;
  competencyWeightagePct: number;
}

export interface CreatePerformanceGoalDTO {
  cycleId: string;
  employeeId?: string; // Optional if created by employee for self
  category: string;
  title: string;
  description?: string;
  measurementType: MeasurementType;
  targetValue: number;
  unit: string;
  currentValue?: number;
  weightage: number;
  dueDate?: string;
  parentGoalId?: string;
  isManagerGoal?: boolean;
}

export interface UpdatePerformanceGoalDTO {
  category?: string;
  title?: string;
  description?: string;
  measurementType?: MeasurementType;
  targetValue?: number;
  unit?: string;
  currentValue?: number;
  weightage?: number;
  dueDate?: string;
  status?: PerformanceGoalStatus;
  selfRating?: number;
  selfComment?: string;
  managerRating?: number;
  managerComment?: string;
}

export interface SubmitSelfReviewDTO {
  selfOverallRating: number;
  selfOverallComments: string;
  selfStrengths: string;
  selfImprovements: string;
  competencyRatings: {
    competencyId: string;
    rating: number;
    comment?: string;
  }[];
  goalRatings?: {
    goalId: string;
    selfRating: number;
    selfComment?: string;
    currentValue?: number;
  }[];
}

export interface SubmitManagerReviewDTO {
  managerOverallRating: number;
  managerOverallComments: string;
  managerStrengths: string;
  managerImprovements: string;
  managerRecommendations: ManagerRecommendation;
  competencyRatings: {
    competencyId: string;
    rating: number;
    comment?: string;
  }[];
  goalRatings?: {
    goalId: string;
    managerRating: number;
    managerComment?: string;
  }[];
}

export interface FinalizeReviewDTO {
  finalRating?: number; // Override or auto-computed
  finalScore?: number;
  finalGrade?: string;
  finalComments?: string;
}
