import { SalaryComponent, ComponentType } from '../../../src/types/payroll.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export class SalaryComponentRepository {
  private static get db() {
    return RelationalDatabase.getInstance();
  }

  public static async findAll(
    companyId: string,
    filters?: { type?: ComponentType; isActive?: boolean; search?: string }
  ): Promise<SalaryComponent[]> {
    let items = Array.from(this.db.salaryComponents.values()).filter((c) => c.companyId === companyId);

    if (filters?.type) {
      items = items.filter((c) => c.type === filters.type);
    }

    if (filters?.isActive !== undefined) {
      items = items.filter((c) => c.isActive === filters.isActive);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      items = items.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          (c.description && c.description.toLowerCase().includes(q))
      );
    }

    return items.sort((a, b) => a.displayOrder - b.displayOrder || a.code.localeCompare(b.code));
  }

  public static async findById(id: string, companyId: string): Promise<SalaryComponent | null> {
    const item = this.db.salaryComponents.get(id);
    if (!item || item.companyId !== companyId) return null;
    return { ...item };
  }

  public static async findByCode(code: string, companyId: string): Promise<SalaryComponent | null> {
    const q = code.trim().toLowerCase();
    for (const item of this.db.salaryComponents.values()) {
      if (item.companyId === companyId && item.code.toLowerCase() === q) {
        return { ...item };
      }
    }
    return null;
  }

  public static async isReferencedInStructures(id: string, companyId: string): Promise<boolean> {
    for (const sc of this.db.salaryStructureComponents.values()) {
      if (sc.companyId === companyId && (sc.salaryComponentId === id || sc.baseComponentId === id)) {
        return true;
      }
    }
    return false;
  }

  public static async create(data: Omit<SalaryComponent, 'createdAt' | 'updatedAt'>): Promise<SalaryComponent> {
    const newComp: SalaryComponent = {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.db.salaryComponents.set(newComp.id, newComp);
    return { ...newComp };
  }

  public static async update(
    id: string,
    companyId: string,
    data: Partial<Omit<SalaryComponent, 'id' | 'companyId' | 'createdAt'>>
  ): Promise<SalaryComponent | null> {
    const existing = this.db.salaryComponents.get(id);
    if (!existing || existing.companyId !== companyId) return null;

    const updated: SalaryComponent = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.db.salaryComponents.set(id, updated);
    return { ...updated };
  }

  public static async delete(id: string, companyId: string): Promise<boolean> {
    const existing = this.db.salaryComponents.get(id);
    if (!existing || existing.companyId !== companyId) return false;
    return this.db.salaryComponents.delete(id);
  }
}
