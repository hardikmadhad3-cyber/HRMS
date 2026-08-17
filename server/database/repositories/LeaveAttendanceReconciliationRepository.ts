import { LeaveAttendanceReconciliation } from '../../../src/types/reconciliation.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export class LeaveAttendanceReconciliationRepository {
  private static db = RelationalDatabase.getInstance();

  private static enrichReconciliation(rec: LeaveAttendanceReconciliation): LeaveAttendanceReconciliation {
    const employee = this.db.employees.get(rec.employeeId);
    const leaveType = rec.leaveTypeId ? this.db.leaveTypes.get(rec.leaveTypeId) : undefined;
    const dailyAtt = rec.dailyAttendanceId ? this.db.dailyAttendance.get(rec.dailyAttendanceId) : undefined;
    const shift = dailyAtt?.shiftId ? this.db.shifts.get(dailyAtt.shiftId) : undefined;

    return {
      ...rec,
      employeeName: employee ? `${employee.firstName} ${employee.lastName}` : rec.employeeName,
      employeeCode: employee ? employee.employeeCode : rec.employeeCode,
      leaveTypeCode: leaveType ? leaveType.code : rec.leaveTypeCode,
      leaveTypeName: leaveType ? leaveType.name : rec.leaveTypeName,
      shiftCode: shift ? shift.code : rec.shiftCode,
      rawAttendanceStatus: dailyAtt ? dailyAtt.status : rec.rawAttendanceStatus,
    };
  }

  public static async findById(id: string, companyId: string): Promise<LeaveAttendanceReconciliation | null> {
    const rec = this.db.leaveAttendanceReconciliations.get(id);
    if (!rec || rec.companyId !== companyId) return null;
    return this.enrichReconciliation(rec);
  }

  public static async findByEmployeeAndDate(
    companyId: string,
    employeeId: string,
    attendanceDate: string,
    status: 'ACTIVE' | 'SUPERSEDED' | 'CANCELLED' = 'ACTIVE'
  ): Promise<LeaveAttendanceReconciliation | null> {
    for (const rec of this.db.leaveAttendanceReconciliations.values()) {
      if (
        rec.companyId === companyId &&
        rec.employeeId === employeeId &&
        rec.attendanceDate === attendanceDate &&
        (status === undefined || rec.status === status)
      ) {
        return this.enrichReconciliation(rec);
      }
    }
    return null;
  }

  public static async findByEmployeeDateRange(
    companyId: string,
    employeeId: string,
    startDate: string,
    endDate: string
  ): Promise<LeaveAttendanceReconciliation[]> {
    const results: LeaveAttendanceReconciliation[] = [];
    for (const rec of this.db.leaveAttendanceReconciliations.values()) {
      if (
        rec.companyId === companyId &&
        rec.employeeId === employeeId &&
        rec.attendanceDate >= startDate &&
        rec.attendanceDate <= endDate &&
        rec.status === 'ACTIVE'
      ) {
        results.push(this.enrichReconciliation(rec));
      }
    }
    return results.sort((a, b) => a.attendanceDate.localeCompare(b.attendanceDate));
  }

  public static async findByDateRange(
    companyId: string,
    startDate: string,
    endDate: string
  ): Promise<LeaveAttendanceReconciliation[]> {
    const results: LeaveAttendanceReconciliation[] = [];
    for (const rec of this.db.leaveAttendanceReconciliations.values()) {
      if (
        rec.companyId === companyId &&
        rec.attendanceDate >= startDate &&
        rec.attendanceDate <= endDate &&
        rec.status === 'ACTIVE'
      ) {
        results.push(this.enrichReconciliation(rec));
      }
    }
    return results.sort((a, b) => a.attendanceDate.localeCompare(b.attendanceDate));
  }

  public static async findByRequestId(
    requestId: string,
    companyId: string
  ): Promise<LeaveAttendanceReconciliation[]> {
    const results: LeaveAttendanceReconciliation[] = [];
    for (const rec of this.db.leaveAttendanceReconciliations.values()) {
      if (rec.companyId === companyId && rec.leaveRequestId === requestId && rec.status === 'ACTIVE') {
        results.push(this.enrichReconciliation(rec));
      }
    }
    return results;
  }

  public static async findConflicts(
    companyId: string,
    startDate: string,
    endDate: string
  ): Promise<LeaveAttendanceReconciliation[]> {
    const results: LeaveAttendanceReconciliation[] = [];
    for (const rec of this.db.leaveAttendanceReconciliations.values()) {
      if (
        rec.companyId === companyId &&
        rec.attendanceDate >= startDate &&
        rec.attendanceDate <= endDate &&
        rec.status === 'ACTIVE' &&
        rec.hasConflict
      ) {
        results.push(this.enrichReconciliation(rec));
      }
    }
    return results;
  }

  public static async save(rec: LeaveAttendanceReconciliation): Promise<LeaveAttendanceReconciliation> {
    const existing = await this.findByEmployeeAndDate(rec.companyId, rec.employeeId, rec.attendanceDate, 'ACTIVE');
    if (existing && existing.id !== rec.id) {
      // Mark prior version as superseded
      existing.status = 'SUPERSEDED';
      existing.updatedAt = new Date().toISOString();
      this.db.leaveAttendanceReconciliations.set(existing.id, existing);
    }

    this.db.leaveAttendanceReconciliations.set(rec.id, { ...rec });
    return this.enrichReconciliation(rec);
  }

  public static async saveBatch(recs: LeaveAttendanceReconciliation[]): Promise<LeaveAttendanceReconciliation[]> {
    const saved: LeaveAttendanceReconciliation[] = [];
    for (const r of recs) {
      const res = await this.save(r);
      saved.push(res);
    }
    return saved;
  }

  public static async cancelByRequestId(
    requestId: string,
    companyId: string
  ): Promise<number> {
    let count = 0;
    for (const [id, rec] of this.db.leaveAttendanceReconciliations.entries()) {
      if (rec.companyId === companyId && rec.leaveRequestId === requestId && rec.status === 'ACTIVE') {
        rec.status = 'CANCELLED';
        rec.updatedAt = new Date().toISOString();
        this.db.leaveAttendanceReconciliations.set(id, rec);
        count++;
      }
    }
    return count;
  }
}
