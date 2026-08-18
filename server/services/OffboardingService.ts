import {
  OffboardingRequest,
  OffboardingClearanceItem,
  ExitInterview,
  OffboardingHistory,
  OffboardingStatus,
  SeparationType,
  ClearanceDepartment,
  ClearanceItemStatus,
  InitiateResignationDTO,
  InitiateTerminationDTO,
  ApproveOffboardingDTO,
  RejectOffboardingDTO,
  UpdateClearanceItemDTO,
  SaveExitInterviewDTO,
  CompleteOffboardingDTO,
  OffboardingDashboardMetrics,
} from '../../src/types/offboarding.js';
import { AuthUser, UserRole, PermissionKey } from '../../src/types/auth.js';
import { OffboardingRepository } from '../database/repositories/OffboardingRepository.js';
import { EmployeeAssignmentRepository } from '../database/repositories/EmployeeAssignmentRepository.js';
import { AssetService } from './AssetService.js';
import { RelationalDatabase } from '../database/RelationalDatabase.js';

export class OffboardingService {
  private static db = RelationalDatabase.getInstance();

  /**
   * Determine authorized employee scope
   */
  public static async getAuthorizedEmployeeIds(actor: AuthUser, companyId: string): Promise<string[] | null> {
    const isSuperAdmin = actor.role === UserRole.SUPER_ADMIN;
    const isHrAdmin =
      actor.role === UserRole.HR_ADMIN ||
      actor.permissions?.includes(PermissionKey.OFFBOARDING_MANAGE);

    if (isSuperAdmin || isHrAdmin) {
      return null; // Full company scope
    }

    if (!actor.employeeId) return [];

    if (actor.role === UserRole.MANAGER) {
      const subordinateIds = await EmployeeAssignmentRepository.getAllSubordinateIds(actor.employeeId);
      return [actor.employeeId, ...subordinateIds];
    }

    return [actor.employeeId]; // Self only
  }

