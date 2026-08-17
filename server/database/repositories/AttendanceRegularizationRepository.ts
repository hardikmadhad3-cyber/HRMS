import {
  AttendanceRegularizationRequest,
  RegularizationStatus,
} from '../../../src/types/attendance.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export class AttendanceRegularizationRepository {
  private static db = RelationalDatabase.getInstance();

  public static async create(
    request: AttendanceRegularizationRequest
  ): Promise<AttendanceRegularizationRequest> {
    this.db.attendanceRegularizationRequests.set(request.id, { ...request });
    return { ...request };
  }

  public static async update(
    id: string,
    companyId: string,
    updates: Partial<AttendanceRegularizationRequest>
  ): Promise<AttendanceRegularizationRequest | null> {
    const existing = this.db.attendanceRegularizationRequests.get(id);
    if (!existing || existing.companyId !== companyId) return null;

    const updated: AttendanceRegularizationRequest = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.db.attendanceRegularizationRequests.set(id, updated);
    return { ...updated };
  }

  public static async findById(
    id: string,
    companyId: string
  ): Promise<AttendanceRegularizationRequest | null> {
    const record = this.db.attendanceRegularizationRequests.get(id);
    if (!record || record.companyId !== companyId) return null;

    const emp = this.db.employees.get(record.employeeId);
    const approver = record.approverId ? this.db.employees.get(record.approverId) : undefined;
    const daily = Array.from(this.db.dailyAttendance.values()).find(
      (d) => d.employeeId === record.employeeId && d.attendanceDate === record.attendanceDate
    );

    return {
      ...record,
      employeeCode: emp?.employeeCode,
      displayName: emp?.displayName,
      employeeName: emp?.displayName,
      approverName: approver?.displayName,
      originalFirstCheckIn: daily?.firstCheckIn,
      originalLastCheckOut: daily?.lastCheckOut,
      originalStatus: daily?.status,
    };
  }

  public static async findByEmployeeAndDate(
    employeeId: string,
    attendanceDate: string,
    companyId: string
  ): Promise<AttendanceRegularizationRequest | null> {
    for (const req of this.db.attendanceRegularizationRequests.values()) {
      if (
        req.companyId === companyId &&
        req.employeeId === employeeId &&
        req.attendanceDate === attendanceDate
      ) {
        return { ...req };
      }
    }
    return null;
  }

  public static async findAll(
    companyId: string,
    filter?: {
      employeeId?: string;
      status?: RegularizationStatus;
      startDate?: string;
      endDate?: string;
      approverId?: string;
    }
  ): Promise<AttendanceRegularizationRequest[]> {
    let list = Array.from(this.db.attendanceRegularizationRequests.values()).filter(
      (r) => r.companyId === companyId
    );

    if (filter) {
      if (filter.employeeId) {
        list = list.filter((r) => r.employeeId === filter.employeeId);
      }
      if (filter.status) {
        list = list.filter((r) => r.status === filter.status);
      }
      if (filter.startDate && filter.endDate) {
        list = list.filter(
          (r) => r.attendanceDate >= filter.startDate! && r.attendanceDate <= filter.endDate!
        );
      }
      if (filter.approverId) {
        list = list.filter((r) => r.approverId === filter.approverId);
      }
    }

    // Enrich with employee & daily info
    const enriched = list.map((record) => {
      const emp = this.db.employees.get(record.employeeId);
      const asg = Array.from(this.db.employeeAssignments.values()).find(
        (a) => a.employeeId === record.employeeId && a.effectiveFrom <= record.attendanceDate && (!a.effectiveTo || a.effectiveTo >= record.attendanceDate)
      );
      const dept = asg?.departmentId ? this.db.departments.get(asg.departmentId) : undefined;
      const approver = record.approverId ? this.db.employees.get(record.approverId) : undefined;
      const daily = Array.from(this.db.dailyAttendance.values()).find(
        (d) => d.employeeId === record.employeeId && d.attendanceDate === record.attendanceDate
      );

      return {
        ...record,
        employeeCode: emp?.employeeCode,
        displayName: emp?.displayName,
        employeeName: emp?.displayName,
        departmentName: dept?.name,
        approverName: approver?.displayName,
        originalFirstCheckIn: daily?.firstCheckIn,
        originalLastCheckOut: daily?.lastCheckOut,
        originalStatus: daily?.status,
      };
    });

    return enriched.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public static async delete(id: string, companyId: string): Promise<boolean> {
    const req = this.db.attendanceRegularizationRequests.get(id);
    if (req && req.companyId === companyId) {
      return this.db.attendanceRegularizationRequests.delete(id);
    }
    return false;
  }
}
