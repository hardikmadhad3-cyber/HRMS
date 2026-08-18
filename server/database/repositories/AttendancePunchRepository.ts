import { AttendancePunch, PunchType } from '../../../src/types/attendance.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export class AttendancePunchRepository {
  private static db = RelationalDatabase.getInstance();

  public static async create(punch: AttendancePunch): Promise<AttendancePunch> {
    this.db.attendancePunches.set(punch.id, { ...punch });
    return { ...punch };
  }

  public static async findById(id: string, companyId: string): Promise<AttendancePunch | null> {
    const punch = this.db.attendancePunches.get(id);
    if (!punch || punch.companyId !== companyId) return null;
    return { ...punch };
  }

  public static async findByEmployeeAndDateRange(
    employeeId: string,
    companyId: string,
    startTimeUtc: string,
    endTimeUtc: string
  ): Promise<AttendancePunch[]> {
    const results: AttendancePunch[] = [];
    for (const punch of this.db.attendancePunches.values()) {
      if (
        punch.companyId === companyId &&
        punch.employeeId === employeeId &&
        punch.punchTime >= startTimeUtc &&
        punch.punchTime <= endTimeUtc
      ) {
        results.push({ ...punch });
      }
    }
    return results.sort((a, b) => a.punchTime.localeCompare(b.punchTime));
  }

  public static async findLastPunchByEmployee(
    employeeId: string,
    companyId: string
  ): Promise<AttendancePunch | null> {
    const punches = Array.from(this.db.attendancePunches.values()).filter(
      (p) => p.companyId === companyId && p.employeeId === employeeId
    );
    if (punches.length === 0) return null;
    punches.sort((a, b) => b.punchTime.localeCompare(a.punchTime));
    return { ...punches[0] };
  }

  public static async findAllByEmployee(
    employeeId: string,
    companyId: string,
    limit = 100
  ): Promise<AttendancePunch[]> {
    const punches = Array.from(this.db.attendancePunches.values())
      .filter((p) => p.companyId === companyId && p.employeeId === employeeId)
      .sort((a, b) => b.punchTime.localeCompare(a.punchTime))
      .slice(0, limit);
    return punches.map((p) => ({ ...p }));
  }

  public static async delete(id: string, companyId: string): Promise<boolean> {
    const punch = this.db.attendancePunches.get(id);
    if (punch && punch.companyId === companyId) {
      return this.db.attendancePunches.delete(id);
    }
    return false;
  }
}
