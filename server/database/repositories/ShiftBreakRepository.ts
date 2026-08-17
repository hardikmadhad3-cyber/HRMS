import { ShiftBreak } from '../../../src/types/shift.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export class ShiftBreakRepository {
  private static db = RelationalDatabase.getInstance();

  public static async findByShiftId(shiftId: string, companyId: string): Promise<ShiftBreak[]> {
    return Array.from(this.db.shiftBreaks.values()).filter(
      (b) => b.shiftId === shiftId && b.companyId === companyId
    );
  }

  public static async create(shiftBreak: ShiftBreak): Promise<ShiftBreak> {
    this.db.shiftBreaks.set(shiftBreak.id, shiftBreak);
    return shiftBreak;
  }

  public static async deleteByShiftId(shiftId: string, companyId: string): Promise<void> {
    for (const [id, b] of this.db.shiftBreaks.entries()) {
      if (b.shiftId === shiftId && b.companyId === companyId) {
        this.db.shiftBreaks.delete(id);
      }
    }
  }
}
