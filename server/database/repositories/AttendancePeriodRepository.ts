import { AttendancePeriod } from '../../../src/types/period.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export class AttendancePeriodRepository {
  private static db = RelationalDatabase.getInstance();

  public static async findById(id: string, companyId: string): Promise<AttendancePeriod | null> {
    const period = this.db.attendancePeriods.get(id);
    if (!period || period.companyId !== companyId) return null;
    return this.enrichPeriod(period);
  }

  public static async findByYearMonth(
    companyId: string,
    year: number,
    month: number
  ): Promise<AttendancePeriod | null> {
    for (const period of this.db.attendancePeriods.values()) {
      if (period.companyId === companyId && period.year === year && period.month === month) {
        return this.enrichPeriod(period);
      }
    }
    return null;
  }

  public static async findByDate(
    companyId: string,
    date: string // YYYY-MM-DD
  ): Promise<AttendancePeriod | null> {
    for (const period of this.db.attendancePeriods.values()) {
      if (
        period.companyId === companyId &&
        date >= period.startDate &&
        date <= period.endDate
      ) {
        return this.enrichPeriod(period);
      }
    }
    return null;
  }

  public static async create(period: AttendancePeriod): Promise<AttendancePeriod> {
    this.db.attendancePeriods.set(period.id, { ...period });
    return (await this.findById(period.id, period.companyId)) || period;
  }

  public static async update(
    id: string,
    companyId: string,
    updates: Partial<AttendancePeriod>
  ): Promise<AttendancePeriod | null> {
    const existing = this.db.attendancePeriods.get(id);
    if (!existing || existing.companyId !== companyId) return null;

    const updated: AttendancePeriod = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.db.attendancePeriods.set(id, updated);
    return this.enrichPeriod(updated);
  }

  public static async findAll(companyId: string): Promise<AttendancePeriod[]> {
    const periods = Array.from(this.db.attendancePeriods.values())
      .filter((p) => p.companyId === companyId)
      .map((p) => this.enrichPeriod(p));

    return periods.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  }

  private static enrichPeriod(period: AttendancePeriod): AttendancePeriod {
    const enriched: AttendancePeriod = {
      ...period,
      isLocked: period.status === 'FINALIZED' || period.status === 'LOCKED',
    };
    if (period.finalizedBy) {
      const user = Array.from(this.db.employees.values()).find(
        (e) => e.id === period.finalizedBy || e.employeeCode === period.finalizedBy
      );
      enriched.finalizedByName = user?.displayName || user?.firstName || 'System Administrator';
    }
    if (period.reopenedBy) {
      const user = Array.from(this.db.employees.values()).find(
        (e) => e.id === period.reopenedBy || e.employeeCode === period.reopenedBy
      );
      enriched.reopenedByName = user?.displayName || user?.firstName || 'System Administrator';
    }
    return enriched;
  }
}
