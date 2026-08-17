export enum RequisitionStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ON_HOLD = 'ON_HOLD',
  CLOSED = 'CLOSED',
}

export enum RequisitionPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum ApplicationStage {
  SOURCED = 'SOURCED',
  SCREENING = 'SCREENING',
  INTERVIEW = 'INTERVIEW',
  OFFER = 'OFFER',
  HIRED = 'HIRED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
}

export enum ApplicationStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  SHORTLISTED = 'SHORTLISTED',
  INTERVIEW_SCHEDULED = 'INTERVIEW_SCHEDULED',
  INTERVIEW_COMPLETED = 'INTERVIEW_COMPLETED',
  OFFERED = 'OFFERED',
  OFFER_ACCEPTED = 'OFFER_ACCEPTED',
  OFFER_DECLINED = 'OFFER_DECLINED',
  HIRED = 'HIRED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
}

export enum CandidateSource {
  CAREER_PAGE = 'CAREER_PAGE',
  REFERRAL = 'REFERRAL',
  LINKEDIN = 'LINKEDIN',
  JOB_BOARD = 'JOB_BOARD',
  AGENCY = 'AGENCY',
  DIRECT = 'DIRECT',
  INTERNAL = 'INTERNAL',
}

export enum InterviewType {
  VIDEO = 'VIDEO',
  PHONE = 'PHONE',
  IN_PERSON = 'IN_PERSON',
  TECHNICAL_TEST = 'TECHNICAL_TEST',
}

export enum InterviewStatus {
  SCHEDULED = 'SCHEDULED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  RESCHEDULED = 'RESCHEDULED',
  NO_SHOW = 'NO_SHOW',
}

export enum InterviewRecommendation {
  STRONG_YES = 'STRONG_YES',
  YES = 'YES',
  NEUTRAL = 'NEUTRAL',
  NO = 'NO',
  STRONG_NO = 'STRONG_NO',
}

export enum OfferStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  SENT = 'SENT',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  EXPIRED = 'EXPIRED',
  WITHDRAWN = 'WITHDRAWN',
}

export enum OnboardingStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum OnboardingTaskCategory {
  HR = 'HR',
  IT = 'IT',
  FINANCE = 'FINANCE',
  WORKSPACE = 'WORKSPACE',
  COMPLIANCE = 'COMPLIANCE',
  TRAINING = 'TRAINING',
}

export enum OnboardingTaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  WAIVED = 'WAIVED',
}

export enum OnboardingDocType {
  GOVERNMENT_ID = 'GOVERNMENT_ID',
  ADDRESS_PROOF = 'ADDRESS_PROOF',
  EDUCATION_CERTIFICATE = 'EDUCATION_CERTIFICATE',
  PREVIOUS_EMPLOYMENT_RELIEVING = 'PREVIOUS_EMPLOYMENT_RELIEVING',
  PAYSLIP_LAST3_MONTHS = 'PAYSLIP_LAST3_MONTHS',
  SIGNED_OFFER_LETTER = 'SIGNED_OFFER_LETTER',
  BANK_PASSBOOK_OR_CHEQUE = 'BANK_PASSBOOK_OR_CHEQUE',
  TAX_IDENTIFIER_DOC = 'TAX_IDENTIFIER_DOC',
}