  // =========================================================================
  // 1. INITIATE OFFBOARDING (RESIGNATION / TERMINATION)
  // =========================================================================
  public static async initiateResignation(
    dto: InitiateResignationDTO,
    companyId: string,
    actor: AuthUser
  ): Promise<OffboardingRequest> {
    const employeeId = actor.employeeId;
    if (!employeeId) throw new Error('Employee account required to submit a resignation.');

    const employee = this.db.employees.get(employeeId);
    if (!employee || employee.companyId !== companyId) {
      throw new Error(`Employee '${employeeId}' not found.`);
    }

    // Check if there is already an active offboarding request
    const existing = await OffboardingRepository.findActiveRequestByEmployeeId(employeeId, companyId);
    if (existing) {
      throw new Error(`An active offboarding request (${existing.requestNumber}) is already in progress.`);
    }

    const submissionDate = new Date().toISOString().slice(0, 10);
    const proposedLWD = dto.proposedLastWorkingDate;
    const noticePeriodDays = dto.noticePeriodDays || 30;

    const count = this.db.offboardingRequests.size + 1;
    const requestNumber = `OFF-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;

    const assignment = await EmployeeAssignmentRepository.findCurrentAssignment(employeeId);

    const request: OffboardingRequest = {
      id: `off-req-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      companyId,
      requestNumber,
      employeeId,
      separationType: SeparationType.RESIGNATION,
      reason: dto.reason.trim(),
      submissionDate,
      proposedLastWorkingDate: proposedLWD,
      officialLastWorkingDate: proposedLWD,
      noticePeriodDays,
      noticePeriodWaivedDays: 0,
      status: OffboardingStatus.INITIATED,
      managerId: assignment?.managerId,
      managerClearanceStatus: ClearanceItemStatus.PENDING,
      itClearanceStatus: ClearanceItemStatus.PENDING,
      hrClearanceStatus: ClearanceItemStatus.PENDING,
      financeClearanceStatus: ClearanceItemStatus.PENDING,
      allClearancesCompleted: false,
      exitInterviewCompleted: false,
      finalStatusTransitionDone: false,
      remarks: dto.remarks?.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const created = await OffboardingRepository.createRequest(request);

    await OffboardingRepository.logHistory({
      id: `off-hist-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      offboardingId: created.id,
      companyId,
      action: 'RESIGNATION_SUBMITTED',
      actorId: actor.employeeId || actor.id,
      actorName: actor.fullName,
      actorRole: actor.role,
      details: `Resignation submitted by ${employee.firstName} ${employee.lastName}. Proposed LWD: ${proposedLWD}`,
      timestamp: new Date().toISOString(),
    });

    return created;
  }

  public static async initiateTermination(
    dto: InitiateTerminationDTO,
    companyId: string,
    actor: AuthUser
  ): Promise<OffboardingRequest> {
    if (actor.role !== UserRole.SUPER_ADMIN && actor.role !== UserRole.HR_ADMIN && actor.role !== UserRole.MANAGER) {
      throw new Error('Access denied: Only HR or Managers can initiate employee separation.');
    }

    const employee = this.db.employees.get(dto.employeeId);
    if (!employee || employee.companyId !== companyId) {
      throw new Error(`Employee '${dto.employeeId}' not found.`);
    }

    const existing = await OffboardingRepository.findActiveRequestByEmployeeId(dto.employeeId, companyId);
    if (existing) {
      throw new Error(`An active offboarding request (${existing.requestNumber}) is already in progress for this employee.`);
    }

    const submissionDate = new Date().toISOString().slice(0, 10);
    const count = this.db.offboardingRequests.size + 1;
    const requestNumber = `OFF-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;
    const assignment = await EmployeeAssignmentRepository.findCurrentAssignment(dto.employeeId);

    const request: OffboardingRequest = {
      id: `off-req-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      companyId,
      requestNumber,
      employeeId: dto.employeeId,
      separationType: dto.separationType,
      reason: dto.reason.trim(),
      submissionDate,
      proposedLastWorkingDate: dto.officialLastWorkingDate,
      officialLastWorkingDate: dto.officialLastWorkingDate,
      noticePeriodDays: dto.noticePeriodDays || 0,
      noticePeriodWaivedDays: dto.noticePeriodWaivedDays || 0,
      status: OffboardingStatus.APPROVED, // Direct manager/HR initiation starts approved
      approvedBy: actor.employeeId || actor.id,
      approvedAt: new Date().toISOString(),
      managerId: assignment?.managerId,
      managerClearanceStatus: ClearanceItemStatus.PENDING,
      itClearanceStatus: ClearanceItemStatus.PENDING,
      hrClearanceStatus: ClearanceItemStatus.PENDING,
      financeClearanceStatus: ClearanceItemStatus.PENDING,
      allClearancesCompleted: false,
      exitInterviewCompleted: false,
      finalStatusTransitionDone: false,
      remarks: dto.remarks?.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const created = await OffboardingRepository.createRequest(request);

    // Initialize department clearances
    await this.initializeClearanceChecklist(created.id, companyId, employee.id);

    await OffboardingRepository.logHistory({
      id: `off-hist-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      offboardingId: created.id,
      companyId,
      action: 'SEPARATION_INITIATED',
      actorId: actor.employeeId || actor.id,
      actorName: actor.fullName,
      actorRole: actor.role,
      details: `Separation (${dto.separationType}) initiated by ${actor.fullName}. Official LWD: ${dto.officialLastWorkingDate}`,
      timestamp: new Date().toISOString(),
    });

    return (await OffboardingRepository.findRequestById(created.id, companyId))!;
  }

  // =========================================================================
  // 2. APPROVAL & CLEARANCE INITIALIZATION
  // =========================================================================
  public static async approveOffboarding(
    id: string,
    dto: ApproveOffboardingDTO,
    companyId: string,
    actor: AuthUser
  ): Promise<OffboardingRequest> {
    if (actor.role !== UserRole.SUPER_ADMIN && actor.role !== UserRole.HR_ADMIN && actor.role !== UserRole.MANAGER) {
      throw new Error('Access denied: Only HR or Managers can approve offboarding requests.');
    }

    const request = await OffboardingRepository.findRequestById(id, companyId);
    if (!request) throw new Error(`Offboarding request '${id}' not found.`);

    if (request.status !== OffboardingStatus.INITIATED) {
      throw new Error(`Cannot approve offboarding request in current status '${request.status}'.`);
    }

    const officialLWD = dto.officialLastWorkingDate || request.proposedLastWorkingDate;

    const updated = await OffboardingRepository.updateRequest(id, companyId, {
      status: OffboardingStatus.CLEARANCE_IN_PROGRESS,
      officialLastWorkingDate: officialLWD,
      noticePeriodWaivedDays: dto.noticePeriodWaivedDays || 0,
      approvedBy: actor.employeeId || actor.id,
      approvedAt: new Date().toISOString(),
      remarks: dto.remarks?.trim() || request.remarks,
    });

    // Initialize 4-Department Clearance Checklist
    await this.initializeClearanceChecklist(id, companyId, request.employeeId);

    await OffboardingRepository.logHistory({
      id: `off-hist-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      offboardingId: id,
      companyId,
      action: 'OFFBOARDING_APPROVED',
      actorId: actor.employeeId || actor.id,
      actorName: actor.fullName,
      actorRole: actor.role,
      details: `Offboarding approved. Official LWD set to ${officialLWD}. Clearance checklist initialized.`,
      timestamp: new Date().toISOString(),
    });

    return (await OffboardingRepository.findRequestById(id, companyId))!;
  }

  public static async rejectOffboarding(
    id: string,
    dto: RejectOffboardingDTO,
    companyId: string,
    actor: AuthUser
  ): Promise<OffboardingRequest> {
    if (actor.role !== UserRole.SUPER_ADMIN && actor.role !== UserRole.HR_ADMIN && actor.role !== UserRole.MANAGER) {
      throw new Error('Access denied: Only HR or Managers can reject offboarding requests.');
    }

    const request = await OffboardingRepository.findRequestById(id, companyId);
    if (!request) throw new Error(`Offboarding request '${id}' not found.`);

    if (request.status !== OffboardingStatus.INITIATED) {
      throw new Error(`Cannot reject offboarding request in current status '${request.status}'.`);
    }

    const updated = await OffboardingRepository.updateRequest(id, companyId, {
      status: OffboardingStatus.REJECTED,
      rejectionReason: dto.rejectionReason.trim(),
    });

    await OffboardingRepository.logHistory({
      id: `off-hist-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      offboardingId: id,
      companyId,
      action: 'OFFBOARDING_REJECTED',
      actorId: actor.employeeId || actor.id,
      actorName: actor.fullName,
      actorRole: actor.role,
      details: `Offboarding rejected: ${dto.rejectionReason}`,
      timestamp: new Date().toISOString(),
    });

    return updated!;
  }

  private static async initializeClearanceChecklist(offboardingId: string, companyId: string, employeeId: string): Promise<void> {
    // 1. Manager Checklist
    await OffboardingRepository.createClearanceItem({
      id: `clr-${Date.now()}-1`,
      offboardingId,
      companyId,
      department: ClearanceDepartment.MANAGER,
      itemKey: 'KT_HANDOVER',
      itemTitle: 'Knowledge Transfer & Project Documentation',
      description: 'Handover of all active project code, client access and ongoing deliverables to designated team member.',
      status: ClearanceItemStatus.PENDING,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any);

    await OffboardingRepository.createClearanceItem({
      id: `clr-${Date.now()}-2`,
      offboardingId,
      companyId,
      department: ClearanceDepartment.MANAGER,
      itemKey: 'TASK_REASSIGNMENT',
      itemTitle: 'Active JIRA / Sprint Task Reassignment',
      description: 'Reallocate pending sprint tasks and update project backlog.',
      status: ClearanceItemStatus.PENDING,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any);

    // 2. IT / Asset Checklist (Integrated with Asset Master)
    const assignedAssets = await AssetService.getEmployeeActiveAssets(employeeId, companyId);
    if (assignedAssets.length > 0) {
      for (const asset of assignedAssets) {
        await OffboardingRepository.createClearanceItem({
          id: `clr-${Date.now()}-ast-${asset.id}`,
          offboardingId,
          companyId,
          department: ClearanceDepartment.IT_ASSET,
          itemKey: `RETURN_ASSET_${asset.assetCode}`,
          itemTitle: `Return Asset: ${asset.name} (${asset.assetCode})`,
          description: `Physical return of ${asset.name} (S/N: ${asset.serialNumber || 'N/A'}). Must be returned in working condition.`,
          status: ClearanceItemStatus.PENDING,
          relatedAssetId: asset.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any);
      }
    } else {
      await OffboardingRepository.createClearanceItem({
        id: `clr-${Date.now()}-ast-none`,
        offboardingId,
        companyId,
        department: ClearanceDepartment.IT_ASSET,
        itemKey: 'HARDWARE_RETURN',
        itemTitle: 'Company Hardware Return Verification',
        description: 'Verify no active hardware items are outstanding.',
        status: ClearanceItemStatus.CLEARED,
        clearedAt: new Date().toISOString(),
        remarks: 'No active hardware assets assigned.',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any);
    }

    await OffboardingRepository.createClearanceItem({
      id: `clr-${Date.now()}-3`,
      offboardingId,
      companyId,
      department: ClearanceDepartment.IT_ASSET,
      itemKey: 'ACCESS_REVOCATION',
      itemTitle: 'Email & Single Sign-On Access Revocation',
      description: 'Revoke Google Workspace, GitHub, VPN, AWS and internal tool credentials on Last Working Date.',
      status: ClearanceItemStatus.PENDING,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any);

    // 3. HR Checklist
    await OffboardingRepository.createClearanceItem({
      id: `clr-${Date.now()}-4`,
      offboardingId,
      companyId,
      department: ClearanceDepartment.HR,
      itemKey: 'EXIT_INTERVIEW',
      itemTitle: 'Conduct & Complete Exit Interview',
      description: 'Document employee feedback, career reasons, and suggestions for company improvement.',
      status: ClearanceItemStatus.PENDING,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any);

    await OffboardingRepository.createClearanceItem({
      id: `clr-${Date.now()}-5`,
      offboardingId,
      companyId,
      department: ClearanceDepartment.HR,
      itemKey: 'ID_BADGE_RETURN',
      itemTitle: 'Company ID Badge & Access Card Return',
      description: 'Physical handover of building access card and parking passes.',
      status: ClearanceItemStatus.PENDING,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any);

    // 4. Finance Checklist
    await OffboardingRepository.createClearanceItem({
      id: `clr-${Date.now()}-6`,
      offboardingId,
      companyId,
      department: ClearanceDepartment.FINANCE,
      itemKey: 'EXPENSE_CLAIMS_CLEARANCE',
      itemTitle: 'Pending Expense Claims Settlement',
      description: 'Verify all submitted travel/meal reimbursement claims are fully processed and corporate cards closed.',
      status: ClearanceItemStatus.PENDING,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any);
  }

  // =========================================================================
  // 3. CLEARANCE ITEM PROCESSING
  // =========================================================================
  public static async updateClearanceItem(
    itemId: string,
    dto: UpdateClearanceItemDTO,
    companyId: string,
    actor: AuthUser
  ): Promise<OffboardingClearanceItem> {
    const item = await OffboardingRepository.findClearanceItemById(itemId, companyId);
    if (!item) throw new Error(`Clearance item '${itemId}' not found.`);

    const request = await OffboardingRepository.findRequestById(item.offboardingId, companyId);
    if (!request) throw new Error('Associated offboarding request not found.');

    if (request.status === OffboardingStatus.COMPLETED || request.status === OffboardingStatus.REJECTED) {
      throw new Error(`Cannot update clearance items for offboarding in status '${request.status}'.`);
    }

    // Role verification per department
    if (actor.role !== UserRole.SUPER_ADMIN && actor.role !== UserRole.HR_ADMIN) {
      if (item.department === ClearanceDepartment.MANAGER && actor.role !== UserRole.MANAGER) {
        throw new Error('Access denied: Only Managers can clear Manager clearance items.');
      }
      if (item.department === ClearanceDepartment.FINANCE && actor.role !== UserRole.PAYROLL_MANAGER) {
        throw new Error('Access denied: Only Finance administrators can clear Finance items.');
      }
    }

    // Asset return safety check
    if (item.relatedAssetId && dto.status === ClearanceItemStatus.CLEARED) {
      const asset = await AssetService.getAssetById(item.relatedAssetId, companyId, actor);
      if (asset.status === 'ASSIGNED' as any && asset.currentEmployeeId === request.employeeId) {
        // Automatically check if physical return should be noted or enforce asset return
        // We permit clearing if remark notes physical receipt
      }
    }

    const updated = await OffboardingRepository.updateClearanceItem(itemId, companyId, {
      status: dto.status,
      remarks: dto.remarks?.trim() || item.remarks,
      clearedBy: dto.status === ClearanceItemStatus.CLEARED || dto.status === ClearanceItemStatus.WAIVED ? actor.employeeId || actor.id : undefined,
      clearedAt: dto.status === ClearanceItemStatus.CLEARED || dto.status === ClearanceItemStatus.WAIVED ? new Date().toISOString() : undefined,
    });

    await OffboardingRepository.logHistory({
      id: `off-hist-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      offboardingId: item.offboardingId,
      companyId,
      action: 'CLEARANCE_ITEM_UPDATED',
      actorId: actor.employeeId || actor.id,
      actorName: actor.fullName,
      actorRole: actor.role,
      details: `[${item.department}] ${item.itemTitle} marked as ${dto.status}${dto.remarks ? ` - Note: ${dto.remarks}` : ''}`,
      timestamp: new Date().toISOString(),
    });

    return updated!;
  }

  // =========================================================================
  // 4. EXIT INTERVIEW
  // =========================================================================
  public static async saveExitInterview(
    offboardingId: string,
    dto: SaveExitInterviewDTO,
    companyId: string,
    actor: AuthUser
  ): Promise<ExitInterview> {
    if (actor.role !== UserRole.SUPER_ADMIN && actor.role !== UserRole.HR_ADMIN) {
      throw new Error('Access denied: Only HR Administrators can record exit interviews.');
    }

    const request = await OffboardingRepository.findRequestById(offboardingId, companyId);
    if (!request) throw new Error(`Offboarding request '${offboardingId}' not found.`);

    const interview: ExitInterview = {
      id: `exit-int-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      offboardingId,
      companyId,
      employeeId: request.employeeId,
      interviewDate: dto.interviewDate || new Date().toISOString().slice(0, 10),
      conductedBy: actor.employeeId || actor.id,
      primaryReasonForLeaving: dto.primaryReasonForLeaving.trim(),
      overallExperienceRating: Number(dto.overallExperienceRating),
      managerFeedbackRating: Number(dto.managerFeedbackRating),
      companyCultureRating: Number(dto.companyCultureRating),
      compensationFeedback: dto.compensationFeedback?.trim(),
      suggestionsForImprovement: dto.suggestionsForImprovement?.trim(),
      wouldRecommendCompany: dto.wouldRecommendCompany !== undefined ? dto.wouldRecommendCompany : true,
      confidentialNotes: dto.confidentialNotes?.trim(),
      completedAt: new Date().toISOString(),
    };

    const saved = await OffboardingRepository.saveExitInterview(interview);

    // Also auto-clear the Exit Interview clearance item if present
    const clearanceItems = await OffboardingRepository.findClearanceItems(offboardingId, companyId);
    const exitItem = clearanceItems.find((i) => i.itemKey === 'EXIT_INTERVIEW');
    if (exitItem && exitItem.status !== ClearanceItemStatus.CLEARED) {
      await OffboardingRepository.updateClearanceItem(exitItem.id, companyId, {
        status: ClearanceItemStatus.CLEARED,
        clearedBy: actor.employeeId || actor.id,
        clearedAt: new Date().toISOString(),
        remarks: 'Exit interview recorded in system.',
      });
    }

    await OffboardingRepository.logHistory({
      id: `off-hist-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      offboardingId,
      companyId,
      action: 'EXIT_INTERVIEW_COMPLETED',
      actorId: actor.employeeId || actor.id,
      actorName: actor.fullName,
      actorRole: actor.role,
      details: `Exit interview conducted by ${actor.fullName}. Experience rating: ${dto.overallExperienceRating}/5`,
      timestamp: new Date().toISOString(),
    });

    return saved;
  }

  // =========================================================================
  // 5. FINAL OFFBOARDING COMPLETION & EMPLOYEE STATUS TRANSITION
  // =========================================================================
  public static async completeOffboarding(
    id: string,
    dto: CompleteOffboardingDTO,
    companyId: string,
    actor: AuthUser
  ): Promise<OffboardingRequest> {
    if (actor.role !== UserRole.SUPER_ADMIN && actor.role !== UserRole.HR_ADMIN) {
      throw new Error('Access denied: Only HR or System administrators can finalize employee offboarding.');
    }

    const request = await OffboardingRepository.findRequestById(id, companyId);
    if (!request) throw new Error(`Offboarding request '${id}' not found.`);

    if (request.status === OffboardingStatus.COMPLETED) {
      throw new Error('This offboarding request has already been completed.');
    }

    // Verify all clearances are cleared or waived
    const clearanceItems = await OffboardingRepository.findClearanceItems(id, companyId);
    const uncleared = clearanceItems.filter(
      (i) => i.status !== ClearanceItemStatus.CLEARED && i.status !== ClearanceItemStatus.WAIVED
    );

    if (uncleared.length > 0) {
      throw new Error(
        `Cannot complete offboarding: ${uncleared.length} clearance checklist items are still pending or blocked.`
      );
    }

    // Check active unreturned assets
    const activeAssets = await AssetService.getEmployeeActiveAssets(request.employeeId, companyId);
    if (activeAssets.length > 0) {
      // Warning or block
      const unreturnedCodes = activeAssets.map((a) => a.assetCode).join(', ');
      throw new Error(
        `Cannot complete offboarding: Employee still has ${activeAssets.length} unreturned company assets (${unreturnedCodes}). Return assets before completing.`
      );
    }

    // -------------------------------------------------------------------------
    // CRITICAL: Employee Status Transition while PRESERVING Employment History
    // (Never delete the employee record)
    // -------------------------------------------------------------------------
    const employee = this.db.employees.get(request.employeeId);
    if (employee) {
      // Transition status to INACTIVE or TERMINATED / RESIGNED
      const newStatus =
        request.separationType === SeparationType.RESIGNATION ? 'RESIGNED' : 'TERMINATED';
      employee.status = newStatus as any;
      employee.updatedAt = new Date().toISOString();
      this.db.employees.set(employee.id, employee);

      // Close current employee assignment
      const currentAssignment = await EmployeeAssignmentRepository.findCurrentAssignment(request.employeeId);
      if (currentAssignment && !currentAssignment.effectiveTo) {
        await EmployeeAssignmentRepository.update(currentAssignment.id, {
          effectiveTo: request.officialLastWorkingDate,
        });
      }
    }

    const updated = await OffboardingRepository.updateRequest(id, companyId, {
      status: OffboardingStatus.COMPLETED,
      finalStatusTransitionDone: true,
      remarks: dto.remarks?.trim() || request.remarks,
    });

    await OffboardingRepository.logHistory({
      id: `off-hist-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      offboardingId: id,
      companyId,
      action: 'OFFBOARDING_COMPLETED',
      actorId: actor.employeeId || actor.id,
      actorName: actor.fullName,
      actorRole: actor.role,
      details: `Employee offboarding finalized. Employment record preserved with final status on ${request.officialLastWorkingDate}.`,
      timestamp: new Date().toISOString(),
    });

    return (await OffboardingRepository.findRequestById(id, companyId))!;
  }

  // =========================================================================
  // 6. QUERIES & ANALYTICS
  // =========================================================================
  public static async getOffboardingRequests(
    companyId: string,
    actor: AuthUser,
    filter: { employeeId?: string; status?: OffboardingStatus; scope?: 'my' | 'all' } = {}
  ): Promise<OffboardingRequest[]> {
    const authScope = await this.getAuthorizedEmployeeIds(actor, companyId);

    if (filter.scope === 'my') {
      if (!actor.employeeId) return [];
      return OffboardingRepository.findRequests(companyId, { employeeId: actor.employeeId, status: filter.status });
    }

    if (authScope === null) {
      return OffboardingRepository.findRequests(companyId, filter);
    }

    if (filter.employeeId) {
      if (!authScope.includes(filter.employeeId)) {
        throw new Error('Access denied: You are not authorized to view offboarding records for this employee.');
      }
      return OffboardingRepository.findRequests(companyId, { employeeId: filter.employeeId, status: filter.status });
    }

    return OffboardingRepository.findRequests(companyId, { employeeIds: authScope, status: filter.status });
  }

  public static async getOffboardingById(id: string, companyId: string, actor: AuthUser): Promise<OffboardingRequest> {
    const request = await OffboardingRepository.findRequestById(id, companyId);
    if (!request) throw new Error(`Offboarding request '${id}' not found.`);

    const authScope = await this.getAuthorizedEmployeeIds(actor, companyId);
    if (authScope !== null && !authScope.includes(request.employeeId)) {
      throw new Error('Access denied: You do not have permission to view this offboarding request.');
    }

    return request;
  }

  public static async getOffboardingHistory(id: string, companyId: string, actor: AuthUser): Promise<OffboardingHistory[]> {
    await this.getOffboardingById(id, companyId, actor);
    return OffboardingRepository.findHistoryByOffboardingId(id, companyId);
  }

  public static async getDashboardMetrics(companyId: string, actor: AuthUser): Promise<OffboardingDashboardMetrics> {
    const requests = await this.getOffboardingRequests(companyId, actor, {});

    const activeCount = requests.filter(
      (r) => r.status === OffboardingStatus.INITIATED || r.status === OffboardingStatus.CLEARANCE_IN_PROGRESS || r.status === OffboardingStatus.APPROVED
    ).length;

    const pendingClearanceCount = requests.filter(
      (r) => r.status === OffboardingStatus.CLEARANCE_IN_PROGRESS && !r.allClearancesCompleted
    ).length;

    const completedCount = requests.filter((r) => r.status === OffboardingStatus.COMPLETED).length;
    const resignationCount = requests.filter((r) => r.separationType === SeparationType.RESIGNATION).length;
    const terminationCount = requests.filter((r) => r.separationType !== SeparationType.RESIGNATION).length;

    const totalNoticeDays = requests.reduce((sum, r) => sum + (r.noticePeriodDays || 0), 0);
    const avgNoticePeriodDays = requests.length > 0 ? Math.round(totalNoticeDays / requests.length) : 30;

    return {
      totalOffboardings: requests.length,
      activeCount,
      pendingClearanceCount,
      completedCount,
      resignationCount,
      terminationCount,
      avgNoticePeriodDays,
    };
  }
}
