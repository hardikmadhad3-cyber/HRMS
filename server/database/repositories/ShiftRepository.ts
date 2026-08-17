import { Shift, ShiftFilter } from '../../../src/types/shift.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export class ShiftRepository {
  private static db = RelationalDatabase.getInstance();

  public static async findAll(companyId: string, filter?: ShiftFilter): Promise<Shift[]> {
    let result = Array.from(this.db.shifts.values()).filter((s) => s.companyId === companyId);

    if (filter?.status) {
      result = result.filter((s) => s.status === filter.status);
    }
    if (filter?.isOvernight !== undefined) {
      result = result.filter((s) => s.isOvernight === filter.isOvernight);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(
        (s) =>
          s.code.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          (s.description && s.description.toLowerCase().includes(q))
      );
    }

    // Hydrate sub-entities: breaks, weekly offs, and assigned count
    return result.map((shift) => this.hydrateShift(shift));
  }

  public static async findById(id: string, companyId?: string): Promise<Shift | null> {
    const shift = this.db.shifts.get(id);
    if (!shift) return null;
    if (companyId && shift.companyId !== companyId) return null;
    return this.hydrateShift(shift);
  }

  public static async findByCode(companyId: string, code: string): Promise<Shift | null> {
    const normalized = code.trim().toUpperCase();
    for (const shift of this.db.shifts.values()) {
      if (shift.companyId === companyId && shift.code.toUpperCase() === normalized) {
        return this.hydrateShift(shift);
      }
    }
    return null;
  }

  public static async create(shift: Shift): Promise<Shift> {
    this.db.shifts.set(shift.id, shift);
    return this.hydrateShift(shift);
  }

  public static async update(id: string, companyId: string, updates: Partial<Shift>): Promise<Shift | null> {
    const existing = this.db.shifts.get(id);
    if (!existing || existing.companyId !== companyId) return null;

    const updated: Shift = {
      ...existing,
      ...updates,
      id,
      companyId, // Immutable company isolation
      updatedAt: new Date().toISOString(),
    };
    this.db.shifts.set(id, updated);
    return this.hydrateShift(updated);
  }

  public static async delete(id: string, companyId: string): Promise<boolean> {
    const existing = this.db.shifts.get(id);
    if (!existing || existing.companyId !== companyId) return false;
    this.db.rollbackShift(id);
    return true;
  }

  public static async countAssignedEmployees(shiftId: string, companyId: string): Promise<number> {
    let count = 0;
    const now = new Date().toISOString().slice(0, 10);
    for (const asg of this.db.employeeShiftAssignments.values()) {
      if (
        asg.shiftId === shiftId &&
        asg.companyId === companyId &&
        asg.status === 'ACTIVE' &&
        asg.effectiveFrom <= now &&
        (!asg.effectiveTo || asg.effectiveTo >= now)
      ) {
        count++;
      }
    }
    return count;
  }

  private static hydrateShift(shift: Shift): Shift {
    const breaks = Array.from(this.db.shiftBreaks.values()).filter(
      (b) => b.shiftId === shift.id && b.companyId === shift.companyId
    );
    const weeklyOffRule = Array.from(this.db.weeklyOffRules.values()).find(
      (w) => w.shiftId === shift.id && w.companyId === shift.companyId
    );

    let assignedCount = 0;
    const today = new Date().toISOString().slice(0, 10);
    for (const asg of this.db.employeeShiftAssignments.values()) {
      if (
        asg.shiftId === shift.id &&
        asg.companyId === shift.companyId &&
        asg.status === 'ACTIVE' &&
        asg.effectiveFrom <= today &&
        (!asg.effectiveTo || asg.effectiveTo >= today)
      ) {
        assignedCount++;
      }
    }

    return {
      ...shift,
      breaks,
      weeklyOffRule,
      assignedEmployeesCount: assignedCount,
    };
  }
}