export enum OnboardingDocStatus {
  PENDING = 'PENDING',
  SUBMITTED = 'SUBMITTED',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

// -------------------------------------------------------------------------
// RECRUITMENT INTERFACES
// -------------------------------------------------------------------------

export interface JobRequisition {
  id: string;
  companyId: string;
  requisitionNumber: string;
  title: string;
  departmentId: string;
  departmentName?: string;
  designationId: string;
  designationName?: string;
  branchId?: string;
  branchName?: string;
  workLocationId: string;
  workLocationName?: string;
  openingsCount: number;
  filledCount: number;
  minExperienceYears: number;
  maxExperienceYears: number;
  minSalary: number;
  maxSalary: number;
  currency: string;
  employmentType: string; // FULL_TIME, PART_TIME, CONTRACT, INTERN
  priority: RequisitionPriority;
  status: RequisitionStatus;
  hiringManagerId?: string;
  hiringManagerName?: string;
  recruiterId?: string;
  recruiterName?: string;
  jobDescription?: string;
  requiredSkills: string[];
  targetHireDate?: string;
  activeApplicationsCount?: number;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Candidate {
  id: string;
  companyId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  currentCompany?: string;
  currentDesignation?: string;
  currentCtc?: number;
  expectedCtc?: number;
  currency: string;
  experienceYears: number;
  noticePeriodDays: number;
  skills: string[];
  resumeUrl?: string;
  source: CandidateSource;
  status: 'ACTIVE' | 'ARCHIVED' | 'HIRED' | 'BLACKLISTED';
  employeeId?: string; // Linked when hired and onboarded
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Application {
  id: string;
  companyId: string;
  candidateId: string;
  candidateName?: string;
  candidateEmail?: string;
  candidatePhone?: string;
  candidateSkills?: string[];
  candidateExperienceYears?: number;
  requisitionId: string;
  requisitionTitle?: string;
  requisitionNumber?: string;
  departmentName?: string;
  designationName?: string;
  applicationNumber: string;
  appliedDate: string;
  stage: ApplicationStage;
  status: ApplicationStatus;
  source: CandidateSource;
  rating?: number; // 1 to 5
  rejectionReason?: string;
  recruiterId?: string;
  recruiterName?: string;
  hiringManagerId?: string;
  hiringManagerName?: string;
  interviewsCount?: number;
  hasOffer?: boolean;
  offerStatus?: OfferStatus;
  offerId?: string;
  createdAt: string;
  updatedAt: string;
}

export type RecruitmentApplication = Application;

export interface RecruitmentInterview {
  id: string;
  companyId: string;
  applicationId: string;
  candidateId: string;
  candidateName?: string;
  requisitionId?: string;
  requisitionTitle?: string;
  roundNumber: number;
  roundName: string;
  interviewType: InterviewType;
  scheduledStartTime: string;
  scheduledEndTime: string;
  meetingLink?: string;
  location?: string;
  interviewerIds: string[];
  interviewerNames?: string[];
  status: InterviewStatus;
  
  // Scorecard / Feedback
  feedbackSubmitted: boolean;
  feedbackRating?: number; // 1 to 5
  feedbackRecommendation?: InterviewRecommendation;
  feedbackStrengths?: string;
  feedbackWeaknesses?: string;
  feedbackNotes?: string;
  feedbackSubmittedAt?: string;
  feedbackSubmittedBy?: string;
  feedbackSubmittedByName?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface JobOffer {
  id: string;
  companyId: string;
  applicationId: string;
  candidateId: string;
  candidateName?: string;
  candidateEmail?: string;
  requisitionId: string;
  requisitionTitle?: string;
  offerNumber: string;
  version: number;
  
  designationId: string;
  designationName: string;
  departmentId: string;
  departmentName: string;
  branchId?: string;
  branchName?: string;
  workLocationId: string;
  workLocationName: string;
  
  joiningDate: string;
  annualCtc: number;
  currency: string;
  basicSalary: number;
  hraSalary: number;
  specialAllowance: number;
  variableBonus: number;
  probationMonths: number;
  noticePeriodDays: number;
  
  status: OfferStatus;
  issuedDate?: string;
  expiryDate?: string;
  acceptedAt?: string;
  declinedReason?: string;
  
  createdBy: string;
  createdByName?: string;
  approvedBy?: string;
  approvedByName?: string;
  notes?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface CandidateStatusHistory {
  id: string;
  companyId: string;
  candidateId: string;
  applicationId: string;
  previousStage?: ApplicationStage;
  newStage: ApplicationStage;
  previousStatus?: ApplicationStatus;
  newStatus: ApplicationStatus;
  reason?: string;
  changedBy: string;
  changedByName?: string;
  createdAt: string;
}

// -------------------------------------------------------------------------
// ONBOARDING INTERFACES
// -------------------------------------------------------------------------

export interface OnboardingTemplateTask {
  title: string;
  description: string;
  category: OnboardingTaskCategory;
  daysFromJoining: number;
  defaultAssigneeRole?: string;
}

export interface OnboardingTemplate {
  id: string;
  companyId: string;
  templateName: string;
  description: string;
  departmentId?: string;
  departmentName?: string;
  isActive: boolean;
  tasks: OnboardingTemplateTask[];
  requiredDocuments: OnboardingDocType[];
  createdAt: string;
  updatedAt: string;
}

export interface OnboardingTask {
  id: string;
  companyId: string;
  onboardingId: string;
  title: string;
  description?: string;
  category: OnboardingTaskCategory;
  dueDate: string;
  assigneeId?: string;
  assigneeName?: string;
  status: OnboardingTaskStatus;
  completedAt?: string;
  completedBy?: string;
  completedByName?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OnboardingDocument {
  id: string;
  companyId: string;
  onboardingId: string;
  documentType: OnboardingDocType;
  documentName: string;
  fileUrl?: string;
  status: OnboardingDocStatus;
  rejectionReason?: string;
  submittedAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  verifiedByName?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeOnboarding {
  id: string;
  companyId: string;
  candidateId: string;
  applicationId: string;
  jobOfferId: string;
  templateId?: string;
  onboardingNumber: string;
  
  // Candidate Profile
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  
  // Organization Placement Details
  departmentId: string;
  departmentName: string;
  designationId: string;
  designationName: string;
  branchId: string;
  branchName: string;
  workLocationId: string;
  workLocationName: string;
  joiningDate: string;
  
  // Status & Progress
  status: OnboardingStatus;
  overallProgress: number; // 0 to 100
  tasksCompletedCount: number;
  tasksTotalCount: number;
  docsVerifiedCount: number;
  docsTotalCount: number;
  
  // Joining & Handoff
  employeeId?: string; // Populated upon successful handoff to Employee Master
  employeeCode?: string;
  completedAt?: string;
  completedBy?: string;
  
  // Joining Profile Payload
  joiningDetails: {
    gender?: 'MALE' | 'FEMALE' | 'OTHER';
    dateOfBirth?: string;
    maritalStatus?: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';
    nationality?: string;
    bloodGroup?: string;
    reportingManagerId?: string;
    reportingManagerName?: string;
    shiftId?: string;
    employmentType?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    panNumber?: string;
    aadhaarNumber?: string;
    uanNumber?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    emergencyContactRelation?: string;
    addressLine1?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    annualCtc?: number;
    basicSalary?: number;
    hraSalary?: number;
  };
  
  // Populated relations
  tasks?: OnboardingTask[];
  documents?: OnboardingDocument[];
  
  createdAt: string;
  updatedAt: string;
}

export interface RecruitmentDashboardSummary {
  activeRequisitionsCount: number;
  totalOpeningsCount: number;
  totalCandidatesCount: number;
  activeApplicationsCount: number;
  interviewsThisWeekCount: number;
  pendingOffersCount: number;
  activeOnboardingsCount: number;
  hiredThisMonthCount: number;
  
  stageDistribution: {
    stage: ApplicationStage;
    count: number;
  }[];
  
  recentApplications: Application[];
  upcomingInterviews: RecruitmentInterview[];
  recentOffers: JobOffer[];
}
