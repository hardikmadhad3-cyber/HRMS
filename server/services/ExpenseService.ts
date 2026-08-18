import {
  ExpenseCategory,
  ExpenseClaim,
  ExpenseClaimItem,
  ExpenseClaimHistory,
  ExpenseClaimStatus,
  CreateExpenseClaimDTO,
  UpdateExpenseClaimDTO,
  CreateExpenseClaimItemDTO,
  ExpenseApprovalActionDTO,
  CreateExpenseCategoryDTO,
  UpdateExpenseCategoryDTO,
  ExpenseDashboardMetrics,
} from '../../src/types/expenses.js';
import { AuthUser, UserRole, PermissionKey } from '../../src/types/auth.js';
import { ExpenseRepository } from '../database/repositories/ExpenseRepository.js';
import { EmployeeAssignmentRepository } from '../database/repositories/EmployeeAssignmentRepository.js';
import { RelationalDatabase } from '../database/RelationalDatabase.js';

export class ExpenseService {
  private static db = RelationalDatabase.getInstance();

  /**
   * Determine authorized employee IDs for team hierarchy scope
   */
  public static async getAuthorizedEmployeeIds(actor: AuthUser, companyId: string): Promise<string[] | null> {
    const isSuperAdmin = actor.role === UserRole.SUPER_ADMIN;
    const isHrOrFinance =
      actor.role === UserRole.HR_ADMIN ||
      actor.role === UserRole.PAYROLL_MANAGER ||
      actor.permissions?.includes(PermissionKey.EXPENSE_APPROVE);

    if (isSuperAdmin || isHrOrFinance) {
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
  // 1. EXPENSE CATEGORIES
  // =========================================================================
  public static async getCategories(companyId: string, activeOnly = false): Promise<ExpenseCategory[]> {
    return ExpenseRepository.findCategories(companyId, activeOnly);
  }

  public static async createCategory(
    dto: CreateExpenseCategoryDTO,
    companyId: string,
    actor: AuthUser
  ): Promise<ExpenseCategory> {
    if (actor.role !== UserRole.SUPER_ADMIN && actor.role !== UserRole.HR_ADMIN && actor.role !== UserRole.PAYROLL_MANAGER) {
      throw new Error('Access denied: Only HR or Finance administrators can create expense categories.');
    }

    const existing = await ExpenseRepository.findCategoryByCode(dto.code, companyId);
    if (existing) {
      throw new Error(`Expense category with code '${dto.code}' already exists.`);
    }

    const category: ExpenseCategory = {
      id: `exp-cat-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      companyId,
      code: dto.code.toUpperCase().trim(),
      name: dto.name.trim(),
      description: dto.description?.trim(),
      maxLimitPerClaim: dto.maxLimitPerClaim,
      requiresReceipt: dto.requiresReceipt !== undefined ? dto.requiresReceipt : true,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return ExpenseRepository.createCategory(category);
  }

  public static async updateCategory(
    id: string,
    updates: UpdateExpenseCategoryDTO,
    companyId: string,
    actor: AuthUser
  ): Promise<ExpenseCategory> {
    if (actor.role !== UserRole.SUPER_ADMIN && actor.role !== UserRole.HR_ADMIN && actor.role !== UserRole.PAYROLL_MANAGER) {
      throw new Error('Access denied: Only HR or Finance administrators can modify expense categories.');
    }

    const updated = await ExpenseRepository.updateCategory(id, companyId, updates);
    if (!updated) throw new Error(`Expense category '${id}' not found.`);
    return updated;
  }

  // =========================================================================
  // 2. EXPENSE CLAIMS & ITEMS
  // =========================================================================
  public static async getClaims(
    companyId: string,
    actor: AuthUser,
    filter: { employeeId?: string; status?: ExpenseClaimStatus; scope?: 'my' | 'team' | 'all' } = {}
  ): Promise<ExpenseClaim[]> {
    const authScope = await this.getAuthorizedEmployeeIds(actor, companyId);

    if (filter.scope === 'my') {
      if (!actor.employeeId) return [];
      return ExpenseRepository.findClaims(companyId, { employeeId: actor.employeeId, status: filter.status });
    }

    if (filter.scope === 'team') {
      if (!actor.employeeId) return [];
      const subordinateIds = await EmployeeAssignmentRepository.getAllSubordinateIds(actor.employeeId);
      return ExpenseRepository.findClaims(companyId, { employeeIds: subordinateIds, status: filter.status });
    }

    if (authScope === null) {
      // Full company
      return ExpenseRepository.findClaims(companyId, {
        employeeId: filter.employeeId,
        status: filter.status,
      });
    }

    // Scoped list
    let targetEmployeeIds = authScope;
    if (filter.employeeId) {
      if (!authScope.includes(filter.employeeId)) {
        throw new Error('Access denied: You are not authorized to view claims for this employee.');
      }
      return ExpenseRepository.findClaims(companyId, { employeeId: filter.employeeId, status: filter.status });
    }

    return ExpenseRepository.findClaims(companyId, { employeeIds: targetEmployeeIds, status: filter.status });
  }

  public static async getClaimById(id: string, companyId: string, actor: AuthUser): Promise<ExpenseClaim> {
    const claim = await ExpenseRepository.findClaimById(id, companyId);
    if (!claim) throw new Error(`Expense claim '${id}' not found.`);

    const authScope = await this.getAuthorizedEmployeeIds(actor, companyId);
    if (authScope !== null && !authScope.includes(claim.employeeId)) {
      throw new Error('Access denied: You do not have permission to view this expense claim.');
    }

    return claim;
  }

  public static async createClaim(
    dto: CreateExpenseClaimDTO,
    companyId: string,
    actor: AuthUser
  ): Promise<ExpenseClaim> {
    const employeeId = dto.employeeId || actor.employeeId;
    if (!employeeId) throw new Error('Employee identifier is required to create an expense claim.');

    const authScope = await this.getAuthorizedEmployeeIds(actor, companyId);
    if (authScope !== null && !authScope.includes(employeeId)) {
      throw new Error('Access denied: You cannot create expense claims for this employee.');
    }

    const emp = this.db.employees.get(employeeId);
    if (!emp) throw new Error(`Employee '${employeeId}' not found.`);

    // Auto-generate claim number
    const count = this.db.expenseClaims.size + 1;
    const claimNumber = `EXP-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;
    const assignment = await EmployeeAssignmentRepository.findCurrentAssignment(employeeId);

    const claim: ExpenseClaim = {
      id: `exp-clm-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      companyId,
      claimNumber,
      employeeId,
      title: dto.title.trim(),
      description: dto.description?.trim(),
      currency: dto.currency || 'USD',
      totalAmount: 0.0,
      status: ExpenseClaimStatus.DRAFT,
      managerId: assignment?.managerId,
      receiptsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const created = await ExpenseRepository.createClaim(claim);

    // If items provided in creation DTO, add them
    if (dto.items && dto.items.length > 0) {
      for (const itemDto of dto.items) {
        await this.addClaimItem(created.id, itemDto, companyId, actor);
      }
    }

    // Log history
    await ExpenseRepository.logHistory({
      id: `exp-hist-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      claimId: created.id,
      companyId,
      action: 'CLAIM_CREATED',
      actorId: actor.employeeId || actor.id,
      actorName: actor.fullName,
      actorRole: actor.role,
      toStatus: ExpenseClaimStatus.DRAFT,
      remarks: 'Expense claim drafted',
      timestamp: new Date().toISOString(),
    });

    return (await ExpenseRepository.findClaimById(created.id, companyId))!;
  }

  public static async updateClaim(
    id: string,
    dto: UpdateExpenseClaimDTO,
    companyId: string,
    actor: AuthUser
  ): Promise<ExpenseClaim> {
    const claim = await this.getClaimById(id, companyId, actor);

    if (claim.status !== ExpenseClaimStatus.DRAFT && claim.status !== ExpenseClaimStatus.RETURNED) {
      throw new Error(`Cannot modify claim in status '${claim.status}'. Only DRAFT and RETURNED claims can be edited.`);
    }

    const updated = await ExpenseRepository.updateClaim(id, companyId, {
      title: dto.title?.trim() || claim.title,
      description: dto.description !== undefined ? dto.description.trim() : claim.description,
      currency: dto.currency || claim.currency,
    });

    return updated!;
  }

  public static async addClaimItem(
    claimId: string,
    dto: CreateExpenseClaimItemDTO,
    companyId: string,
    actor: AuthUser
  ): Promise<ExpenseClaimItem> {
    const claim = await this.getClaimById(claimId, companyId, actor);

    if (claim.status !== ExpenseClaimStatus.DRAFT && claim.status !== ExpenseClaimStatus.RETURNED) {
      throw new Error(`Cannot add items to a claim in status '${claim.status}'.`);
    }

    const category = await ExpenseRepository.findCategoryById(dto.categoryId, companyId);
    if (!category) throw new Error(`Expense category '${dto.categoryId}' not found.`);

    if (category.maxLimitPerClaim && dto.amount > category.maxLimitPerClaim) {
      throw new Error(
        `Amount ($${dto.amount}) exceeds category maximum limit of $${category.maxLimitPerClaim} per claim.`
      );
    }

    if (category.requiresReceipt && !dto.receiptAttachmentUrl && !dto.receiptFileName) {
      // Allowed during draft, but receipt flag will be noted
    }

    const item: ExpenseClaimItem = {
      id: `exp-item-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      claimId,
      companyId,
      categoryId: dto.categoryId,
      categoryName: category.name,
      expenseDate: dto.expenseDate,
      amount: Number(dto.amount),
      currency: dto.currency || claim.currency || 'USD',
      taxAmount: dto.taxAmount ? Number(dto.taxAmount) : 0.0,
      description: dto.description.trim(),
      merchantName: dto.merchantName?.trim(),
      receiptAttachmentUrl: dto.receiptAttachmentUrl,
      receiptFileName: dto.receiptFileName,
      receiptFileSize: dto.receiptFileSize,
      receiptMimeType: dto.receiptMimeType,
      isReceiptVerified: !!dto.receiptAttachmentUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return ExpenseRepository.createClaimItem(item);
  }

  public static async removeClaimItem(
    claimId: string,
    itemId: string,
    companyId: string,
    actor: AuthUser
  ): Promise<void> {
    const claim = await this.getClaimById(claimId, companyId, actor);

    if (claim.status !== ExpenseClaimStatus.DRAFT && claim.status !== ExpenseClaimStatus.RETURNED) {
      throw new Error(`Cannot remove items from a claim in status '${claim.status}'.`);
    }

    await ExpenseRepository.deleteClaimItem(itemId, companyId);
  }

  public static async submitClaim(
    claimId: string,
    companyId: string,
    actor: AuthUser
  ): Promise<ExpenseClaim> {
    const claim = await this.getClaimById(claimId, companyId, actor);

    if (claim.status !== ExpenseClaimStatus.DRAFT && claim.status !== ExpenseClaimStatus.RETURNED) {
      throw new Error(`Cannot submit claim in status '${claim.status}'.`);
    }

    const items = await ExpenseRepository.findItemsByClaimId(claimId);
    if (items.length === 0) {
      throw new Error('Cannot submit an expense claim with no expense items.');
    }

    // Check mandatory receipts
    for (const item of items) {
      const cat = await ExpenseRepository.findCategoryById(item.categoryId, companyId);
      if (cat?.requiresReceipt && !item.receiptAttachmentUrl && !item.receiptFileName) {
        throw new Error(`Receipt is required for item '${item.description}' under category '${cat.name}'.`);
      }
    }

    const previousStatus = claim.status;
    const updated = await ExpenseRepository.updateClaim(claimId, companyId, {
      status: ExpenseClaimStatus.SUBMITTED,
      submittedAt: new Date().toISOString(),
    });

    await ExpenseRepository.logHistory({
      id: `exp-hist-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      claimId,
      companyId,
      action: 'CLAIM_SUBMITTED',
      actorId: actor.employeeId || actor.id,
      actorName: actor.fullName,
      actorRole: actor.role,
      fromStatus: previousStatus,
      toStatus: ExpenseClaimStatus.SUBMITTED,
      remarks: `Submitted with ${items.length} items totaling $${updated?.totalAmount.toFixed(2)}`,
      snapshotData: { totalAmount: updated?.totalAmount, itemsCount: items.length },
      timestamp: new Date().toISOString(),
    });

    return updated!;
  }

  // =========================================================================
  // 3. APPROVAL / REJECTION / RETURN WORKFLOW
  // =========================================================================
  public static async processApprovalAction(
    claimId: string,
    dto: ExpenseApprovalActionDTO,
    companyId: string,
    actor: AuthUser
  ): Promise<ExpenseClaim> {
    const claim = await ExpenseRepository.findClaimById(claimId, companyId);
    if (!claim) throw new Error(`Expense claim '${claimId}' not found.`);

    const isHrOrFinance =
      actor.role === UserRole.SUPER_ADMIN ||
      actor.role === UserRole.HR_ADMIN ||
      actor.role === UserRole.PAYROLL_MANAGER;

    const isManager = actor.role === UserRole.MANAGER || (actor.employeeId && claim.managerId === actor.employeeId);

    if (!isHrOrFinance && !isManager) {
      throw new Error('Access denied: You do not have permissions to approve or reject expense claims.');
    }

    const previousStatus = claim.status;

    if (dto.action === 'APPROVE') {
      if (claim.status === ExpenseClaimStatus.SUBMITTED) {
        // Manager Approval or direct Finance approval
        if (isHrOrFinance) {
          // Direct final approval
          const updated = await ExpenseRepository.updateClaim(claimId, companyId, {
            status: ExpenseClaimStatus.FINANCE_APPROVED,
            managerApprovedAt: claim.managerApprovedAt || new Date().toISOString(),
            managerApprovedBy: claim.managerApprovedBy || actor.employeeId || actor.id,
            financeApprovedAt: new Date().toISOString(),
            financeApprovedBy: actor.employeeId || actor.id,
            financeRemarks: dto.remarks,
          });

          await ExpenseRepository.logHistory({
            id: `exp-hist-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            claimId,
            companyId,
            action: 'FINANCE_APPROVED',
            actorId: actor.employeeId || actor.id,
            actorName: actor.fullName,
            actorRole: actor.role,
            fromStatus: previousStatus,
            toStatus: ExpenseClaimStatus.FINANCE_APPROVED,
            remarks: dto.remarks || 'Claim approved by Finance',
            timestamp: new Date().toISOString(),
          });

          return updated!;
        } else {
          // Manager Approval
          const updated = await ExpenseRepository.updateClaim(claimId, companyId, {
            status: ExpenseClaimStatus.MANAGER_APPROVED,
            managerApprovedAt: new Date().toISOString(),
            managerApprovedBy: actor.employeeId || actor.id,
            managerRemarks: dto.remarks,
          });

          await ExpenseRepository.logHistory({
            id: `exp-hist-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            claimId,
            companyId,
            action: 'MANAGER_APPROVED',
            actorId: actor.employeeId || actor.id,
            actorName: actor.fullName,
            actorRole: actor.role,
            fromStatus: previousStatus,
            toStatus: ExpenseClaimStatus.MANAGER_APPROVED,
            remarks: dto.remarks || 'Claim approved by Manager, forwarded to Finance',
            timestamp: new Date().toISOString(),
          });

          return updated!;
        }
      } else if (claim.status === ExpenseClaimStatus.MANAGER_APPROVED) {
        // Finance Approval
        if (!isHrOrFinance) {
          throw new Error('Access denied: Only Finance or HR administrators can provide final finance approval.');
        }

        const updated = await ExpenseRepository.updateClaim(claimId, companyId, {
          status: ExpenseClaimStatus.FINANCE_APPROVED,
          financeApprovedAt: new Date().toISOString(),
          financeApprovedBy: actor.employeeId || actor.id,
          financeRemarks: dto.remarks,
        });

        await ExpenseRepository.logHistory({
          id: `exp-hist-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          claimId,
          companyId,
          action: 'FINANCE_APPROVED',
          actorId: actor.employeeId || actor.id,
          actorName: actor.fullName,
          actorRole: actor.role,
          fromStatus: previousStatus,
          toStatus: ExpenseClaimStatus.FINANCE_APPROVED,
          remarks: dto.remarks || 'Final Finance approval granted',
          timestamp: new Date().toISOString(),
        });

        return updated!;
      } else {
        throw new Error(`Cannot approve claim in current status '${claim.status}'.`);
      }
    } else if (dto.action === 'REJECT') {
      if (!dto.remarks) {
        throw new Error('A rejection reason must be provided when rejecting a claim.');
      }

      const updated = await ExpenseRepository.updateClaim(claimId, companyId, {
        status: ExpenseClaimStatus.REJECTED,
        rejectedAt: new Date().toISOString(),
        rejectedBy: actor.employeeId || actor.id,
        rejectionReason: dto.remarks,
      });

      await ExpenseRepository.logHistory({
        id: `exp-hist-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        claimId,
        companyId,
        action: 'CLAIM_REJECTED',
        actorId: actor.employeeId || actor.id,
        actorName: actor.fullName,
        actorRole: actor.role,
        fromStatus: previousStatus,
        toStatus: ExpenseClaimStatus.REJECTED,
        remarks: dto.remarks,
        timestamp: new Date().toISOString(),
      });

      return updated!;
    } else if (dto.action === 'RETURN') {
      if (!dto.remarks) {
        throw new Error('A reason for returning must be provided to guide employee revision.');
      }

      const updated = await ExpenseRepository.updateClaim(claimId, companyId, {
        status: ExpenseClaimStatus.RETURNED,
        returnedAt: new Date().toISOString(),
        returnedBy: actor.employeeId || actor.id,
        returnReason: dto.remarks,
      });

      await ExpenseRepository.logHistory({
        id: `exp-hist-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        claimId,
        companyId,
        action: 'CLAIM_RETURNED',
        actorId: actor.employeeId || actor.id,
        actorName: actor.fullName,
        actorRole: actor.role,
        fromStatus: previousStatus,
        toStatus: ExpenseClaimStatus.RETURNED,
        remarks: dto.remarks,
        timestamp: new Date().toISOString(),
      });

      return updated!;
    } else if (dto.action === 'PAY') {
      if (!isHrOrFinance) {
        throw new Error('Access denied: Only Finance administrators can mark claims as settled/paid.');
      }

      if (claim.status !== ExpenseClaimStatus.FINANCE_APPROVED) {
        throw new Error(`Cannot settle claim in status '${claim.status}'. Must be FINANCE_APPROVED first.`);
      }

      const paymentDate = dto.paymentDate || new Date().toISOString().slice(0, 10);
      const paymentReference = dto.paymentReference || `PAY-EXP-${Date.now()}`;

      const updated = await ExpenseRepository.updateClaim(claimId, companyId, {
        status: ExpenseClaimStatus.PAID,
        paymentDate,
        paymentReference,
      });

      await ExpenseRepository.logHistory({
        id: `exp-hist-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        claimId,
        companyId,
        action: 'CLAIM_PAID',
        actorId: actor.employeeId || actor.id,
        actorName: actor.fullName,
        actorRole: actor.role,
        fromStatus: previousStatus,
        toStatus: ExpenseClaimStatus.PAID,
        remarks: `Disbursed on ${paymentDate}. Ref: ${paymentReference}`,
        timestamp: new Date().toISOString(),
      });

      return updated!;
    }

    throw new Error(`Unsupported approval action: ${dto.action}`);
  }

  public static async getClaimHistory(claimId: string, companyId: string, actor: AuthUser): Promise<ExpenseClaimHistory[]> {
    await this.getClaimById(claimId, companyId, actor);
    return ExpenseRepository.findHistoryByClaimId(claimId, companyId);
  }

  // =========================================================================
  // 4. EXPENSE ANALYTICS & DASHBOARD METRICS
  // =========================================================================
  public static async getDashboardMetrics(companyId: string, actor: AuthUser): Promise<ExpenseDashboardMetrics> {
    const claims = await this.getClaims(companyId, actor, {});
    const categories = await ExpenseRepository.findCategories(companyId);

    const pendingManagerCount = claims.filter((c) => c.status === ExpenseClaimStatus.SUBMITTED).length;
    const pendingFinanceCount = claims.filter((c) => c.status === ExpenseClaimStatus.MANAGER_APPROVED).length;
    const approvedCount = claims.filter((c) => c.status === ExpenseClaimStatus.FINANCE_APPROVED).length;
    const paidCount = claims.filter((c) => c.status === ExpenseClaimStatus.PAID).length;
    const rejectedCount = claims.filter((c) => c.status === ExpenseClaimStatus.REJECTED).length;
    const returnedCount = claims.filter((c) => c.status === ExpenseClaimStatus.RETURNED).length;

    const totalClaimedAmount = claims.reduce((sum, c) => sum + Number(c.totalAmount || 0), 0);
    const totalApprovedAmount = claims
      .filter((c) => c.status === ExpenseClaimStatus.FINANCE_APPROVED || c.status === ExpenseClaimStatus.PAID)
      .reduce((sum, c) => sum + Number(c.totalAmount || 0), 0);
    const totalPaidAmount = claims
      .filter((c) => c.status === ExpenseClaimStatus.PAID)
      .reduce((sum, c) => sum + Number(c.totalAmount || 0), 0);

    const categoryBreakdown = categories.map((cat) => {
      let count = 0;
      let totalAmount = 0;
      for (const c of claims) {
        if (c.items) {
          for (const item of c.items) {
            if (item.categoryId === cat.id) {
              count++;
              totalAmount += Number(item.amount || 0);
            }
          }
        }
      }
      return {
        categoryName: cat.name,
        count,
        totalAmount: Math.round(totalAmount * 100) / 100,
      };
    });

    return {
      totalClaimsCount: claims.length,
      pendingManagerCount,
      pendingFinanceCount,
      approvedCount,
      paidCount,
      rejectedCount,
      returnedCount,
      totalClaimedAmount: Math.round(totalClaimedAmount * 100) / 100,
      totalApprovedAmount: Math.round(totalApprovedAmount * 100) / 100,
      totalPaidAmount: Math.round(totalPaidAmount * 100) / 100,
      categoryBreakdown,
    };
  }
}
