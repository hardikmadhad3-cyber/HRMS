import { LeaveYear } from '../../../src/types/leave.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export class LeaveYearRepository {
  private static get db() {
    return RelationalDatabase.getInstance();
  }

  public static async findAll(companyId: string): Promise<LeaveYear[]> {
    return Array.from(this.db.leaveYears.values())
      .filter((ly) => ly.companyId === companyId)
      .sort((a, b) => b.startDate.localeCompare(a.startDate));
  }

  public static async findById(id: string, companyId: string): Promise<LeaveYear | null> {
    const ly = this.db.leaveYears.get(id);
    if (!ly || ly.companyId !== companyId) return null;
    return { ...ly };
  }

  public static async findByCode(code: string, companyId: string): Promise<LeaveYear | null> {
    for (const ly of this.db.leaveYears.values()) {
      if (ly.companyId === companyId && ly.code.toLowerCase() === code.trim().toLowerCase()) {
        return { ...ly };
      }
    }
    return null;
  }

  public static async findDefault(companyId: string): Promise<LeaveYear | null> {
    for (const ly of this.db.leaveYears.values()) {
      if (ly.companyId === companyId && ly.isDefault && ly.status === 'ACTIVE') {
        return { ...ly };
      }
    }
    return null;
  }

  public static async findForDate(arg1: string, arg2?: string): Promise<LeaveYear | null> {
    let companyId = arg1;
    let dateStr = arg2 || new Date().toISOString().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}/.test(arg1) && arg2) {
      dateStr = arg1;
      companyId = arg2;
    }

    for (const ly of this.db.leaveYears.values()) {
      if (
        ly.companyId === companyId &&
        ly.status === 'ACTIVE' &&
        dateStr >= ly.startDate &&
        dateStr <= ly.endDate
      ) {
        return { ...ly };
      }
    }
    return null;
  }

  public static async findByDate(arg1: string, arg2?: string): Promise<LeaveYear | null> {
    return this.findForDate(arg1, arg2);
  }

  public static async findActiveYear(companyId: string): Promise<LeaveYear | null> {
    const def = await this.findDefault(companyId);
    if (def) return def;
    const today = new Date().toISOString().slice(0, 10);
    const forToday = await this.findForDate(companyId, today);
    if (forToday) return forToday;
    const all = await this.findAll(companyId);
    return all.find((y) => y.status === 'ACTIVE') || null;
  }

  public static async create(data: Omit<LeaveYear, 'createdAt' | 'updatedAt'>): Promise<LeaveYear> {
    // If set as default, clear default on other years for this company
    if (data.isDefault) {
      for (const ly of this.db.leaveYears.values()) {
        if (ly.companyId === data.companyId && ly.id !== data.id) {
          ly.isDefault = false;
        }
      }
    }

    const newYear: LeaveYear = {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.db.leaveYears.set(newYear.id, newYear);
    return { ...newYear };
  }

  public static async update(
    id: string,
    companyId: string,
    data: Partial<Omit<LeaveYear, 'id' | 'companyId' | 'createdAt'>>
  ): Promise<LeaveYear | null> {
    const existing = await this.findById(id, companyId);
    if (!existing) return null;

    if (data.isDefault) {
      for (const ly of this.db.leaveYears.values()) {
        if (ly.companyId === companyId && ly.id !== id) {
          ly.isDefault = false;
        }
      }
    }

    const updated: LeaveYear = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.db.leaveYears.set(id, updated);
    return { ...updated };
  }
}
