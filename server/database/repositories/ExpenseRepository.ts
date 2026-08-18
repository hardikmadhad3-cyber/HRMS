import {
  ExpenseCategory,
  ExpenseClaim,
  ExpenseClaimItem,
  ExpenseClaimHistory,
  ExpenseClaimStatus,
} from '../../../src/types/expenses.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export class ExpenseRepository {
  private static db = RelationalDatabase.getInstance();

  // ---------------------------------------------------------------------------
  // Expense Categories
  // ---------------------------------------------------------------------------
  public static async findCategories(companyId: string, activeOnly = false): Promise<ExpenseCategory[]> {
    return Array.from(this.db.expenseCategories.values()).filter(
      (c) => c.companyId === companyId && (!activeOnly || c.isActive)
    );
  }

  public static async findCategoryById(id: string, companyId: string): Promise<ExpenseCategory | null> {
    const cat = this.db.expenseCategories.get(id);
    if (cat && cat.companyId === companyId) return { ...cat };
    return null;
  }

  public static async findCategoryByCode(code: string, companyId: string): Promise<ExpenseCategory | null> {
    const cat = Array.from(this.db.expenseCategories.values()).find(
      (c) => c.companyId === companyId && c.code.toUpperCase() === code.toUpperCase()
    );
    return cat ? { ...cat } : null;
  }

  public static async createCategory(category: ExpenseCategory): Promise<ExpenseCategory> {
    this.db.expenseCategories.set(category.id, { ...category });
    return { ...category };
  }

  public static async updateCategory(id: string, companyId: string, updates: Partial<ExpenseCategory>): Promise<ExpenseCategory | null> {
    const existing = await this.findCategoryById(id, companyId);
    if (!existing) return null;
    const updated: ExpenseCategory = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.db.expenseCategories.set(id, updated);
    return { ...updated };
  }

  // ---------------------------------------------------------------------------
  // Expense Claims
  // ---------------------------------------------------------------------------
  public static async findClaims(
    companyId: string,
    filter: {
      employeeId?: string;
      employeeIds?: string[];
      status?: ExpenseClaimStatus;
      managerId?: string;
    } = {}
  ): Promise<ExpenseClaim[]> {
    let list = Array.from(this.db.expenseClaims.values()).filter((c) => c.companyId === companyId);

    if (filter.employeeId) {
      list = list.filter((c) => c.employeeId === filter.employeeId);
    } else if (filter.employeeIds && filter.employeeIds.length > 0) {
      list = list.filter((c) => filter.employeeIds!.includes(c.employeeId));
    }

    if (filter.status) {
      list = list.filter((c) => c.status === filter.status);
    }

    if (filter.managerId) {
      list = list.filter((c) => c.managerId === filter.managerId);
    }

    // Enrich claims with items and employee metadata
    return list
      .map((c) => this.enrichClaim(c))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public static async findClaimById(id: string, companyId: string): Promise<ExpenseClaim | null> {
    const claim = this.db.expenseClaims.get(id);
    if (claim && claim.companyId === companyId) {
      return this.enrichClaim(claim);
    }
    return null;
  }

  public static async createClaim(claim: ExpenseClaim): Promise<ExpenseClaim> {
    this.db.expenseClaims.set(claim.id, { ...claim });
    return this.enrichClaim(claim);
  }

  public static async updateClaim(id: string, companyId: string, updates: Partial<ExpenseClaim>): Promise<ExpenseClaim | null> {
    const existing = this.db.expenseClaims.get(id);
    if (!existing || existing.companyId !== companyId) return null;

    const updated: ExpenseClaim = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.db.expenseClaims.set(id, updated);
    return this.enrichClaim(updated);
  }

  public static async deleteClaim(id: string, companyId: string): Promise<boolean> {
    const existing = this.db.expenseClaims.get(id);
    if (!existing || existing.companyId !== companyId) return false;

    // Remove associated items
    for (const [itemId, item] of this.db.expenseClaimItems.entries()) {
      if (item.claimId === id) {
        this.db.expenseClaimItems.delete(itemId);
      }
    }
    this.db.expenseClaims.delete(id);
    return true;
  }

  // ---------------------------------------------------------------------------
  // Expense Claim Items
  // ---------------------------------------------------------------------------
  public static async findItemsByClaimId(claimId: string): Promise<ExpenseClaimItem[]> {
    return Array.from(this.db.expenseClaimItems.values())
      .filter((item) => item.claimId === claimId)
      .map((item) => {
        const cat = this.db.expenseCategories.get(item.categoryId);
        return {
          ...item,
          categoryName: cat?.name || item.categoryName || 'General',
        };
      })
      .sort((a, b) => new Date(a.expenseDate).getTime() - new Date(b.expenseDate).getTime());
  }

  public static async createClaimItem(item: ExpenseClaimItem): Promise<ExpenseClaimItem> {
    this.db.expenseClaimItems.set(item.id, { ...item });
    // Recalculate claim total and receipt count
    await this.recalculateClaimTotals(item.claimId, item.companyId);
    return { ...item };
  }

  public static async updateClaimItem(id: string, companyId: string, updates: Partial<ExpenseClaimItem>): Promise<ExpenseClaimItem | null> {
    const existing = this.db.expenseClaimItems.get(id);
    if (!existing || existing.companyId !== companyId) return null;

    const updated: ExpenseClaimItem = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.db.expenseClaimItems.set(id, updated);
    await this.recalculateClaimTotals(existing.claimId, companyId);
    return { ...updated };
  }

  public static async deleteClaimItem(id: string, companyId: string): Promise<boolean> {
    const existing = this.db.expenseClaimItems.get(id);
    if (!existing || existing.companyId !== companyId) return false;

    const claimId = existing.claimId;
    this.db.expenseClaimItems.delete(id);
    await this.recalculateClaimTotals(claimId, companyId);
    return true;
  }

  private static async recalculateClaimTotals(claimId: string, companyId: string): Promise<void> {
    const claim = this.db.expenseClaims.get(claimId);
    if (!claim) return;

    const items = Array.from(this.db.expenseClaimItems.values()).filter((i) => i.claimId === claimId);
    const totalAmount = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const receiptsCount = items.filter((i) => !!i.receiptAttachmentUrl || !!i.receiptFileName).length;

    claim.totalAmount = Math.round(totalAmount * 100) / 100;
    claim.receiptsCount = receiptsCount;
    claim.updatedAt = new Date().toISOString();
    this.db.expenseClaims.set(claimId, claim);
  }

  // ---------------------------------------------------------------------------
  // Expense Claim History / Audit
  // ---------------------------------------------------------------------------
  public static async logHistory(entry: ExpenseClaimHistory): Promise<void> {
    this.db.expenseClaimHistory.set(entry.id, { ...entry });
  }

  public static async findHistoryByClaimId(claimId: string, companyId: string): Promise<ExpenseClaimHistory[]> {
    return Array.from(this.db.expenseClaimHistory.values())
      .filter((h) => h.claimId === claimId && h.companyId === companyId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  private static enrichClaim(claim: ExpenseClaim): ExpenseClaim {
    const items = Array.from(this.db.expenseClaimItems.values())
      .filter((i) => i.claimId === claim.id)
      .map((item) => {
        const cat = this.db.expenseCategories.get(item.categoryId);
        return {
          ...item,
          categoryName: cat?.name || item.categoryName,
        };
      });

    const emp = this.db.employees.get(claim.employeeId);
    let managerName: string | undefined;
    if (claim.managerId) {
      const mgr = this.db.employees.get(claim.managerId);
      managerName = mgr ? `${mgr.firstName} ${mgr.lastName}` : undefined;
    }

    return {
      ...claim,
      employeeName: emp ? `${emp.firstName} ${emp.lastName}` : claim.employeeName || 'Unknown Employee',
      employeeCode: emp?.employeeCode || claim.employeeCode,
      managerName: managerName || claim.managerName,
      items,
      receiptsCount: items.filter((i) => !!i.receiptAttachmentUrl || !!i.receiptFileName).length,
    };
  }
}
