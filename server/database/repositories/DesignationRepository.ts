import { Designation } from '../../../src/types/organization.js';
import { RelationalDatabase, TenantScopedFilter } from '../RelationalDatabase.js';

export class DesignationRepository {
  private static db = RelationalDatabase.getInstance();

  public static async findAll(filter: TenantScopedFilter): Promise<Designation[]> {
    let result = Array.from(this.db.designations.values()).filter((d) => d.companyId === filter.companyId);

    if (filter.status) {
      result = result.filter((d) => d.status === filter.status);
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.code.toLowerCase().includes(q) ||
          (d.gradeLevel && d.gradeLevel.toLowerCase().includes(q))
      );
    }
    return result;
  }

  public static async findById(id: string, companyId?: string): Promise<Designation | null> {
    const desig = this.db.designations.get(id);
    if (!desig) return null;
    if (companyId && desig.companyId !== companyId) return null;
    return desig;
  }

  public static async findByCode(companyId: string, code: string): Promise<Designation | null> {
    const normalized = code.trim().toUpperCase();
    for (const desig of this.db.designations.values()) {
      if (desig.companyId === companyId && desig.code.toUpperCase() === normalized) {
        return desig;
      }
    }
    return null;
  }

  public static async create(desig: Designation): Promise<Designation> {
    this.db.designations.set(desig.id, desig);
    return desig;
  }

  public static async update(id: string, companyId: string, updates: Partial<Designation>): Promise<Designation | null> {
    const existing = this.db.designations.get(id);
    if (!existing || existing.companyId !== companyId) return null;
    const updated: Designation = {
      ...existing,
      ...updates,
      id,
      companyId,
      updatedAt: new Date().toISOString(),
    };
    this.db.designations.set(id, updated);
    return updated;
  }
}
