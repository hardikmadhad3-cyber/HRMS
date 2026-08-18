import {
  PerformanceCycle,
  PerformanceCycleStatus,
  PerformanceCycleType,
  PerformanceGoal,
  PerformanceGoalStatus,
  PerformanceReview,
  PerformanceReviewStatus,
  PerformanceReviewTemplate,
  GoalCategory,
  PerformanceReviewHistory,
  PerformanceDashboardMetrics,
  CreatePerformanceCycleDTO,
  UpdatePerformanceCycleDTO,
  CreatePerformanceTemplateDTO,
  CreatePerformanceGoalDTO,
  UpdatePerformanceGoalDTO,
  SubmitSelfReviewDTO,
  SubmitManagerReviewDTO,
  FinalizeReviewDTO,
} from '../../src/types/performance.js';
import { AuthUser, UserRole, PermissionKey } from '../../src/types/auth.js';
import { PerformanceCycleRepository } from '../database/repositories/PerformanceCycleRepository.js';
import { PerformanceTemplateRepository } from '../database/repositories/PerformanceTemplateRepository.js';
import { PerformanceGoalRepository } from '../database/repositories/PerformanceGoalRepository.js';
import { PerformanceReviewRepository } from '../database/repositories/PerformanceReviewRepository.js';
import { PerformanceReviewHistoryRepository } from '../database/repositories/PerformanceReviewHistoryRepository.js';
import { EmployeeAssignmentRepository } from '../database/repositories/EmployeeAssignmentRepository.js';
import { RelationalDatabase } from '../database/RelationalDatabase.js';
import { AuditService } from './AuditService.js';

export class PerformanceService {
  private static db = RelationalDatabase.getInstance();

  /**
   * Resolve authorized employee IDs based on role & hierarchy
   * Employee: Self only
   * Manager: Self + Direct and indirect reports
   * HR Admin / Super Admin: Entire company
   */
  public static async getAuthorizedEmployeeIds(actor: AuthUser, companyId: string): Promise<string[] | null> {
    const isSuperAdmin = actor.role === UserRole.SUPER_ADMIN;
    const isHrAdmin = actor.role === UserRole.HR_ADMIN || actor.permissions?.includes(PermissionKey.PERFORMANCE_MANAGE);

    if (isSuperAdmin || isHrAdmin) {
      // null indicates full company scope (no employeeId filtering needed)
      return null;
    }

    if (!actor.employeeId) {
      return [];
    }

    if (actor.role === UserRole.MANAGER) {
      const subordinateIds = await EmployeeAssignmentRepository.getAllSubordinateIds(actor.employeeId);
      return [actor.employeeId, ...subordinateIds];
    }

    // Standard Employee: Self only
    return [actor.employeeId];
  }

  // =========================================================================
  // 1. PERFORMANCE REVIEW TEMPLATES
  // =========================================================================

  public static async getTemplates(companyId: string, activeOnly: boolean = false): Promise<PerformanceReviewTemplate[]> {
    return PerformanceTemplateRepository.findAll(companyId, activeOnly);
  }

  public static async getTemplateById(id: string, companyId: string): Promise<PerformanceReviewTemplate | null> {
    return PerformanceTemplateRepository.findById(id, companyId);
  }

