import {
  JobRequisition,
  RequisitionStatus,
  RequisitionPriority,
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
  RecruitmentDashboardSummary,
} from '../../src/types/recruitment.js';
import { AuthUser } from '../../src/types/auth.js';
import { RelationalDatabase } from '../database/RelationalDatabase.js';
import { JobRequisitionRepository, JobRequisitionFilter } from '../database/repositories/JobRequisitionRepository.js';
import { CandidateRepository, CandidateFilter } from '../database/repositories/CandidateRepository.js';
import { ApplicationRepository, ApplicationFilter } from '../database/repositories/ApplicationRepository.js';
import { RecruitmentInterviewRepository, InterviewFilter } from '../database/repositories/RecruitmentInterviewRepository.js';
import { JobOfferRepository, JobOfferFilter } from '../database/repositories/JobOfferRepository.js';
import { CandidateStatusHistoryRepository } from '../database/repositories/CandidateStatusHistoryRepository.js';
import { DepartmentRepository } from '../database/repositories/DepartmentRepository.js';
import { DesignationRepository } from '../database/repositories/DesignationRepository.js';
import { WorkLocationRepository } from '../database/repositories/WorkLocationRepository.js';
import { BranchRepository } from '../database/repositories/BranchRepository.js';
import { EmployeeRepository } from '../database/repositories/EmployeeRepository.js';
import { AuditService } from './AuditService.js';

export class AppError extends Error {
  public statusCode: number;
  public code: string;

