import { DailyAttendance, DailyAttendanceFilter } from '../../../src/types/attendance.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export class DailyAttendanceRepository {
  private static db = RelationalDatabase.getInstance();

  public static async create(record: DailyAttendance): Promise<DailyAttendance> {
    this.db.dailyAttendance.set(record.id, { ...record });
    return { ...record };
  }

  public static async update(
    id: string,
    companyId: string,
    updates: Partial<DailyAttendance>
  ): Promise<DailyAttendance | null> {
    const existing = this.db.dailyAttendance.get(id);
    if (!existing || existing.companyId !== companyId) return null;

    const updated: DailyAttendance = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.db.dailyAttendance.set(id, updated);
    return { ...updated };
  }

  public static async findById(id: string, companyId: string): Promise<DailyAttendance | null> {
    const record = this.db.dailyAttendance.get(id);
    if (!record || record.companyId !== companyId) return null;
    return { ...record };
  }

  public static async findByEmployeeAndDate(
    employeeId: string,
    attendanceDate: string,
    companyId: string
  ): Promise<DailyAttendance | null> {
    for (const record of this.db.dailyAttendance.values()) {
      if (
        record.companyId === companyId &&
        record.employeeId === employeeId &&
        record.attendanceDate === attendanceDate
      ) {
        return { ...record };
      }
    }
    return null;
  }

  public static async upsert(record: DailyAttendance): Promise<DailyAttendance> {
    const existing = await this.findByEmployeeAndDate(
      record.employeeId,
      record.attendanceDate,
      record.companyId
    );

    if (existing) {
      const updated: DailyAttendance = {
        ...existing,
        ...record,
        id: existing.id,
        calculationVersion: (existing.calculationVersion || 1) + 1,
        calculatedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.db.dailyAttendance.set(existing.id, updated);
      return { ...updated };
    } else {
      this.db.dailyAttendance.set(record.id, { ...record });
      return { ...record };
    }
  }

  public static async save(record: DailyAttendance): Promise<DailyAttendance> {
    return this.upsert(record);
  }

  public static async findAll(
    companyId: string,
    filter?: DailyAttendanceFilter
  ): Promise<DailyAttendance[]> {
    let records = Array.from(this.db.dailyAttendance.values()).filter(
      (r) => r.companyId === companyId
    );

    if (filter) {
      if (filter.date) {
        records = records.filter((r) => r.attendanceDate === filter.date);
      }
      if (filter.startDate && filter.endDate) {
        records = records.filter(
          (r) => r.attendanceDate >= filter.startDate! && r.attendanceDate <= filter.endDate!
        );
      }
      if (filter.employeeId) {
        records = records.filter((r) => r.employeeId === filter.employeeId);
      }
      if (filter.status) {
        records = records.filter((r) => r.status === filter.status);
      }
      if (filter.hasException !== undefined) {
        records = records.filter((r) => r.hasException === filter.hasException);
      }
      if (filter.exceptionType) {
        records = records.filter((r) => r.exceptionType === filter.exceptionType);
      }
    }

    // Enrich with employee details
    const enriched = records.map((record) => {
      const emp = this.db.employees.get(record.employeeId);
      const asg = Array.from(this.db.employeeAssignments.values()).find(
        (a) => a.employeeId === record.employeeId && a.effectiveFrom <= record.attendanceDate && (!a.effectiveTo || a.effectiveTo >= record.attendanceDate)
      );
      const dept = asg?.departmentId ? this.db.departments.get(asg.departmentId) : undefined;
      const desig = asg?.designationId ? this.db.designations.get(asg.designationId) : undefined;
      const branch = asg?.branchId ? this.db.branches.get(asg.branchId) : undefined;
      const shift = record.shiftId ? this.db.shifts.get(record.shiftId) : undefined;

      return {
        ...record,
        employeeCode: emp?.employeeCode,
        displayName: emp?.displayName,
        departmentName: dept?.name,
        designationName: desig?.name,
        branchName: branch?.name,
        avatarUrl: emp?.avatarUrl,
        shiftCode: shift?.code || record.shiftCode,
        shiftName: shift?.name || record.shiftName,
      };
    });

    // Secondary filters on enriched fields
    let filtered = enriched;
    if (filter) {
      if (filter.departmentId) {
        filtered = filtered.filter((r) => {
          const asg = Array.from(this.db.employeeAssignments.values()).find(
            (a) => a.employeeId === r.employeeId && a.effectiveFrom <= r.attendanceDate && (!a.effectiveTo || a.effectiveTo >= r.attendanceDate)
          );
          return asg?.departmentId === filter.departmentId;
        });
      }
      if (filter.branchId) {
        filtered = filtered.filter((r) => {
          const asg = Array.from(this.db.employeeAssignments.values()).find(
            (a) => a.employeeId === r.employeeId && a.effectiveFrom <= r.attendanceDate && (!a.effectiveTo || a.effectiveTo >= r.attendanceDate)
          );
          return asg?.branchId === filter.branchId;
        });
      }
      if (filter.designationId) {
        filtered = filtered.filter((r) => {
          const asg = Array.from(this.db.employeeAssignments.values()).find(
            (a) => a.employeeId === r.employeeId && a.effectiveFrom <= r.attendanceDate && (!a.effectiveTo || a.effectiveTo >= r.attendanceDate)
          );
          return asg?.designationId === filter.designationId;
        });
      }
      if (filter.search) {
        const q = filter.search.toLowerCase();
        filtered = filtered.filter(
          (r) =>
            (r.displayName && r.displayName.toLowerCase().includes(q)) ||
            (r.employeeCode && r.employeeCode.toLowerCase().includes(q))
        );
      }
    }

    return filtered.sort((a, b) => {
      // Sort by date desc, then employeeCode asc
      if (a.attendanceDate !== b.attendanceDate) {
        return b.attendanceDate.localeCompare(a.attendanceDate);
      }
      return (a.employeeCode || '').localeCompare(b.employeeCode || '');
    });
  }

  public static async deleteByEmployeeAndDate(
    employeeId: string,
    attendanceDate: string,
    companyId: string
  ): Promise<boolean> {
    for (const [id, record] of this.db.dailyAttendance.entries()) {
      if (
        record.companyId === companyId &&
        record.employeeId === employeeId &&
        record.attendanceDate === attendanceDate
      ) {
        return this.db.dailyAttendance.delete(id);
      }
    }
    return false;
  }
}