  public static async createTemplate(
    dto: CreatePerformanceTemplateDTO,
    companyId: string,
    actor: AuthUser
  ): Promise<PerformanceReviewTemplate> {
    if (!dto.code || !dto.name) {
      throw new Error('Template code and name are required.');
    }

    const existing = await PerformanceTemplateRepository.findByCode(companyId, dto.code);
    if (existing) {
      throw new Error(`A review template with code '${dto.code}' already exists.`);
    }

    const totalWeightage = (dto.goalWeightagePct || 0) + (dto.competencyWeightagePct || 0);
    if (Math.abs(totalWeightage - 100) > 0.01) {
      throw new Error('The sum of goal weightage and competency weightage must equal 100%.');
    }

    const template: PerformanceReviewTemplate = {
      id: `tmpl-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      companyId,
      code: dto.code.trim().toUpperCase(),
      name: dto.name.trim(),
      description: dto.description?.trim(),
      ratingScale: dto.ratingScale || [],
      competencies: dto.competencies || [],
      goalWeightagePct: dto.goalWeightagePct ?? 60.0,
      competencyWeightagePct: dto.competencyWeightagePct ?? 40.0,
      isActive: true,
      createdBy: actor.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const created = await PerformanceTemplateRepository.create(template);

    await AuditService.log({
      actorId: actor.id,
      actorName: actor.fullName,
      actorEmail: actor.email,
      action: 'PERF_TEMPLATE_CREATED',
      targetModule: 'Performance',
      companyId,
      changesSummary: `Created Performance Review Template '${created.name}' (${created.code}).`,
    });

    return created;
  }

  public static async updateTemplate(
    id: string,
    updates: Partial<PerformanceReviewTemplate>,
    companyId: string,
    actor: AuthUser
  ): Promise<PerformanceReviewTemplate> {
    const existing = await PerformanceTemplateRepository.findById(id, companyId);
    if (!existing) {
      throw new Error(`Performance template '${id}' not found.`);
    }

    if (updates.goalWeightagePct !== undefined && updates.competencyWeightagePct !== undefined) {
      const sum = updates.goalWeightagePct + updates.competencyWeightagePct;
      if (Math.abs(sum - 100) > 0.01) {
        throw new Error('The sum of goal weightage and competency weightage must equal 100%.');
      }
    }

    const updated = await PerformanceTemplateRepository.update(id, updates);
    if (!updated) throw new Error('Failed to update template.');

    await AuditService.log({
      actorId: actor.id,
      actorName: actor.fullName,
      actorEmail: actor.email,
      action: 'PERF_TEMPLATE_UPDATED',
      targetModule: 'Performance',
      companyId,
      changesSummary: `Updated Performance Review Template '${updated.name}'.`,
    });

    return updated;
  }

  public static async getGoalCategories(companyId: string): Promise<GoalCategory[]> {
    return PerformanceTemplateRepository.findGoalCategories(companyId);
  }

  public static async createGoalCategory(
    dto: { code: string; name: string; description?: string; defaultWeightage?: number },
    companyId: string
  ): Promise<GoalCategory> {
    const cat: GoalCategory = {
      id: `cat-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      companyId,
      code: dto.code.trim().toUpperCase(),
      name: dto.name.trim(),
      description: dto.description,
      defaultWeightage: dto.defaultWeightage ?? 25.0,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    return PerformanceTemplateRepository.createGoalCategory(cat);
  }

  // =========================================================================
  // 2. PERFORMANCE CYCLES
  // =========================================================================

  public static async getCycles(companyId: string, status?: PerformanceCycleStatus): Promise<PerformanceCycle[]> {
    return PerformanceCycleRepository.findAll(companyId, status);
  }

  public static async getCycleById(id: string, companyId: string): Promise<PerformanceCycle | null> {
    return PerformanceCycleRepository.findById(id, companyId);
  }

  public static async createCycle(
    dto: CreatePerformanceCycleDTO,
    companyId: string,
    actor: AuthUser
  ): Promise<PerformanceCycle> {
    if (!dto.code || !dto.name || !dto.startDate || !dto.endDate) {
      throw new Error('Cycle code, name, start date, and end date are required.');
    }

    if (new Date(dto.startDate) > new Date(dto.endDate)) {
      throw new Error('Cycle start date cannot be later than end date.');
    }

    const existing = await PerformanceCycleRepository.findByCode(companyId, dto.code);
    if (existing) {
      throw new Error(`A performance cycle with code '${dto.code}' already exists.`);
    }

    let defaultTemplateId = dto.defaultTemplateId;
    if (!defaultTemplateId) {
      const templates = await PerformanceTemplateRepository.findAll(companyId, true);
      if (templates.length > 0) defaultTemplateId = templates[0].id;
    }

    const cycle: PerformanceCycle = {
      id: `cyc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      companyId,
      code: dto.code.trim().toUpperCase(),
      name: dto.name.trim(),
      cycleType: dto.cycleType || PerformanceCycleType.ANNUAL,
      startDate: dto.startDate,
      endDate: dto.endDate,
      selfReviewDeadline: dto.selfReviewDeadline || dto.endDate,
      managerReviewDeadline: dto.managerReviewDeadline || dto.endDate,
      status: PerformanceCycleStatus.DRAFT,
      description: dto.description?.trim(),
      defaultTemplateId,
      createdBy: actor.id,
      createdByName: actor.fullName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const created = await PerformanceCycleRepository.create(cycle);

    await AuditService.log({
      actorId: actor.id,
      actorName: actor.fullName,
      actorEmail: actor.email,
      action: 'PERF_CYCLE_CREATED',
      targetModule: 'Performance',
      companyId,
      changesSummary: `Created Performance Cycle '${created.name}' (${created.code}).`,
    });

    return created;
  }

  public static async updateCycle(
    id: string,
    updates: UpdatePerformanceCycleDTO,
    companyId: string,
    actor: AuthUser
  ): Promise<PerformanceCycle> {
    const existing = await PerformanceCycleRepository.findById(id, companyId);
    if (!existing) {
      throw new Error(`Performance cycle '${id}' not found.`);
    }

    if (existing.status === PerformanceCycleStatus.COMPLETED && updates.status && updates.status !== PerformanceCycleStatus.COMPLETED && updates.status !== PerformanceCycleStatus.ARCHIVED) {
      throw new Error('Completed performance cycles cannot be modified back to active stages.');
    }

    const updated = await PerformanceCycleRepository.update(id, updates);
    if (!updated) throw new Error('Failed to update performance cycle.');

    await AuditService.log({
      actorId: actor.id,
      actorName: actor.fullName,
      actorEmail: actor.email,
      action: 'PERF_CYCLE_UPDATED',
      targetModule: 'Performance',
      companyId,
      changesSummary: `Updated Performance Cycle '${updated.name}' (Status: ${updated.status}).`,
    });

    return updated;
  }

  public static async changeCycleStatus(
    id: string,
    newStatus: PerformanceCycleStatus,
    companyId: string,
    actor: AuthUser
  ): Promise<PerformanceCycle> {
    const cycle = await PerformanceCycleRepository.findById(id, companyId);
    if (!cycle) throw new Error(`Performance cycle '${id}' not found.`);

    const oldStatus = cycle.status;
    const updated = await PerformanceCycleRepository.update(id, { status: newStatus });
    if (!updated) throw new Error('Failed to update cycle status.');

    // If activating cycle or moving to self-review, auto-initialize reviews for active employees if not already created
    if (newStatus === PerformanceCycleStatus.ACTIVE || newStatus === PerformanceCycleStatus.SELF_REVIEW || newStatus === PerformanceCycleStatus.GOAL_SETTING) {
      await this.initializeCycleReviews(id, companyId, actor);
    }

    await AuditService.log({
      actorId: actor.id,
      actorName: actor.fullName,
      actorEmail: actor.email,
      action: 'PERF_CYCLE_STATUS_CHANGED',
      targetModule: 'Performance',
      companyId,
      changesSummary: `Transitioned Cycle '${cycle.name}' from ${oldStatus} to ${newStatus}.`,
    });

    return updated;
  }

  /**
   * Initializes review appraisal records for all active employees for this cycle
   */
  public static async initializeCycleReviews(
    cycleId: string,
    companyId: string,
    actor: AuthUser
  ): Promise<{ initializedCount: number; totalActiveEmployees: number }> {
    const cycle = await PerformanceCycleRepository.findById(cycleId, companyId);
    if (!cycle) throw new Error(`Cycle '${cycleId}' not found.`);

    const templateId = cycle.defaultTemplateId;
    if (!templateId) {
      throw new Error('Cycle does not have a default review template assigned.');
    }

    // Get all active employees in this company
    const activeEmployees = Array.from(this.db.employees.values()).filter(
      (e) => e.companyId === companyId && e.status === 'ACTIVE'
    );

    let initializedCount = 0;

    for (const emp of activeEmployees) {
      // Check if review already exists
      const existing = await PerformanceReviewRepository.findByCycleAndEmployee(cycleId, emp.id, companyId);
      if (existing) continue;

      // Find current manager
      const asg = await EmployeeAssignmentRepository.findCurrentAssignment(emp.id);
      const reviewerId = asg?.managerId || emp.id; // Fallback to self/admin if no manager

      const review: PerformanceReview = {
        id: `rev-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        companyId,
        cycleId,
        employeeId: emp.id,
        reviewerId,
        templateId,
        status: PerformanceReviewStatus.SELF_REVIEW_PENDING,
        selfCompetencyRatings: [],
        managerCompetencyRatings: [],
        isFinalized: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await PerformanceReviewRepository.create(review);

      // Add audit history
      await PerformanceReviewHistoryRepository.create({
        id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        companyId,
        reviewId: review.id,
        action: 'CYCLE_INITIALIZED',
        newStatus: PerformanceReviewStatus.SELF_REVIEW_PENDING,
        actorId: actor.id,
        actorName: actor.fullName,
        actorRole: actor.role,
        comment: `Appraisal initialized for ${emp.displayName} in cycle ${cycle.name}`,
        snapshotData: { employeeId: emp.id, reviewerId, cycleId, templateId },
        createdAt: new Date().toISOString(),
      });

      initializedCount++;
    }

    return { initializedCount, totalActiveEmployees: activeEmployees.length };
  }

  // =========================================================================
  // 3. PERFORMANCE GOALS & KRAS
  // =========================================================================

  public static async getGoals(
    companyId: string,
    actor: AuthUser,
    filter: { cycleId?: string; employeeId?: string; status?: PerformanceGoalStatus; isManagerGoal?: boolean; category?: string }
  ): Promise<PerformanceGoal[]> {
    const authScope = await this.getAuthorizedEmployeeIds(actor, companyId);

    // If employee is requesting a specific employee's goals, verify access
    if (filter.employeeId) {
      if (authScope !== null && !authScope.includes(filter.employeeId)) {
        throw new Error('Access denied: You do not have permission to view performance goals for this employee.');
      }
      return PerformanceGoalRepository.findAll({
        companyId,
        cycleId: filter.cycleId,
        employeeId: filter.employeeId,
        status: filter.status,
        category: filter.category,
        isManagerGoal: filter.isManagerGoal,
      });
    }

    return PerformanceGoalRepository.findAll({
      companyId,
      cycleId: filter.cycleId,
      employeeIds: authScope === null ? undefined : authScope,
      status: filter.status,
      category: filter.category,
      isManagerGoal: filter.isManagerGoal,
    });
  }

  public static async getGoalById(id: string, companyId: string, actor: AuthUser): Promise<PerformanceGoal | null> {
    const goal = await PerformanceGoalRepository.findById(id, companyId);
    if (!goal) return null;

    const authScope = await this.getAuthorizedEmployeeIds(actor, companyId);
    if (authScope !== null && !authScope.includes(goal.employeeId)) {
      throw new Error('Access denied: You are not authorized to view this goal.');
    }

    return goal;
  }

  public static async createGoal(
    dto: CreatePerformanceGoalDTO,
    companyId: string,
    actor: AuthUser
  ): Promise<PerformanceGoal> {
    if (!dto.title || !dto.cycleId || !dto.category) {
      throw new Error('Goal title, cycle ID, and category are required.');
    }

    const cycle = await PerformanceCycleRepository.findById(dto.cycleId, companyId);
    if (!cycle) throw new Error(`Performance cycle '${dto.cycleId}' not found.`);

    // Determine target employee
    let employeeId = dto.employeeId;
    if (!employeeId) {
      if (!actor.employeeId) throw new Error('Employee identifier is required.');
      employeeId = actor.employeeId;
    }

    const authScope = await this.getAuthorizedEmployeeIds(actor, companyId);
    if (authScope !== null && !authScope.includes(employeeId)) {
      throw new Error('Access denied: You cannot create goals for this employee.');
    }

    // Check parent goal if specified
    if (dto.parentGoalId) {
      const parent = await PerformanceGoalRepository.findById(dto.parentGoalId, companyId);
      if (!parent) throw new Error(`Parent goal '${dto.parentGoalId}' not found.`);
    }

    const isManagerGoal = dto.isManagerGoal ?? (actor.role === UserRole.MANAGER || actor.role === UserRole.HR_ADMIN || actor.role === UserRole.SUPER_ADMIN);

    const goal: PerformanceGoal = {
      id: `goal-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      companyId,
      cycleId: dto.cycleId,
      employeeId,
      category: dto.category,
      title: dto.title.trim(),
      description: dto.description?.trim(),
      measurementType: dto.measurementType,
      targetValue: dto.targetValue ?? 100.0,
      unit: dto.unit || '%',
      currentValue: dto.currentValue ?? 0.0,
      weightage: dto.weightage ?? 20.0,
      dueDate: dto.dueDate,
      status: PerformanceGoalStatus.DRAFT,
      parentGoalId: dto.parentGoalId,
      isManagerGoal,
      createdBy: actor.employeeId || actor.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const created = await PerformanceGoalRepository.create(goal);

    await AuditService.log({
      actorId: actor.id,
      actorName: actor.fullName,
      actorEmail: actor.email,
      action: 'PERF_GOAL_CREATED',
      targetModule: 'Performance',
      companyId,
      changesSummary: `Created Goal '${created.title}' for employee ${employeeId}.`,
    });

    return created;
  }

  public static async updateGoal(
    id: string,
    updates: UpdatePerformanceGoalDTO,
    companyId: string,
    actor: AuthUser
  ): Promise<PerformanceGoal> {
    const goal = await PerformanceGoalRepository.findById(id, companyId);
    if (!goal) throw new Error(`Goal '${id}' not found.`);

    const authScope = await this.getAuthorizedEmployeeIds(actor, companyId);
    if (authScope !== null && !authScope.includes(goal.employeeId)) {
      throw new Error('Access denied: You cannot modify this goal.');
    }

    const updated = await PerformanceGoalRepository.update(id, updates);
    if (!updated) throw new Error('Failed to update goal.');

    return updated;
  }

  public static async updateGoalProgress(
    id: string,
    currentValue: number,
    status?: PerformanceGoalStatus,
    companyId: string = 'comp-101',
    actor?: AuthUser
  ): Promise<PerformanceGoal> {
    const goal = await PerformanceGoalRepository.findById(id, companyId);
    if (!goal) throw new Error(`Goal '${id}' not found.`);

    let newStatus = status || goal.status;
    if (currentValue >= goal.targetValue) {
      newStatus = PerformanceGoalStatus.COMPLETED;
    } else if (currentValue > 0 && newStatus === PerformanceGoalStatus.SUBMITTED) {
      newStatus = PerformanceGoalStatus.IN_PROGRESS;
    }

    const updated = await PerformanceGoalRepository.update(id, {
      currentValue,
      status: newStatus,
    });
    if (!updated) throw new Error('Failed to update goal progress.');

    return updated;
  }

  public static async approveGoal(id: string, companyId: string, actor: AuthUser): Promise<PerformanceGoal> {
    const goal = await PerformanceGoalRepository.findById(id, companyId);
    if (!goal) throw new Error(`Goal '${id}' not found.`);

    // Approver cannot be self unless HR/Admin
    if (actor.employeeId === goal.employeeId && actor.role === UserRole.EMPLOYEE) {
      throw new Error('Employees cannot approve their own performance goals.');
    }

    const updated = await PerformanceGoalRepository.update(id, {
      status: PerformanceGoalStatus.APPROVED,
      approvedBy: actor.employeeId || actor.id,
      approvedAt: new Date().toISOString(),
    });
    if (!updated) throw new Error('Failed to approve goal.');

    return updated;
  }

  public static async deleteGoal(id: string, companyId: string, actor: AuthUser): Promise<boolean> {
    const goal = await PerformanceGoalRepository.findById(id, companyId);
    if (!goal) return false;

    const authScope = await this.getAuthorizedEmployeeIds(actor, companyId);
    if (authScope !== null && !authScope.includes(goal.employeeId)) {
      throw new Error('Access denied: You cannot delete this goal.');
    }

    return PerformanceGoalRepository.delete(id);
  }

  // =========================================================================
  // 4. PERFORMANCE REVIEWS & APPRAISALS (SELF, MANAGER & FINALIZATION)
  // =========================================================================

  public static async getReviews(
    companyId: string,
    actor: AuthUser,
    filter: { cycleId?: string; employeeId?: string; reviewerId?: string; status?: PerformanceReviewStatus; isFinalized?: boolean }
  ): Promise<PerformanceReview[]> {
    const authScope = await this.getAuthorizedEmployeeIds(actor, companyId);

    if (filter.employeeId) {
      if (authScope !== null && !authScope.includes(filter.employeeId)) {
        throw new Error('Access denied: You do not have permission to view reviews for this employee.');
      }
      return PerformanceReviewRepository.findAll({
        companyId,
        cycleId: filter.cycleId,
        employeeId: filter.employeeId,
        reviewerId: filter.reviewerId,
        status: filter.status,
        isFinalized: filter.isFinalized,
      });
    }

    return PerformanceReviewRepository.findAll({
      companyId,
      cycleId: filter.cycleId,
      employeeIds: authScope === null ? undefined : authScope,
      reviewerId: filter.reviewerId,
      status: filter.status,
      isFinalized: filter.isFinalized,
    });
  }

  public static async getReviewById(id: string, companyId: string, actor: AuthUser): Promise<PerformanceReview | null> {
    const review = await PerformanceReviewRepository.findById(id, companyId);
    if (!review) return null;

    const authScope = await this.getAuthorizedEmployeeIds(actor, companyId);
    if (authScope !== null && !authScope.includes(review.employeeId) && actor.employeeId !== review.reviewerId) {
      throw new Error('Access denied: You do not have permission to view this review.');
    }

    return review;
  }

  /**
   * Submit Self Review (Employee Self-Appraisal)
   */
  public static async submitSelfReview(
    reviewId: string,
    dto: SubmitSelfReviewDTO,
    companyId: string,
    actor: AuthUser
  ): Promise<PerformanceReview> {
    const review = await PerformanceReviewRepository.findById(reviewId, companyId);
    if (!review) throw new Error(`Performance review '${reviewId}' not found.`);

    if (review.isFinalized) {
      throw new Error('Cannot submit self-review on a finalized appraisal.');
    }

    // Verify employee identity
    const isEmployeeSelf = actor.employeeId === review.employeeId;
    const isHrOrAdmin = actor.role === UserRole.HR_ADMIN || actor.role === UserRole.SUPER_ADMIN;

    if (!isEmployeeSelf && !isHrOrAdmin) {
      throw new Error('Access denied: You can only submit self-appraisal for yourself.');
    }

    if (dto.selfOverallRating < 1 || dto.selfOverallRating > 5) {
      throw new Error('Self overall rating must be between 1.0 and 5.0.');
    }

    // Save competency ratings
    const competencyRatings = dto.competencyRatings.map((c) => ({
      competencyId: c.competencyId,
      competencyName: c.competencyId,
      weightage: 25.0,
      rating: c.rating,
      comment: c.comment,
    }));

    // Update goals self ratings if provided
    if (dto.goalRatings && dto.goalRatings.length > 0) {
      for (const gr of dto.goalRatings) {
        await PerformanceGoalRepository.update(gr.goalId, {
          selfRating: gr.selfRating,
          selfComment: gr.selfComment,
          currentValue: gr.currentValue,
        });
      }
    }

    const previousStatus = review.status;
    const newStatus = PerformanceReviewStatus.MANAGER_REVIEW_PENDING;

    const updated = await PerformanceReviewRepository.update(reviewId, {
      selfOverallRating: dto.selfOverallRating,
      selfOverallComments: dto.selfOverallComments,
      selfStrengths: dto.selfStrengths,
      selfImprovements: dto.selfImprovements,
      selfCompetencyRatings: competencyRatings,
      selfSubmittedAt: new Date().toISOString(),
      status: newStatus,
    });

    if (!updated) throw new Error('Failed to update review record.');

    // Save immutable history snapshot
    await PerformanceReviewHistoryRepository.create({
      id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      companyId,
      reviewId,
      action: 'SELF_REVIEW_SUBMITTED',
      previousStatus,
      newStatus,
      actorId: actor.id,
      actorName: actor.fullName,
      actorRole: actor.role,
      comment: `Self-appraisal submitted with overall rating ${dto.selfOverallRating.toFixed(2)}.`,
      snapshotData: {
        selfOverallRating: dto.selfOverallRating,
        selfOverallComments: dto.selfOverallComments,
        selfStrengths: dto.selfStrengths,
        selfImprovements: dto.selfImprovements,
        competencyRatings,
      },
      createdAt: new Date().toISOString(),
    });

    await AuditService.log({
      actorId: actor.id,
      actorName: actor.fullName,
      actorEmail: actor.email,
      action: 'SELF_REVIEW_SUBMITTED',
      targetModule: 'Performance',
      companyId,
      changesSummary: `Employee ${review.employeeName || review.employeeId} submitted self-review for cycle ${review.cycleName}.`,
    });

    return updated;
  }

  /**
   * Submit Manager Review (Appraiser Review & Rating)
   */
  public static async submitManagerReview(
    reviewId: string,
    dto: SubmitManagerReviewDTO,
    companyId: string,
    actor: AuthUser
  ): Promise<PerformanceReview> {
    const review = await PerformanceReviewRepository.findById(reviewId, companyId);
    if (!review) throw new Error(`Performance review '${reviewId}' not found.`);

    if (review.isFinalized) {
      throw new Error('Cannot modify a finalized appraisal.');
    }

    // Verify manager hierarchy / reviewer identity
    const isAssignedReviewer = actor.employeeId === review.reviewerId;
    const isHrOrAdmin = actor.role === UserRole.HR_ADMIN || actor.role === UserRole.SUPER_ADMIN;

    if (!isAssignedReviewer && !isHrOrAdmin) {
      // Check if actor is an upstream manager
      const subordinates = actor.employeeId ? await EmployeeAssignmentRepository.getAllSubordinateIds(actor.employeeId) : [];
      if (!subordinates.includes(review.employeeId)) {
        throw new Error('Access denied: You are not authorized to conduct manager appraisal for this employee.');
      }
    }

    if (dto.managerOverallRating < 1 || dto.managerOverallRating > 5) {
      throw new Error('Manager overall rating must be between 1.0 and 5.0.');
    }

    const competencyRatings = dto.competencyRatings.map((c) => ({
      competencyId: c.competencyId,
      competencyName: c.competencyId,
      weightage: 25.0,
      rating: c.rating,
      comment: c.comment,
    }));

    // Update goal manager ratings
    if (dto.goalRatings && dto.goalRatings.length > 0) {
      for (const gr of dto.goalRatings) {
        await PerformanceGoalRepository.update(gr.goalId, {
          managerRating: gr.managerRating,
          managerComment: gr.managerComment,
        });
      }
    }

    // Calculate provisional score
    const template = await PerformanceTemplateRepository.findById(review.templateId, companyId);
    const goalWeightPct = template?.goalWeightagePct ?? 60.0;
    const compWeightPct = template?.competencyWeightagePct ?? 40.0;

    // Goals average rating (or default to managerOverallRating)
    const goals = await PerformanceGoalRepository.findByEmployeeAndCycle(companyId, review.cycleId, review.employeeId);
    let avgGoalRating = dto.managerOverallRating;
    if (goals.length > 0) {
      const ratedGoals = goals.filter((g) => g.managerRating !== undefined || g.selfRating !== undefined);
      if (ratedGoals.length > 0) {
        const sum = ratedGoals.reduce((acc, g) => acc + (g.managerRating ?? g.selfRating ?? 3), 0);
        avgGoalRating = sum / ratedGoals.length;
      }
    }

    // Competencies average rating
    let avgCompRating = dto.managerOverallRating;
    if (competencyRatings.length > 0) {
      const sum = competencyRatings.reduce((acc, c) => acc + c.rating, 0);
      avgCompRating = sum / competencyRatings.length;
    }

    // Weighted final rating & score
    const finalRating = Number(((avgGoalRating * (goalWeightPct / 100)) + (avgCompRating * (compWeightPct / 100))).toFixed(2));
    const finalScore = Number((finalRating * 20).toFixed(2)); // Scaled to 100

    // Grade resolution
    let finalGrade = 'Meets Expectations (ME)';
    if (template?.ratingScale) {
      const match = template.ratingScale.find((r) => finalRating >= r.minScore && finalRating <= r.maxScore);
      if (match) finalGrade = match.label;
    }

    const previousStatus = review.status;
    const newStatus = PerformanceReviewStatus.COMPLETED;

    const updated = await PerformanceReviewRepository.update(reviewId, {
      managerOverallRating: dto.managerOverallRating,
      managerOverallComments: dto.managerOverallComments,
      managerStrengths: dto.managerStrengths,
      managerImprovements: dto.managerImprovements,
      managerRecommendations: dto.managerRecommendations,
      managerCompetencyRatings: competencyRatings,
      managerSubmittedAt: new Date().toISOString(),
      finalRating,
      finalScore,
      finalGrade,
      status: newStatus,
    });

    if (!updated) throw new Error('Failed to save manager review.');

    // Save immutable snapshot to history
    await PerformanceReviewHistoryRepository.create({
      id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      companyId,
      reviewId,
      action: 'MANAGER_REVIEW_SUBMITTED',
      previousStatus,
      newStatus,
      actorId: actor.id,
      actorName: actor.fullName,
      actorRole: actor.role,
      comment: `Manager review completed with rating ${dto.managerOverallRating.toFixed(2)} and recommendation: ${dto.managerRecommendations}.`,
      snapshotData: {
        managerOverallRating: dto.managerOverallRating,
        managerOverallComments: dto.managerOverallComments,
        managerRecommendations: dto.managerRecommendations,
        finalRating,
        finalScore,
        finalGrade,
      },
      createdAt: new Date().toISOString(),
    });

    await AuditService.log({
      actorId: actor.id,
      actorName: actor.fullName,
      actorEmail: actor.email,
      action: 'MANAGER_REVIEW_SUBMITTED',
      targetModule: 'Performance',
      companyId,
      changesSummary: `Manager ${actor.fullName} completed appraisal for employee ${review.employeeName || review.employeeId}.`,
    });

    return updated;
  }

  /**
   * Finalize Performance Review
   * Locks ratings and writes immutable ledger entry.
   * Note: Performance ratings are deliberately kept independent of payroll as mandated.
   */
  public static async finalizeReview(
    reviewId: string,
    dto: FinalizeReviewDTO,
    companyId: string,
    actor: AuthUser
  ): Promise<PerformanceReview> {
    const review = await PerformanceReviewRepository.findById(reviewId, companyId);
    if (!review) throw new Error(`Performance review '${reviewId}' not found.`);

    if (review.isFinalized) {
      throw new Error('This review is already finalized and locked.');
    }

    const isReviewer = actor.employeeId === review.reviewerId;
    const isHrOrAdmin = actor.role === UserRole.HR_ADMIN || actor.role === UserRole.SUPER_ADMIN || actor.permissions?.includes(PermissionKey.PERFORMANCE_MANAGE);

    if (!isReviewer && !isHrOrAdmin) {
      throw new Error('Access denied: You do not have permission to finalize this review.');
    }

    const finalRating = dto.finalRating ?? review.finalRating ?? review.managerOverallRating ?? 3.0;
    const finalScore = dto.finalScore ?? review.finalScore ?? Number((finalRating * 20).toFixed(2));
    const finalGrade = dto.finalGrade ?? review.finalGrade ?? 'Meets Expectations (ME)';
    const finalComments = dto.finalComments ?? review.finalComments ?? 'Appraisal finalized successfully.';

    const previousStatus = review.status;
    const newStatus = PerformanceReviewStatus.FINALIZED;

    const updated = await PerformanceReviewRepository.update(reviewId, {
      finalRating,
      finalScore,
      finalGrade,
      finalComments,
      finalizedBy: actor.employeeId || actor.id,
      finalizedAt: new Date().toISOString(),
      isFinalized: true,
      status: newStatus,
    });

    if (!updated) throw new Error('Failed to finalize performance review.');

    // Save final immutable history audit record
    await PerformanceReviewHistoryRepository.create({
      id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      companyId,
      reviewId,
      action: 'REVIEW_FINALIZED',
      previousStatus,
      newStatus,
      actorId: actor.id,
      actorName: actor.fullName,
      actorRole: actor.role,
      comment: `Review finalized by ${actor.fullName}. Final Rating: ${finalRating.toFixed(2)}, Score: ${finalScore}, Grade: ${finalGrade}.`,
      snapshotData: {
        finalRating,
        finalScore,
        finalGrade,
        finalComments,
        finalizedBy: actor.employeeId || actor.id,
        finalizedAt: updated.finalizedAt,
        selfOverallRating: review.selfOverallRating,
        managerOverallRating: review.managerOverallRating,
        managerRecommendations: review.managerRecommendations,
      },
      createdAt: new Date().toISOString(),
    });

    await AuditService.log({
      actorId: actor.id,
      actorName: actor.fullName,
      actorEmail: actor.email,
      action: 'REVIEW_FINALIZED',
      targetModule: 'Performance',
      companyId,
      changesSummary: `Finalized appraisal for ${review.employeeName || review.employeeId} with Grade '${finalGrade}'.`,
    });

    return updated;
  }

  public static async getReviewHistory(reviewId: string, companyId: string, actor: AuthUser): Promise<PerformanceReviewHistory[]> {
    const review = await PerformanceReviewRepository.findById(reviewId, companyId);
    if (!review) throw new Error(`Review '${reviewId}' not found.`);

    const authScope = await this.getAuthorizedEmployeeIds(actor, companyId);
    if (authScope !== null && !authScope.includes(review.employeeId) && actor.employeeId !== review.reviewerId) {
      throw new Error('Access denied: You cannot view this review history.');
    }

    return PerformanceReviewHistoryRepository.findByReviewId(reviewId, companyId);
  }

  // =========================================================================
  // 5. PERFORMANCE DASHBOARD & METRICS
  // =========================================================================

  public static async getDashboardMetrics(companyId: string, actor: AuthUser): Promise<PerformanceDashboardMetrics> {
    const authScope = await this.getAuthorizedEmployeeIds(actor, companyId);

    const cycles = await PerformanceCycleRepository.findAll(companyId);
    const activeCycle = cycles.find((c) => c.status === PerformanceCycleStatus.ACTIVE) || cycles[0];

    const allGoals = await PerformanceGoalRepository.findAll({
      companyId,
      cycleId: activeCycle?.id,
      employeeIds: authScope === null ? undefined : authScope,
    });

    const allReviews = await PerformanceReviewRepository.findAll({
      companyId,
      cycleId: activeCycle?.id,
      employeeIds: authScope === null ? undefined : authScope,
    });

    const totalEmployeesInScope = authScope === null
      ? Array.from(this.db.employees.values()).filter((e) => e.companyId === companyId && e.status === 'ACTIVE').length
      : authScope.length;

    const goalsSubmittedCount = allGoals.filter((g) => g.status !== PerformanceGoalStatus.DRAFT).length;
    const goalsApprovedCount = allGoals.filter((g) => g.status === PerformanceGoalStatus.APPROVED || g.status === PerformanceGoalStatus.COMPLETED).length;

    const selfReviewsPending = allReviews.filter((r) => r.status === PerformanceReviewStatus.SELF_REVIEW_PENDING || r.status === PerformanceReviewStatus.DRAFT).length;
    const managerReviewsPending = allReviews.filter((r) => r.status === PerformanceReviewStatus.MANAGER_REVIEW_PENDING || r.status === PerformanceReviewStatus.IN_REVIEW).length;
    const reviewsFinalized = allReviews.filter((r) => r.isFinalized || r.status === PerformanceReviewStatus.FINALIZED).length;

    const completionRatePct = allReviews.length > 0
      ? Number(((reviewsFinalized / allReviews.length) * 100).toFixed(1))
      : 0;

    // Average rating
    const ratedReviews = allReviews.filter((r) => r.finalRating !== undefined || r.managerOverallRating !== undefined);
    const averageRating = ratedReviews.length > 0
      ? Number((ratedReviews.reduce((acc, r) => acc + (r.finalRating ?? r.managerOverallRating ?? 0), 0) / ratedReviews.length).toFixed(2))
      : 0;

    // Grade Distribution
    const gradeCounts: Record<string, number> = {
      'Outstanding (O)': 0,
      'Exceeds Expectations (EE)': 0,
      'Meets Expectations (ME)': 0,
      'Needs Improvement (NI)': 0,
      'Unsatisfactory (U)': 0,
    };

    allReviews.forEach((r) => {
      if (r.finalGrade && gradeCounts[r.finalGrade] !== undefined) {
        gradeCounts[r.finalGrade]++;
      } else if (r.finalGrade) {
        gradeCounts[r.finalGrade] = (gradeCounts[r.finalGrade] || 0) + 1;
      }
    });

    const totalRated = ratedReviews.length || 1;
    const gradeDistribution = Object.entries(gradeCounts).map(([grade, count]) => ({
      grade,
      label: grade,
      count,
      percentage: Number(((count / totalRated) * 100).toFixed(1)),
    }));

    // Department ratings
    const deptMap: Record<string, { name: string; sumRating: number; sumScore: number; count: number }> = {};
    allReviews.forEach((r) => {
      const deptName = r.employeeDepartment || 'General';
      if (!deptMap[deptName]) {
        deptMap[deptName] = { name: deptName, sumRating: 0, sumScore: 0, count: 0 };
      }
      if (r.finalRating || r.managerOverallRating) {
        deptMap[deptName].sumRating += r.finalRating ?? r.managerOverallRating ?? 0;
        deptMap[deptName].sumScore += r.finalScore ?? ((r.finalRating ?? r.managerOverallRating ?? 0) * 20);
        deptMap[deptName].count++;
      }
    });

    const departmentRatings = Object.entries(deptMap).map(([deptId, val]) => ({
      departmentId: deptId,
      departmentName: val.name,
      averageRating: val.count > 0 ? Number((val.sumRating / val.count).toFixed(2)) : 0,
      averageScore: val.count > 0 ? Number((val.sumScore / val.count).toFixed(1)) : 0,
      count: val.count,
    }));

    const recentActivity = await PerformanceReviewHistoryRepository.findAll(companyId, 10);

    return {
      totalCycles: cycles.length,
      activeCycle,
      totalEmployeesInScope,
      goalsSubmittedCount,
      goalsApprovedCount,
      selfReviewsPending,
      managerReviewsPending,
      reviewsFinalized,
      completionRatePct,
      averageRating,
      gradeDistribution,
      departmentRatings,
      recentActivity,
    };
  }
}