  constructor(message: string, code: string = 'VALIDATION_ERROR', statusCode: number = 400) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class RecruitmentService {
  private static db = RelationalDatabase.getInstance();

  // -------------------------------------------------------------------------
  // 1. DASHBOARD SUMMARY
  // -------------------------------------------------------------------------
  public static async getDashboardSummary(companyId: string): Promise<RecruitmentDashboardSummary> {
    const requisitions = await JobRequisitionRepository.findAll(companyId);
    const candidates = await CandidateRepository.findAll(companyId);
    const applications = await ApplicationRepository.findAll(companyId);
    const interviews = await RecruitmentInterviewRepository.findAll(companyId);
    const offers = await JobOfferRepository.findAll(companyId);

    const activeReqs = requisitions.filter((r) => r.status === RequisitionStatus.APPROVED);
    const totalOpenings = activeReqs.reduce((sum, r) => sum + r.openingsCount, 0);
    const activeApps = applications.filter((a) => a.stage !== ApplicationStage.REJECTED && a.stage !== ApplicationStage.WITHDRAWN && a.stage !== ApplicationStage.HIRED);
    const pendingOffers = offers.filter((o) => o.status === OfferStatus.SENT || o.status === OfferStatus.PENDING_APPROVAL);

    // Active onboardings
    let activeOnbCount = 0;
    for (const onb of this.db.employeeOnboardings.values()) {
      if (onb.companyId === companyId && onb.status !== 'COMPLETED' && onb.status !== 'CANCELLED') {
        activeOnbCount++;
      }
    }

    const hiredApps = applications.filter((a) => a.stage === ApplicationStage.HIRED || a.status === ApplicationStatus.OFFER_ACCEPTED);

    // Stage Distribution
    const stageCounts: Record<ApplicationStage, number> = {
      [ApplicationStage.SOURCED]: 0,
      [ApplicationStage.SCREENING]: 0,
      [ApplicationStage.INTERVIEW]: 0,
      [ApplicationStage.OFFER]: 0,
      [ApplicationStage.HIRED]: 0,
      [ApplicationStage.REJECTED]: 0,
      [ApplicationStage.WITHDRAWN]: 0,
    };

    for (const app of applications) {
      if (stageCounts[app.stage] !== undefined) {
        stageCounts[app.stage]++;
      }
    }

    const stageDistribution = Object.entries(stageCounts).map(([stage, count]) => ({
      stage: stage as ApplicationStage,
      count,
    }));

    const upcomingInterviews = interviews
      .filter((i) => i.status === InterviewStatus.SCHEDULED)
      .slice(0, 5);

    return {
      activeRequisitionsCount: activeReqs.length,
      totalOpeningsCount: totalOpenings,
      totalCandidatesCount: candidates.length,
      activeApplicationsCount: activeApps.length,
      interviewsThisWeekCount: upcomingInterviews.length,
      pendingOffersCount: pendingOffers.length,
      activeOnboardingsCount: activeOnbCount,
      hiredThisMonthCount: hiredApps.length,
      stageDistribution,
      recentApplications: applications.slice(0, 6),
      upcomingInterviews,
      recentOffers: offers.slice(0, 5),
    };
  }

  // -------------------------------------------------------------------------
  // 2. JOB REQUISITIONS
  // -------------------------------------------------------------------------
  public static async getRequisitions(companyId: string, filter?: JobRequisitionFilter): Promise<JobRequisition[]> {
    return JobRequisitionRepository.findAll(companyId, filter);
  }

  public static async getRequisitionById(id: string, companyId: string): Promise<JobRequisition> {
    const req = await JobRequisitionRepository.findById(id, companyId);
    if (!req) throw new AppError('Job Requisition not found.', 'NOT_FOUND', 404);
    return req;
  }

  public static async createRequisition(
    data: {
      title: string;
      departmentId: string;
      designationId: string;
      branchId?: string;
      workLocationId: string;
      openingsCount: number;
      minExperienceYears?: number;
      maxExperienceYears?: number;
      minSalary?: number;
      maxSalary?: number;
      currency?: string;
      employmentType?: string;
      priority?: RequisitionPriority;
      hiringManagerId?: string;
      recruiterId?: string;
      jobDescription?: string;
      requiredSkills?: string[];
      targetHireDate?: string;
    },
    companyId: string,
    actor: AuthUser
  ): Promise<JobRequisition> {
    if (!data.title?.trim()) throw new AppError('Job Title is required.', 'VALIDATION_ERROR', 400);
    if (!data.departmentId) throw new AppError('Department is required.', 'VALIDATION_ERROR', 400);
    if (!data.designationId) throw new AppError('Designation is required.', 'VALIDATION_ERROR', 400);
    if (!data.workLocationId) throw new AppError('Work Location is required.', 'VALIDATION_ERROR', 400);
    if (!data.openingsCount || data.openingsCount < 1) throw new AppError('Openings count must be at least 1.', 'VALIDATION_ERROR', 400);

    const dept = await DepartmentRepository.findById(data.departmentId);
    if (!dept || dept.companyId !== companyId) throw new AppError('Invalid Department reference.', 'INVALID_REFERENCE', 400);

    const desig = await DesignationRepository.findById(data.designationId);
    if (!desig || desig.companyId !== companyId) throw new AppError('Invalid Designation reference.', 'INVALID_REFERENCE', 400);

    const loc = await WorkLocationRepository.findById(data.workLocationId);
    if (!loc || loc.companyId !== companyId) throw new AppError('Invalid Work Location reference.', 'INVALID_REFERENCE', 400);

    let branchName: string | undefined;
    if (data.branchId) {
      const branch = await BranchRepository.findById(data.branchId);
      if (!branch || branch.companyId !== companyId) throw new AppError('Invalid Branch reference.', 'INVALID_REFERENCE', 400);
      branchName = branch.name;
    }

    let hiringManagerName: string | undefined;
    if (data.hiringManagerId) {
      const hm = await EmployeeRepository.findById(data.hiringManagerId, companyId);
      if (hm) hiringManagerName = `${hm.firstName} ${hm.lastName}`;
    }

    let recruiterName: string | undefined;
    if (data.recruiterId) {
      const rec = await EmployeeRepository.findById(data.recruiterId, companyId);
      if (rec) recruiterName = `${rec.firstName} ${rec.lastName}`;
    }

    const year = new Date().getFullYear();
    const count = (await JobRequisitionRepository.findAll(companyId)).length + 1;
    const reqNumber = `REQ-${year}-${String(count).padStart(3, '0')}`;

    const newReq: JobRequisition = {
      id: `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      companyId,
      requisitionNumber: reqNumber,
      title: data.title.trim(),
      departmentId: data.departmentId,
      departmentName: dept.name,
      designationId: data.designationId,
      designationName: desig.name,
      branchId: data.branchId,
      branchName,
      workLocationId: data.workLocationId,
      workLocationName: loc.name,
      openingsCount: data.openingsCount,
      filledCount: 0,
      minExperienceYears: data.minExperienceYears ?? 0,
      maxExperienceYears: data.maxExperienceYears ?? 0,
      minSalary: data.minSalary ?? 0,
      maxSalary: data.maxSalary ?? 0,
      currency: data.currency || 'USD',
      employmentType: data.employmentType || 'FULL_TIME',
      priority: data.priority || RequisitionPriority.MEDIUM,
      status: RequisitionStatus.APPROVED, // Auto-approve for immediate usage or workflow
      hiringManagerId: data.hiringManagerId,
      hiringManagerName,
      recruiterId: data.recruiterId,
      recruiterName,
      jobDescription: data.jobDescription,
      requiredSkills: data.requiredSkills || [],
      targetHireDate: data.targetHireDate,
      createdBy: actor.id,
      createdByName: actor.fullName || actor.email,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await JobRequisitionRepository.create(newReq);

    await AuditService.log({
      actorId: actor.id,
      actorName: actor.fullName || actor.email,
      actorEmail: actor.email,
      action: 'JOB_REQUISITION_CREATED',
      targetModule: 'Recruitment',
      targetRecordId: newReq.id,
      companyId,
      changesSummary: `Created job requisition ${newReq.requisitionNumber}: ${newReq.title}`,
    });

    return newReq;
  }

  public static async updateRequisitionStatus(
    id: string,
    companyId: string,
    status: RequisitionStatus,
    actor: AuthUser
  ): Promise<JobRequisition> {
    const existing = await this.getRequisitionById(id, companyId);
    const updated = await JobRequisitionRepository.update(id, companyId, { status });
    if (!updated) throw new AppError('Failed to update requisition status.', 'UPDATE_ERROR', 500);

    await AuditService.log({
      actorId: actor.id,
      actorName: actor.fullName || actor.email,
      actorEmail: actor.email,
      action: 'JOB_REQUISITION_STATUS_UPDATED',
      targetModule: 'Recruitment',
      targetRecordId: id,
      companyId,
      changesSummary: `Updated status of ${existing.requisitionNumber} from ${existing.status} to ${status}`,
    });

    return updated;
  }

  // -------------------------------------------------------------------------
  // 3. CANDIDATES & DUPLICATE PREVENTION
  // -------------------------------------------------------------------------
  public static async getCandidates(companyId: string, filter?: CandidateFilter): Promise<Candidate[]> {
    return CandidateRepository.findAll(companyId, filter);
  }

  public static async getCandidateById(id: string, companyId: string): Promise<Candidate> {
    const cand = await CandidateRepository.findById(id, companyId);
    if (!cand) throw new AppError('Candidate not found.', 'NOT_FOUND', 404);
    return cand;
  }

  public static async createCandidate(
    data: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      currentCompany?: string;
      currentDesignation?: string;
      currentCtc?: number;
      expectedCtc?: number;
      currency?: string;
      experienceYears?: number;
      noticePeriodDays?: number;
      skills?: string[];
      resumeUrl?: string;
      source?: CandidateSource;
      notes?: string;
      applyToRequisitionId?: string;
    },
    companyId: string,
    actor: AuthUser
  ): Promise<{ candidate: Candidate; application?: Application }> {
    if (!data.firstName?.trim()) throw new AppError('First Name is required.', 'VALIDATION_ERROR', 400);
    if (!data.lastName?.trim()) throw new AppError('Last Name is required.', 'VALIDATION_ERROR', 400);
    if (!data.email?.trim()) throw new AppError('Email is required.', 'VALIDATION_ERROR', 400);
    if (!data.phone?.trim()) throw new AppError('Phone is required.', 'VALIDATION_ERROR', 400);

    // Duplicate Check by email within company
    const existingByEmail = await CandidateRepository.findByEmail(companyId, data.email);
    if (existingByEmail) {
      throw new AppError(
        `Candidate with email '${data.email}' already exists in candidate pool (${existingByEmail.fullName}).`,
        'DUPLICATE_CANDIDATE_EMAIL',
        400
      );
    }

    // Duplicate Check by phone within company
    const existingByPhone = await CandidateRepository.findByPhone(companyId, data.phone);
    if (existingByPhone) {
      throw new AppError(
        `Candidate with phone number '${data.phone}' already exists (${existingByPhone.fullName}).`,
        'DUPLICATE_CANDIDATE_PHONE',
        400
      );
    }

    const fullName = `${data.firstName.trim()} ${data.lastName.trim()}`;
    const newCandidate: Candidate = {
      id: `cand-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      companyId,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      fullName,
      email: data.email.trim().toLowerCase(),
      phone: data.phone.trim(),
      currentCompany: data.currentCompany?.trim(),
      currentDesignation: data.currentDesignation?.trim(),
      currentCtc: data.currentCtc ?? 0,
      expectedCtc: data.expectedCtc ?? 0,
      currency: data.currency || 'USD',
      experienceYears: data.experienceYears ?? 0,
      noticePeriodDays: data.noticePeriodDays ?? 30,
      skills: data.skills || [],
      resumeUrl: data.resumeUrl,
      source: data.source || CandidateSource.DIRECT,
      status: 'ACTIVE',
      notes: data.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await CandidateRepository.create(newCandidate);

    let application: Application | undefined;
    if (data.applyToRequisitionId) {
      application = await this.createApplication(
        {
          candidateId: newCandidate.id,
          requisitionId: data.applyToRequisitionId,
          source: newCandidate.source,
        },
        companyId,
        actor
      );
    }

    await AuditService.log({
      actorId: actor.id,
      actorName: actor.fullName || actor.email,
      actorEmail: actor.email,
      action: 'CANDIDATE_CREATED',
      targetModule: 'Recruitment',
      targetRecordId: newCandidate.id,
      companyId,
      changesSummary: `Added candidate ${fullName} (${newCandidate.email})`,
    });

    return { candidate: newCandidate, application };
  }

  // -------------------------------------------------------------------------
  // 4. APPLICATIONS & PIPELINE STAGES
  // -------------------------------------------------------------------------
  public static async getApplications(companyId: string, filter?: ApplicationFilter): Promise<Application[]> {
    return ApplicationRepository.findAll(companyId, filter);
  }

  public static async getApplicationById(id: string, companyId: string): Promise<Application> {
    const app = await ApplicationRepository.findById(id, companyId);
    if (!app) throw new AppError('Application not found.', 'NOT_FOUND', 404);
    return app;
  }

  public static async createApplication(
    data: {
      candidateId: string;
      requisitionId: string;
      source?: CandidateSource;
    },
    companyId: string,
    actor: AuthUser
  ): Promise<Application> {
    const candidate = await CandidateRepository.findById(data.candidateId, companyId);
    if (!candidate) throw new AppError('Candidate not found.', 'NOT_FOUND', 404);

    const requisition = await JobRequisitionRepository.findById(data.requisitionId, companyId);
    if (!requisition) throw new AppError('Job Requisition not found.', 'NOT_FOUND', 404);

    // Check duplicate application
    const existing = await ApplicationRepository.findByCandidateAndRequisition(candidate.id, requisition.id);
    if (existing) {
      throw new AppError(
        `Candidate is already assigned to requisition '${requisition.title}' (${existing.applicationNumber}).`,
        'DUPLICATE_APPLICATION',
        400
      );
    }

    const year = new Date().getFullYear();
    const count = (await ApplicationRepository.findAll(companyId)).length + 1;
    const appNumber = `APP-${year}-${String(count).padStart(3, '0')}`;

    const newApp: Application = {
      id: `app-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      companyId,
      candidateId: candidate.id,
      candidateName: candidate.fullName,
      candidateEmail: candidate.email,
      candidatePhone: candidate.phone,
      candidateSkills: candidate.skills,
      candidateExperienceYears: candidate.experienceYears,
      requisitionId: requisition.id,
      requisitionTitle: requisition.title,
      requisitionNumber: requisition.requisitionNumber,
      departmentName: requisition.departmentName,
      designationName: requisition.designationName,
      applicationNumber: appNumber,
      appliedDate: new Date().toISOString().split('T')[0],
      stage: ApplicationStage.SOURCED,
      status: ApplicationStatus.IN_PROGRESS,
      source: data.source || candidate.source || CandidateSource.DIRECT,
      recruiterId: requisition.recruiterId,
      recruiterName: requisition.recruiterName,
      hiringManagerId: requisition.hiringManagerId,
      hiringManagerName: requisition.hiringManagerName,
      interviewsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await ApplicationRepository.create(newApp);

    // Log history
    await CandidateStatusHistoryRepository.create({
      id: `csh-${Date.now()}`,
      companyId,
      candidateId: candidate.id,
      applicationId: newApp.id,
      newStage: ApplicationStage.SOURCED,
      newStatus: ApplicationStatus.IN_PROGRESS,
      reason: 'Application created in candidate pipeline',
      changedBy: actor.id,
      changedByName: actor.fullName || actor.email,
      createdAt: new Date().toISOString(),
    });

    return newApp;
  }

  public static async updateApplicationStage(
    applicationId: string,
    newStage: ApplicationStage,
    newStatus: ApplicationStatus,
    reason: string | undefined,
    companyId: string,
    actor: AuthUser
  ): Promise<Application> {
    const existing = await this.getApplicationById(applicationId, companyId);

    const updated = await ApplicationRepository.update(applicationId, companyId, {
      stage: newStage,
      status: newStatus,
      rejectionReason: newStage === ApplicationStage.REJECTED ? reason : existing.rejectionReason,
    });
    if (!updated) throw new AppError('Failed to transition application stage.', 'UPDATE_ERROR', 500);

    // Record history
    await CandidateStatusHistoryRepository.create({
      id: `csh-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      companyId,
      candidateId: existing.candidateId,
      applicationId: existing.id,
      previousStage: existing.stage,
      newStage,
      previousStatus: existing.status,
      newStatus,
      reason: reason || `Stage moved from ${existing.stage} to ${newStage}`,
      changedBy: actor.id,
      changedByName: actor.fullName || actor.email,
      createdAt: new Date().toISOString(),
    });

    await AuditService.log({
      actorId: actor.id,
      actorName: actor.fullName || actor.email,
      actorEmail: actor.email,
      action: 'APPLICATION_STAGE_CHANGED',
      targetModule: 'Recruitment',
      targetRecordId: applicationId,
      companyId,
      changesSummary: `Changed application stage from ${existing.stage} to ${newStage} (${newStatus})`,
    });

    return updated;
  }

  public static async getApplicationHistory(applicationId: string, companyId: string): Promise<CandidateStatusHistory[]> {
    return CandidateStatusHistoryRepository.findByApplicationId(applicationId, companyId);
  }

  // -------------------------------------------------------------------------
  // 5. INTERVIEWS & SCORECARDS
  // -------------------------------------------------------------------------
  public static async getInterviews(companyId: string, filter?: InterviewFilter): Promise<RecruitmentInterview[]> {
    return RecruitmentInterviewRepository.findAll(companyId, filter);
  }

  public static async scheduleInterview(
    data: {
      applicationId: string;
      roundNumber?: number;
      roundName: string;
      interviewType?: InterviewType;
      scheduledStartTime: string;
      scheduledEndTime: string;
      meetingLink?: string;
      location?: string;
      interviewerIds: string[];
    },
    companyId: string,
    actor: AuthUser
  ): Promise<RecruitmentInterview> {
    const app = await this.getApplicationById(data.applicationId, companyId);
    if (!data.roundName?.trim()) throw new AppError('Round name is required.', 'VALIDATION_ERROR', 400);
    if (!data.scheduledStartTime || !data.scheduledEndTime) throw new AppError('Interview time window is required.', 'VALIDATION_ERROR', 400);
    if (new Date(data.scheduledStartTime) >= new Date(data.scheduledEndTime)) {
      throw new AppError('Start time must be before end time.', 'VALIDATION_ERROR', 400);
    }

    const existingInterviews = await RecruitmentInterviewRepository.findByApplicationId(app.id, companyId);
    const roundNumber = data.roundNumber || existingInterviews.length + 1;

    // Resolve interviewer names
    const interviewerNames: string[] = [];
    for (const empId of data.interviewerIds || []) {
      const emp = await EmployeeRepository.findById(empId, companyId);
      if (emp) interviewerNames.push(`${emp.firstName} ${emp.lastName}`);
    }

    const newInterview: RecruitmentInterview = {
      id: `int-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      companyId,
      applicationId: app.id,
      candidateId: app.candidateId,
      candidateName: app.candidateName,
      requisitionId: app.requisitionId,
      requisitionTitle: app.requisitionTitle,
      roundNumber,
      roundName: data.roundName.trim(),
      interviewType: data.interviewType || InterviewType.VIDEO,
      scheduledStartTime: data.scheduledStartTime,
      scheduledEndTime: data.scheduledEndTime,
      meetingLink: data.meetingLink,
      location: data.location,
      interviewerIds: data.interviewerIds || [],
      interviewerNames,
      status: InterviewStatus.SCHEDULED,
      feedbackSubmitted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await RecruitmentInterviewRepository.create(newInterview);

    // Auto-advance application stage to INTERVIEW
    await this.updateApplicationStage(
      app.id,
      ApplicationStage.INTERVIEW,
      ApplicationStatus.INTERVIEW_SCHEDULED,
      `Scheduled round ${roundNumber}: ${data.roundName}`,
      companyId,
      actor
    );

    await AuditService.log({
      actorId: actor.id,
      actorName: actor.fullName || actor.email,
      actorEmail: actor.email,
      action: 'INTERVIEW_SCHEDULED',
      targetModule: 'Recruitment',
      targetRecordId: newInterview.id,
      companyId,
      changesSummary: `Scheduled ${newInterview.roundName} for candidate ${app.candidateName}`,
    });

    return newInterview;
  }

  public static async submitInterviewFeedback(
    interviewId: string,
    feedback: {
      rating: number; // 1 to 5
      recommendation: InterviewRecommendation;
      strengths?: string;
      weaknesses?: string;
      notes?: string;
    },
    companyId: string,
    actor: AuthUser
  ): Promise<RecruitmentInterview> {
    const interview = await RecruitmentInterviewRepository.findById(interviewId, companyId);
    if (!interview) throw new AppError('Interview not found.', 'NOT_FOUND', 404);
    if (!feedback.rating || feedback.rating < 1 || feedback.rating > 5) {
      throw new AppError('Feedback rating must be between 1 and 5.', 'VALIDATION_ERROR', 400);
    }
    if (!feedback.recommendation) {
      throw new AppError('Feedback recommendation is required.', 'VALIDATION_ERROR', 400);
    }

    const updated = await RecruitmentInterviewRepository.update(interviewId, companyId, {
      status: InterviewStatus.COMPLETED,
      feedbackSubmitted: true,
      feedbackRating: feedback.rating,
      feedbackRecommendation: feedback.recommendation,
      feedbackStrengths: feedback.strengths,
      feedbackWeaknesses: feedback.weaknesses,
      feedbackNotes: feedback.notes,
      feedbackSubmittedAt: new Date().toISOString(),
      feedbackSubmittedBy: actor.id,
      feedbackSubmittedByName: actor.fullName || actor.email,
    });
    if (!updated) throw new AppError('Failed to save interview feedback.', 'UPDATE_ERROR', 500);

    // Update application status
    await ApplicationRepository.update(interview.applicationId, companyId, {
      status: ApplicationStatus.INTERVIEW_COMPLETED,
      rating: feedback.rating,
    });

    await AuditService.log({
      actorId: actor.id,
      actorName: actor.fullName || actor.email,
      actorEmail: actor.email,
      action: 'INTERVIEW_FEEDBACK_SUBMITTED',
      targetModule: 'Recruitment',
      targetRecordId: interviewId,
      companyId,
      changesSummary: `Submitted interview feedback (${feedback.recommendation}, rating ${feedback.rating}/5)`,
    });

    return updated;
  }

  // -------------------------------------------------------------------------
  // 6. OFFERS & WORKFLOW
  // -------------------------------------------------------------------------
  public static async getOffers(companyId: string, filter?: JobOfferFilter): Promise<JobOffer[]> {
    return JobOfferRepository.findAll(companyId, filter);
  }

  public static async getOfferById(id: string, companyId: string): Promise<JobOffer> {
    const offer = await JobOfferRepository.findById(id, companyId);
    if (!offer) throw new AppError('Job Offer not found.', 'NOT_FOUND', 404);
    return offer;
  }

  public static async createOffer(
    data: {
      applicationId: string;
      designationId: string;
      departmentId: string;
      branchId?: string;
      workLocationId: string;
      joiningDate: string;
      annualCtc: number;
      currency?: string;
      basicSalary?: number;
      hraSalary?: number;
      specialAllowance?: number;
      variableBonus?: number;
      probationMonths?: number;
      noticePeriodDays?: number;
      expiryDate?: string;
      notes?: string;
    },
    companyId: string,
    actor: AuthUser
  ): Promise<JobOffer> {
    const app = await this.getApplicationById(data.applicationId, companyId);
    const candidate = await this.getCandidateById(app.candidateId, companyId);
    const req = await this.getRequisitionById(app.requisitionId, companyId);

    if (!data.annualCtc || data.annualCtc <= 0) throw new AppError('Annual CTC must be greater than zero.', 'VALIDATION_ERROR', 400);
    if (!data.joiningDate) throw new AppError('Target Joining Date is required.', 'VALIDATION_ERROR', 400);

    const dept = await DepartmentRepository.findById(data.departmentId);
    if (!dept || dept.companyId !== companyId) throw new AppError('Invalid Department.', 'INVALID_REFERENCE', 400);

    const desig = await DesignationRepository.findById(data.designationId);
    if (!desig || desig.companyId !== companyId) throw new AppError('Invalid Designation.', 'INVALID_REFERENCE', 400);

    const loc = await WorkLocationRepository.findById(data.workLocationId);
    if (!loc || loc.companyId !== companyId) throw new AppError('Invalid Work Location.', 'INVALID_REFERENCE', 400);

    let branchName: string | undefined;
    if (data.branchId) {
      const branch = await BranchRepository.findById(data.branchId);
      if (branch) branchName = branch.name;
    }

    // Default CTC breakdown if not explicitly supplied
    const ctc = data.annualCtc;
    const basic = data.basicSalary !== undefined ? data.basicSalary : Math.round(ctc * 0.5);
    const hra = data.hraSalary !== undefined ? data.hraSalary : Math.round(ctc * 0.25);
    const special = data.specialAllowance !== undefined ? data.specialAllowance : Math.round(ctc * 0.2);
    const bonus = data.variableBonus !== undefined ? data.variableBonus : Math.round(ctc - (basic + hra + special));

    const year = new Date().getFullYear();
    const count = (await JobOfferRepository.findAll(companyId)).length + 1;
    const offerNumber = `OFF-${year}-${String(count).padStart(3, '0')}`;

    const newOffer: JobOffer = {
      id: `off-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      companyId,
      applicationId: app.id,
      candidateId: candidate.id,
      candidateName: candidate.fullName,
      candidateEmail: candidate.email,
      requisitionId: req.id,
      requisitionTitle: req.title,
      offerNumber,
      version: 1,
      designationId: data.designationId,
      designationName: desig.name,
      departmentId: data.departmentId,
      departmentName: dept.name,
      branchId: data.branchId,
      branchName,
      workLocationId: data.workLocationId,
      workLocationName: loc.name,
      joiningDate: data.joiningDate,
      annualCtc: ctc,
      currency: data.currency || 'USD',
      basicSalary: basic,
      hraSalary: hra,
      specialAllowance: special,
      variableBonus: bonus,
      probationMonths: data.probationMonths ?? 3,
      noticePeriodDays: data.noticePeriodDays ?? 30,
      status: OfferStatus.SENT, // Issued & sent to candidate
      issuedDate: new Date().toISOString().split('T')[0],
      expiryDate: data.expiryDate,
      createdBy: actor.id,
      createdByName: actor.fullName || actor.email,
      notes: data.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await JobOfferRepository.create(newOffer);

    // Update application stage to OFFER
    await this.updateApplicationStage(
      app.id,
      ApplicationStage.OFFER,
      ApplicationStatus.OFFERED,
      `Issued Offer ${offerNumber} for ${desig.name}`,
      companyId,
      actor
    );

    await AuditService.log({
      actorId: actor.id,
      actorName: actor.fullName || actor.email,
      actorEmail: actor.email,
      action: 'JOB_OFFER_ISSUED',
      targetModule: 'Recruitment',
      targetRecordId: newOffer.id,
      companyId,
      changesSummary: `Issued job offer ${offerNumber} to ${candidate.fullName} for ${ctc}`,
    });

    return newOffer;
  }

  public static async updateOfferStatus(
    offerId: string,
    status: OfferStatus,
    reason: string | undefined,
    companyId: string,
    actor: AuthUser
  ): Promise<JobOffer> {
    const offer = await this.getOfferById(offerId, companyId);

    const updates: Partial<JobOffer> = {
      status,
      declinedReason: status === OfferStatus.DECLINED ? reason : offer.declinedReason,
      acceptedAt: status === OfferStatus.ACCEPTED ? new Date().toISOString() : offer.acceptedAt,
    };

    const updated = await JobOfferRepository.update(offerId, companyId, updates);
    if (!updated) throw new AppError('Failed to update job offer status.', 'UPDATE_ERROR', 500);

    // Update application status
    if (status === OfferStatus.ACCEPTED) {
      await this.updateApplicationStage(
        offer.applicationId,
        ApplicationStage.OFFER,
        ApplicationStatus.OFFER_ACCEPTED,
        'Offer accepted by candidate',
        companyId,
        actor
      );
    } else if (status === OfferStatus.DECLINED) {
      await this.updateApplicationStage(
        offer.applicationId,
        ApplicationStage.OFFER,
        ApplicationStatus.OFFER_DECLINED,
        reason || 'Offer declined by candidate',
        companyId,
        actor
      );
    }

    await AuditService.log({
      actorId: actor.id,
      actorName: actor.fullName || actor.email,
      actorEmail: actor.email,
      action: 'JOB_OFFER_STATUS_UPDATED',
      targetModule: 'Recruitment',
      targetRecordId: offerId,
      companyId,
      changesSummary: `Updated offer ${offer.offerNumber} status to ${status}`,
    });

    return updated;
  }
}
