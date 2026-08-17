import { WorkLocation } from '../../../src/types/organization.js';
import { RelationalDatabase, TenantScopedFilter } from '../RelationalDatabase.js';

export class WorkLocationRepository {
  private static db = RelationalDatabase.getInstance();

  public static async findAll(filter: TenantScopedFilter): Promise<WorkLocation[]> {
    let result = Array.from(this.db.workLocations.values()).filter((w) => w.companyId === filter.companyId);

    if (filter.status) {
      result = result.filter((w) => w.status === filter.status);
    }
    if (filter.branchId) {
      result = result.filter((w) => w.branchId === filter.branchId);
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(
        (w) =>
          w.name.toLowerCase().includes(q) ||
          w.code.toLowerCase().includes(q) ||
          w.city.toLowerCase().includes(q) ||
          w.country.toLowerCase().includes(q)
      );
    }

    // Attach branch name if branchId is present
    return result.map((loc) => {
      if (loc.branchId) {
        const branch = this.db.branches.get(loc.branchId);
        return {
          ...loc,
          branchName: branch ? branch.name : undefined,
        };
      }
      return loc;
    });
  }

  public static async findById(id: string, companyId?: string): Promise<WorkLocation | null> {
    const loc = this.db.workLocations.get(id);
    if (!loc) return null;
    if (companyId && loc.companyId !== companyId) return null;

    if (loc.branchId) {
      const branch = this.db.branches.get(loc.branchId);
      return {
        ...loc,
        branchName: branch ? branch.name : undefined,
      };
    }
    return loc;
  }

  public static async findByCode(companyId: string, code: string): Promise<WorkLocation | null> {
    const normalized = code.trim().toUpperCase();
    for (const loc of this.db.workLocations.values()) {
      if (loc.companyId === companyId && loc.code.toUpperCase() === normalized) {
        return loc;
      }
    }
    return null;
  }

  public static async create(loc: WorkLocation): Promise<WorkLocation> {
    this.db.workLocations.set(loc.id, loc);
    return loc;
  }

  public static async update(id: string, companyId: string, updates: Partial<WorkLocation>): Promise<WorkLocation | null> {
    const existing = this.db.workLocations.get(id);
    if (!existing || existing.companyId !== companyId) return null;
    const updated: WorkLocation = {
      ...existing,
      ...updates,
      id,
      companyId,
      updatedAt: new Date().toISOString(),
    };
    this.db.workLocations.set(id, updated);
    return updated;
  }

  public static async hasDependentHolidays(workLocationId: string): Promise<boolean> {
    for (const h of this.db.holidays.values()) {
      if (h.workLocationId === workLocationId) {
        return true;
      }
    }
    return false;
  }
}
