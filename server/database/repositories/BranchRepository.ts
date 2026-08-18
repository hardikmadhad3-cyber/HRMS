import { Branch } from '../../../src/types/organization.js';
import { RelationalDatabase, TenantScopedFilter } from '../RelationalDatabase.js';

export class BranchRepository {
  private static db = RelationalDatabase.getInstance();

  public static async findAll(filter: TenantScopedFilter): Promise<Branch[]> {
    let result = Array.from(this.db.branches.values()).filter((b) => b.companyId === filter.companyId);

    if (filter.status) {
      result = result.filter((b) => b.status === filter.status);
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.code.toLowerCase().includes(q) ||
          (b.city && b.city.toLowerCase().includes(q))
      );
    }
    return result;
  }

  public static async findById(id: string, companyId?: string): Promise<Branch | null> {
    const branch = this.db.branches.get(id);
    if (!branch) return null;
    if (companyId && branch.companyId !== companyId) return null;
    return branch;
  }

  public static async findByCode(companyId: string, code: string): Promise<Branch | null> {
    const normalized = code.trim().toUpperCase();
    for (const branch of this.db.branches.values()) {
      if (branch.companyId === companyId && branch.code.toUpperCase() === normalized) {
        return branch;
      }
    }
    return null;
  }

  public static async create(branch: Branch): Promise<Branch> {
    this.db.branches.set(branch.id, branch);
    return branch;
  }

  public static async update(id: string, companyId: string, updates: Partial<Branch>): Promise<Branch | null> {
    const existing = this.db.branches.get(id);
    if (!existing || existing.companyId !== companyId) return null;
    const updated: Branch = {
      ...existing,
      ...updates,
      id,
      companyId, // Immutable company assignment
      updatedAt: new Date().toISOString(),
    };
    this.db.branches.set(id, updated);
    return updated;
  }

  public static async hasDependentData(branchId: string): Promise<{ hasDependencies: boolean; reason?: string }> {
    const locationCount = Array.from(this.db.workLocations.values()).filter((w) => w.branchId === branchId).length;
    if (locationCount > 0) {
      return { hasDependencies: true, reason: `Branch is linked to ${locationCount} active work location(s).` };
    }
    return { hasDependencies: false };
  }
}
