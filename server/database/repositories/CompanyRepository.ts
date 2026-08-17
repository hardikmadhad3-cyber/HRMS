import { Company } from '../../../src/types/organization.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export class CompanyRepository {
  private static db = RelationalDatabase.getInstance();

  public static async findAll(): Promise<Company[]> {
    return Array.from(this.db.companies.values());
  }

  public static async findById(id: string): Promise<Company | null> {
    return this.db.companies.get(id) || null;
  }

  public static async findByCode(code: string): Promise<Company | null> {
    const normalized = code.trim().toUpperCase();
    for (const comp of this.db.companies.values()) {
      if (comp.code.toUpperCase() === normalized) {
        return comp;
      }
    }
    return null;
  }

  public static async create(company: Company): Promise<Company> {
    this.db.companies.set(company.id, company);
    return company;
  }

  public static async update(id: string, updates: Partial<Company>): Promise<Company | null> {
    const existing = this.db.companies.get(id);
    if (!existing) return null;
    const updated: Company = {
      ...existing,
      ...updates,
      id, // Immutable primary key
      updatedAt: new Date().toISOString(),
    };
    this.db.companies.set(id, updated);
    return updated;
  }

  public static async hasDependentData(companyId: string): Promise<{ hasDependencies: boolean; reason?: string }> {
    const branchCount = Array.from(this.db.branches.values()).filter((b) => b.companyId === companyId).length;
    if (branchCount > 0) return { hasDependencies: true, reason: `Company has ${branchCount} registered branch(es).` };

    const deptCount = Array.from(this.db.departments.values()).filter((d) => d.companyId === companyId).length;
    if (deptCount > 0) return { hasDependencies: true, reason: `Company has ${deptCount} registered department(s).` };

    const desigCount = Array.from(this.db.designations.values()).filter((d) => d.companyId === companyId).length;
    if (desigCount > 0) return { hasDependencies: true, reason: `Company has ${desigCount} registered designation(s).` };

    return { hasDependencies: false };
  }
}
