import {
  EmployeeOnboarding,
  OnboardingStatus,
  OnboardingTask,
  OnboardingTaskStatus,
  OnboardingTaskCategory,
  OnboardingDocument,
  OnboardingDocStatus,
  OnboardingDocType,
  OnboardingTemplate,
  RequisitionStatus,
  ApplicationStage,
  ApplicationStatus,
  OfferStatus,
} from '../../src/types/recruitment.js';
import { CreateEmployeeDTO } from '../../src/types/employee.js';
import { AuthUser } from '../../src/types/auth.js';
import { RelationalDatabase } from '../database/RelationalDatabase.js';
import { OnboardingRepository, OnboardingFilter } from '../database/repositories/OnboardingRepository.js';
import { JobOfferRepository } from '../database/repositories/JobOfferRepository.js';
import { CandidateRepository } from '../database/repositories/CandidateRepository.js';
import { ApplicationRepository } from '../database/repositories/ApplicationRepository.js';
import { JobRequisitionRepository } from '../database/repositories/JobRequisitionRepository.js';
import { EmployeeRepository } from '../database/repositories/EmployeeRepository.js';
import { BranchRepository } from '../database/repositories/BranchRepository.js';
import { DepartmentRepository } from '../database/repositories/DepartmentRepository.js';
import { DesignationRepository } from '../database/repositories/DesignationRepository.js';
import { WorkLocationRepository } from '../database/repositories/WorkLocationRepository.js';
import { EmployeeService } from './EmployeeService.js';
import { RecruitmentService } from './RecruitmentService.js';
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

export class OnboardingService {
  private static db = RelationalDatabase.getInstance();

  // -------------------------------------------------------------------------
  // 1. TEMPLATES
  // -------------------------------------------------------------------------
  public static async getTemplates(companyId: string): Promise<OnboardingTemplate[]> {
    return OnboardingRepository.findTemplates(companyId);
  }

