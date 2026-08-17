import { WeeklyOffRule } from '../../../src/types/shift.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export class WeeklyOffRepository {
  private static db = RelationalDatabase.getInstance();

  public static async findByShiftId(shiftId: string, companyId: string): Promise<WeeklyOffRule | null> {
    for (const rule of this.db.weeklyOffRules.values()) {
      if (rule.shiftId === shiftId && rule.companyId === companyId) {
        return rule;
      }
    }
    return null;
  }

  public static async findDefaultByCompany(companyId: string): Promise<WeeklyOffRule | null> {
    for (const rule of this.db.weeklyOffRules.values()) {
      if (rule.companyId === companyId && rule.isDefault) {
        return rule;
      }
    }
    return null;
  }

  public static async create(rule: WeeklyOffRule): Promise<WeeklyOffRule> {
    this.db.weeklyOffRules.set(rule.id, rule);
    return rule;
  }

  public static async updateByShiftId(shiftId: string, companyId: string, updates: Partial<WeeklyOffRule>): Promise<WeeklyOffRule | null> {
    for (const [id, rule] of this.db.weeklyOffRules.entries()) {
      if (rule.shiftId === shiftId && rule.companyId === companyId) {
        const updated = {
          ...rule,
          ...updates,
          id,
          companyId,
          shiftId,
          updatedAt: new Date().toISOString(),
        };
        this.db.weeklyOffRules.set(id, updated);
        return updated;
      }
    }
    return null;
  }

  public static async deleteByShiftId(shiftId: string, companyId: string): Promise<void> {
    for (const [id, r] of this.db.weeklyOffRules.entries()) {
      if (r.shiftId === shiftId && r.companyId === companyId) {
        this.db.weeklyOffRules.delete(id);
      }
    }
  }
}
