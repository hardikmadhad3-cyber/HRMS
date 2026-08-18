import { ShiftRosterEntry, ShiftRosterQuery } from '../../../src/types/shift.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export class ShiftRosterRepository {
  private static db = RelationalDatabase.getInstance();

  public static async findByRange(
    companyId: string,
    query: ShiftRosterQuery
  ): Promise<ShiftRosterEntry[]> {
    let result = Array.from(this.db.shiftRosterEntries.values()).filter(
      (r) =>
        r.companyId === companyId &&
        r.rosterDate >= query.startDate &&
        r.rosterDate <= query.endDate
    );

    if (query.employeeId) {
      result = result.filter((r) => r.employeeId === query.employeeId);
    }

    if (query.departmentId || query.branchId || query.search) {
      const searchLower = query.search ? query.search.toLowerCase() : null;
      result = result.filter((r) => {
        const emp = this.db.employees.get(r.employeeId);
        if (!emp) return false;

        const orgAsg = Array.from(this.db.employeeAssignments.values()).find(
          (o) => o.employeeId === r.employeeId && o.effectiveFrom <= r.rosterDate && (!o.effectiveTo || o.effectiveTo >= r.rosterDate)
        );

        if (query.departmentId && orgAsg?.departmentId !== query.departmentId) return false;
        if (query.branchId && orgAsg?.branchId !== query.branchId) return false;

        if (searchLower) {
          const matchCode = emp.employeeCode.toLowerCase().includes(searchLower);
          const matchName = emp.displayName.toLowerCase().includes(searchLower);
          if (!matchCode && !matchName) return false;
        }

        return true;
      });
    }

    return result.map((entry) => this.hydrateRosterEntry(entry));
  }

  public static async upsert(entry: ShiftRosterEntry): Promise<ShiftRosterEntry> {
    this.db.shiftRosterEntries.set(entry.id, entry);
    return this.hydrateRosterEntry(entry);
  }

  public static async bulkUpsert(entries: ShiftRosterEntry[]): Promise<ShiftRosterEntry[]> {
    for (const e of entries) {
      this.db.shiftRosterEntries.set(e.id, e);
    }
    return entries.map((e) => this.hydrateRosterEntry(e));
  }

  private static hydrateRosterEntry(entry: ShiftRosterEntry): ShiftRosterEntry {
    const emp = this.db.employees.get(entry.employeeId);
    const shift = this.db.shifts.get(entry.shiftId);

    return {
      ...entry,
      employeeCode: emp?.employeeCode,
      employeeName: emp?.displayName,
      shiftCode: shift?.code,
      shiftName: shift?.name,
      shiftStartTime: shift?.startTime,
      shiftEndTime: shift?.endTime,
      isOvernight: shift?.isOvernight,
      shiftColor: shift?.color,
    };
  }
}