  public static async createTemplate(
    data: {
      templateName: string;
      description: string;
      departmentId?: string;
      tasks: {
        title: string;
        description: string;
        category: OnboardingTaskCategory;
        daysFromJoining: number;
        defaultAssigneeRole?: string;
      }[];
      requiredDocuments: OnboardingDocType[];
    },
    companyId: string,
    actor: AuthUser
  ): Promise<OnboardingTemplate> {
    if (!data.templateName?.trim()) throw new AppError('Template Name is required.', 'VALIDATION_ERROR', 400);

    const newTmpl: OnboardingTemplate = {
      id: `tmpl-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      companyId,
      templateName: data.templateName.trim(),
      description: data.description,
      departmentId: data.departmentId,
      isActive: true,
      tasks: data.tasks || [],
      requiredDocuments: data.requiredDocuments || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await OnboardingRepository.createTemplate(newTmpl);
    return newTmpl;
  }

  // -------------------------------------------------------------------------
  // 2. ONBOARDING WORKFLOW
  // -------------------------------------------------------------------------
  public static async getOnboardings(companyId: string, filter?: OnboardingFilter): Promise<EmployeeOnboarding[]> {
    return OnboardingRepository.findAll(companyId, filter);
  }

  public static async getOnboardingById(id: string, companyId: string): Promise<EmployeeOnboarding> {
    const onb = await OnboardingRepository.findById(id, companyId);
    if (!onb) throw new AppError('Onboarding record not found.', 'NOT_FOUND', 404);
    return onb;
  }

  public static async startOnboardingFromOffer(
    offerId: string,
    templateId: string | undefined,
    companyId: string,
    actor: AuthUser
  ): Promise<EmployeeOnboarding> {
    const offer = await JobOfferRepository.findById(offerId, companyId);
    if (!offer) throw new AppError('Job Offer not found.', 'NOT_FOUND', 404);
    if (offer.status !== OfferStatus.ACCEPTED) {
      throw new AppError('Onboarding can only be started for ACCEPTED job offers.', 'INVALID_OFFER_STATUS', 400);
    }

    // Check if onboarding already exists
    const existing = await OnboardingRepository.findByOfferId(offer.id, companyId);
    if (existing) {
      return existing;
    }

    const candidate = await CandidateRepository.findById(offer.candidateId, companyId);
    if (!candidate) throw new AppError('Candidate not found.', 'NOT_FOUND', 404);

    const app = await ApplicationRepository.findById(offer.applicationId, companyId);
    if (!app) throw new AppError('Application not found.', 'NOT_FOUND', 404);

    // Resolve template
    let template: OnboardingTemplate | null = null;
    if (templateId) {
      template = await OnboardingRepository.findTemplateById(templateId, companyId);
    }
    if (!template) {
      const templates = await OnboardingRepository.findTemplates(companyId);
      template = templates.length > 0 ? templates[0] : null;
    }

    // Determine branch
    let branchId = offer.branchId;
    let branchName = offer.branchName;
    if (!branchId) {
      const branches = Array.from(this.db.branches.values()).filter((b) => b.companyId === companyId);
      if (branches.length > 0) {
        branchId = branches[0].id;
        branchName = branches[0].name;
      } else {
        throw new AppError('No Branch configured for this company.', 'INVALID_BRANCH', 400);
      }
    }

    const year = new Date().getFullYear();
    const count = (await OnboardingRepository.findAll(companyId)).length + 1;
    const onbNumber = `ONB-${year}-${String(count).padStart(3, '0')}`;

    const onboardingId = `onb-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newOnboarding: EmployeeOnboarding = {
      id: onboardingId,
      companyId,
      candidateId: candidate.id,
      applicationId: app.id,
      jobOfferId: offer.id,
      templateId: template?.id,
      onboardingNumber: onbNumber,
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      fullName: candidate.fullName,
      email: candidate.email,
      phone: candidate.phone,
      departmentId: offer.departmentId,
      departmentName: offer.departmentName,
      designationId: offer.designationId,
      designationName: offer.designationName,
      branchId,
      branchName: branchName || 'Primary Branch',
      workLocationId: offer.workLocationId,
      workLocationName: offer.workLocationName,
      joiningDate: offer.joiningDate,
      status: OnboardingStatus.IN_PROGRESS,
      overallProgress: 0,
      tasksCompletedCount: 0,
      tasksTotalCount: 0,
      docsVerifiedCount: 0,
      docsTotalCount: 0,
      joiningDetails: {
        gender: 'OTHER',
        employmentType: 'FULL_TIME',
        annualCtc: offer.annualCtc,
        basicSalary: offer.basicSalary,
        hraSalary: offer.hraSalary,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await OnboardingRepository.create(newOnboarding);

    // Instantiate tasks from template
    if (template && template.tasks) {
      const joiningDateObj = new Date(offer.joiningDate);
      for (const t of template.tasks) {
        const dueDateObj = new Date(joiningDateObj);
        dueDateObj.setDate(dueDateObj.getDate() + (t.daysFromJoining || 0));

        const newTask: OnboardingTask = {
          id: `task-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          companyId,
          onboardingId,
          title: t.title,
          description: t.description,
          category: t.category,
          dueDate: dueDateObj.toISOString().split('T')[0],
          status: OnboardingTaskStatus.PENDING,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await OnboardingRepository.createTask(newTask);
      }
    }

    // Instantiate document requirements
    const requiredDocs = template?.requiredDocuments || [
      OnboardingDocType.GOVERNMENT_ID,
      OnboardingDocType.ADDRESS_PROOF,
      OnboardingDocType.SIGNED_OFFER_LETTER,
      OnboardingDocType.BANK_PASSBOOK_OR_CHEQUE,
    ];

    for (const docType of requiredDocs) {
      const docName = docType.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
      const newDoc: OnboardingDocument = {
        id: `doc-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        companyId,
        onboardingId,
        documentType: docType,
        documentName: `${docName} Document`,
        status: OnboardingDocStatus.PENDING,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await OnboardingRepository.createDocument(newDoc);
    }

    await AuditService.log({
      actorId: actor.id,
      actorName: actor.fullName || actor.email,
      actorEmail: actor.email,
      action: 'ONBOARDING_STARTED',
      targetModule: 'Onboarding',
      targetRecordId: newOnboarding.id,
      companyId,
      changesSummary: `Initiated onboarding ${onbNumber} for ${candidate.fullName}`,
    });

    return (await OnboardingRepository.findById(onboardingId, companyId))!;
  }

  public static async updateTaskStatus(
    taskId: string,
    status: OnboardingTaskStatus,
    notes: string | undefined,
    companyId: string,
    actor: AuthUser
  ): Promise<OnboardingTask> {
    const task = await OnboardingRepository.findTaskById(taskId, companyId);
    if (!task) throw new AppError('Onboarding task not found.', 'NOT_FOUND', 404);

    const isCompleted = status === OnboardingTaskStatus.COMPLETED || status === OnboardingTaskStatus.WAIVED;
    const updated = await OnboardingRepository.updateTask(taskId, companyId, {
      status,
      notes: notes !== undefined ? notes : task.notes,
      completedAt: isCompleted ? new Date().toISOString() : undefined,
      completedBy: isCompleted ? actor.id : undefined,
      completedByName: isCompleted ? (actor.fullName || actor.email) : undefined,
    });
    if (!updated) throw new AppError('Failed to update task.', 'UPDATE_ERROR', 500);

    return updated;
  }

  public static async updateDocumentStatus(
    docId: string,
    status: OnboardingDocStatus,
    fileUrl: string | undefined,
    rejectionReason: string | undefined,
    companyId: string,
    actor: AuthUser
  ): Promise<OnboardingDocument> {
    const doc = await OnboardingRepository.findDocumentById(docId, companyId);
    if (!doc) throw new AppError('Onboarding document not found.', 'NOT_FOUND', 404);

    const isVerified = status === OnboardingDocStatus.VERIFIED;
    const isSubmitted = status === OnboardingDocStatus.SUBMITTED;

    const updated = await OnboardingRepository.updateDocument(docId, companyId, {
      status,
      fileUrl: fileUrl || doc.fileUrl,
      rejectionReason: status === OnboardingDocStatus.REJECTED ? rejectionReason : undefined,
      submittedAt: isSubmitted ? new Date().toISOString() : doc.submittedAt,
      verifiedAt: isVerified ? new Date().toISOString() : doc.verifiedAt,
      verifiedBy: isVerified ? actor.id : doc.verifiedBy,
      verifiedByName: isVerified ? (actor.fullName || actor.email) : doc.verifiedByName,
    });
    if (!updated) throw new AppError('Failed to update document.', 'UPDATE_ERROR', 500);

    return updated;
  }

  public static async updateJoiningDetails(
    onboardingId: string,
    joiningDetails: Partial<EmployeeOnboarding['joiningDetails']>,
    companyId: string,
    actor: AuthUser
  ): Promise<EmployeeOnboarding> {
    const onb = await this.getOnboardingById(onboardingId, companyId);
    const mergedDetails = {
      ...onb.joiningDetails,
      ...joiningDetails,
    };

    const updated = await OnboardingRepository.update(onboardingId, companyId, {
      joiningDetails: mergedDetails,
    });
    if (!updated) throw new AppError('Failed to update joining details.', 'UPDATE_ERROR', 500);
    return updated;
  }

  // -------------------------------------------------------------------------
  // 3. EMPLOYEE CREATION HANDOFF (REUSES EXISTING EMPLOYEESERVICE)
  // -------------------------------------------------------------------------
  public static async completeAndHandoffToEmployeeMaster(
    onboardingId: string,
    options: {
      employeeCode?: string;
      workEmail?: string;
      gender?: 'MALE' | 'FEMALE' | 'OTHER';
      dateOfBirth?: string;
      mobileNumber?: string;
      maritalStatus?: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';
      joiningDate?: string;
      reportingManagerId?: string;
      shiftId?: string;
    },
    companyId: string,
    actor: AuthUser
  ): Promise<{ onboarding: EmployeeOnboarding; employee: any }> {
    const onb = await this.getOnboardingById(onboardingId, companyId);
    if (onb.status === OnboardingStatus.COMPLETED && onb.employeeId) {
      throw new AppError(`Onboarding has already been handed off to Employee ${onb.employeeCode}.`, 'ALREADY_COMPLETED', 400);
    }

    // 1. Resolve & Generate Employee Code
    let empCode = options.employeeCode?.trim().toUpperCase();
    if (!empCode) {
      const existingEmployees = Array.from(this.db.employees.values()).filter((e) => e.companyId === companyId);
      const nextNum = existingEmployees.length + 101;
      empCode = `EMP-${nextNum}`;
    }

    // Check if code is already taken
    const existingWithCode = await EmployeeRepository.findByCode(companyId, empCode);
    if (existingWithCode) {
      throw new AppError(`Employee Code '${empCode}' is already in use. Please provide an alternate code.`, 'DUPLICATE_CODE', 400);
    }

    // 2. Prepare payload for existing EmployeeService.createEmployee
    const details = onb.joiningDetails || {};
    const gender = options.gender || details.gender || 'OTHER';
    const dateOfBirth = options.dateOfBirth || details.dateOfBirth || '1995-01-01';
    const joiningDate = options.joiningDate || onb.joiningDate || new Date().toISOString().split('T')[0];
    const mobileNumber = options.mobileNumber || onb.phone || '+1 (555) 000-0000';
    const workEmail = options.workEmail || onb.email;

    // Check work email uniqueness
    const existingWithEmail = await EmployeeRepository.findByWorkEmail(workEmail);
    if (existingWithEmail) {
      throw new AppError(`Work email '${workEmail}' already belongs to employee ${existingWithEmail.employeeCode}.`, 'DUPLICATE_EMAIL', 400);
    }

    const dto: CreateEmployeeDTO = {
      employeeCode: empCode,
      firstName: onb.firstName,
      lastName: onb.lastName,
      gender: gender as any,
      dateOfBirth,
      joiningDate,
      workEmail,
      personalEmail: onb.email !== workEmail ? onb.email : undefined,
      mobileNumber,
      maritalStatus: options.maritalStatus || details.maritalStatus || 'SINGLE',
      nationality: details.nationality || 'American',
      bloodGroup: details.bloodGroup,
      branchId: onb.branchId,
      departmentId: onb.departmentId,
      designationId: onb.designationId,
      workLocationId: onb.workLocationId,
      managerId: options.reportingManagerId || details.reportingManagerId,
      employmentType: (details.employmentType as any) || 'FULL_TIME',
      probationPeriodMonths: 3,
      noticePeriodDays: 30,
      
      // Address
      currentAddress: details.addressLine1
        ? {
            addressLine1: details.addressLine1,
            city: details.city || 'New York',
            state: details.state || 'NY',
            country: 'USA',
            postalCode: details.postalCode || '10001',
          }
        : undefined,
        
      // Emergency Contact
      emergencyContact: details.emergencyContactName
        ? {
            contactName: details.emergencyContactName,
            relationship: details.emergencyContactRelation || 'Emergency Contact',
            phoneNumber: details.emergencyContactPhone || mobileNumber || '1234567890',
          }
        : undefined,
        
      // Bank Account
      bankAccount: details.accountNumber
        ? {
            accountHolderName: `${onb.firstName} ${onb.lastName}`,
            bankName: details.bankName || 'Direct Deposit',
            accountNumber: details.accountNumber.replace(/[^0-9]/g, '') || '123456789',
            ifscCode: details.ifscCode || 'CHASUS33',
            accountType: 'SAVINGS' as any,
          }
        : undefined,
        
      // Statutory details
      statutoryDetails: (details.panNumber || details.aadhaarNumber || details.uanNumber)
        ? {
            panNumber: details.panNumber,
            aadhaarNumber: details.aadhaarNumber,
            uanNumber: details.uanNumber,
          }
        : undefined,
    };

    // 3. Call existing EmployeeService.createEmployee
    const createdProfile = await EmployeeService.createEmployee(dto, companyId, actor);
    const createdEmployee = createdProfile.employee;

    // 4. Update Onboarding status & link
    const updatedOnboarding = await OnboardingRepository.update(onboardingId, companyId, {
      status: OnboardingStatus.COMPLETED,
      overallProgress: 100,
      employeeId: createdEmployee.id,
      employeeCode: createdEmployee.employeeCode,
      completedAt: new Date().toISOString(),
      completedBy: actor.id,
    });

    // 5. Update Candidate & preserve recruitment history
    await CandidateRepository.linkEmployee(onb.candidateId, companyId, createdEmployee.id);

    // 6. Update Application status
    await RecruitmentService.updateApplicationStage(
      onb.applicationId,
      ApplicationStage.HIRED,
      ApplicationStatus.HIRED,
      `Employee created with code ${createdEmployee.employeeCode}`,
      companyId,
      actor
    );

    // 7. Update Requisition filled count
    const app = await ApplicationRepository.findById(onb.applicationId, companyId);
    if (app) {
      const req = await JobRequisitionRepository.findById(app.requisitionId, companyId);
      if (req) {
        await JobRequisitionRepository.update(req.id, companyId, {
          filledCount: req.filledCount + 1,
          status: req.filledCount + 1 >= req.openingsCount ? RequisitionStatus.CLOSED : req.status,
        });
      }
    }

    await AuditService.log({
      actorId: actor.id,
      actorName: actor.fullName || actor.email,
      actorEmail: actor.email,
      action: 'ONBOARDING_COMPLETED_EMPLOYEE_CREATED',
      targetModule: 'Onboarding',
      targetRecordId: onboardingId,
      companyId,
      changesSummary: `Completed onboarding ${onb.onboardingNumber} and created employee ${createdEmployee.employeeCode} (${createdEmployee.firstName} ${createdEmployee.lastName})`,
    });

    return {
      onboarding: updatedOnboarding!,
      employee: createdProfile,
    };
  }
}
