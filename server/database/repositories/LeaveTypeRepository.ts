import { LeaveType, LeaveTypeStatus } from '../../../src/types/leave.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export class LeaveTypeRepository {
  private static get db() {
    return RelationalDatabase.getInstance();
  }

  public static async findAll(
    companyId: string,
    filters?: { status?: LeaveTypeStatus; category?: string; search?: string }
  ): Promise<LeaveType[]> {
    let items = Array.from(this.db.leaveTypes.values()).filter((lt) => lt.companyId === companyId);

    if (filters?.status) {
      items = items.filter((lt) => lt.status === filters.status);
    }

    if (filters?.category) {
      items = items.filter((lt) => lt.category === filters.category);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      items = items.filter(
        (lt) =>
          lt.name.toLowerCase().includes(q) ||
          lt.code.toLowerCase().includes(q) ||
          (lt.description && lt.description.toLowerCase().includes(q))
      );
    }

    return items.sort((a, b) => a.code.localeCompare(b.code));
  }

  public static async findById(id: string, companyId: string): Promise<LeaveType | null> {
    const lt = this.db.leaveTypes.get(id);
    if (!lt || lt.companyId !== companyId) return null;
    return { ...lt };
  }

  public static async findByCode(code: string, companyId: string): Promise<LeaveType | null> {
    for (const lt of this.db.leaveTypes.values()) {
      if (lt.companyId === companyId && lt.code.toLowerCase() === code.trim().toLowerCase()) {
        return { ...lt };
      }
    }
    return null;
  }

  public static async isReferencedInPolicies(id: string, companyId: string): Promise<boolean> {
    for (const rule of this.db.leavePolicyRules.values()) {
      if (rule.companyId === companyId && rule.leaveTypeId === id && rule.status === 'ACTIVE') {
        return true;
      }
    }
    return false;
  }

  public static async create(data: Omit<LeaveType, 'createdAt' | 'updatedAt'>): Promise<LeaveType> {
    const newType: LeaveType = {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.db.leaveTypes.set(newType.id, newType);
    return { ...newType };
  }

  public static async update(
    id: string,
    companyId: string,
    data: Partial<Omit<LeaveType, 'id' | 'companyId' | 'createdAt'>>
  ): Promise<LeaveType | null> {
    const existing = await this.findById(id, companyId);
    if (!existing) return null;

    const updated: LeaveType = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.db.leaveTypes.set(id, updated);
    return { ...updated };
  }

  public static async setStatus(id: string, companyId: string, status: LeaveTypeStatus): Promise<LeaveType | null> {
    return this.update(id, companyId, { status });
  }
}
