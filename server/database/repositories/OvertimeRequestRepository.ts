import { OvertimeRequest, OvertimeFilter } from '../../../src/types/overtime.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export class OvertimeRequestRepository {
  private static db = RelationalDatabase.getInstance();

  public static async findById(id: string, companyId: string): Promise<OvertimeRequest | null> {
    const req = this.db.overtimeRequests.get(id);
    if (!req || req.companyId !== companyId) return null;
    return this.enrichRequest(req);
  }

  public static async findByEmployeeAndDate(
    employeeId: string,
    attendanceDate: string,
    companyId: string
  ): Promise<OvertimeRequest | null> {
    for (const req of this.db.overtimeRequests.values()) {
      if (
        req.companyId === companyId &&
        req.employeeId === employeeId &&
        req.attendanceDate === attendanceDate
      ) {
        return this.enrichRequest(req);
      }
    }
    return null;
  }

  public static async findByEmployeeAndPeriod(
    employeeId: string,
    startDate: string,
    endDate: string,
    companyId: string
  ): Promise<OvertimeRequest[]> {
    return this.findAll(companyId, { employeeId, startDate, endDate });
  }

  public static async create(req: OvertimeRequest): Promise<OvertimeRequest> {
    this.db.overtimeRequests.set(req.id, { ...req });
    return (await this.findById(req.id, req.companyId)) || req;
  }

  public static async update(
    id: string,
    companyId: string,
    updates: Partial<OvertimeRequest>
  ): Promise<OvertimeRequest | null> {
    const existing = this.db.overtimeRequests.get(id);
    if (!existing || existing.companyId !== companyId) return null;

    const updated: OvertimeRequest = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.db.overtimeRequests.set(id, updated);
    return this.enrichRequest(updated);
  }

  public static async findAll(
    companyId: string,
    filter?: OvertimeFilter
  ): Promise<OvertimeRequest[]> {
    let requests = Array.from(this.db.overtimeRequests.values()).filter(
      (r) => r.companyId === companyId
    );

    if (filter) {
      if (filter.employeeId) {
        requests = requests.filter((r) => r.employeeId === filter.employeeId);
      }
      if (filter.status) {
        requests = requests.filter((r) => r.status === filter.status);
      }
      if (filter.startDate && filter.endDate) {
        requests = requests.filter(
          (r) => r.attendanceDate >= filter.startDate! && r.attendanceDate <= filter.endDate!
        );
      }
      if (filter.year && filter.month) {
        const prefix = `${filter.year}-${String(filter.month).padStart(2, '0')}`;
        requests = requests.filter((r) => r.attendanceDate.startsWith(prefix));
      }
    }

    const enriched = await Promise.all(requests.map((r) => this.enrichRequest(r)));

    let filtered = enriched;
    if (filter) {
      if (filter.departmentId) {
        filtered = filtered.filter((r) => {
          const asg = Array.from(this.db.employeeAssignments.values()).find(
            (a) =>
              a.employeeId === r.employeeId &&
              a.effectiveFrom <= r.attendanceDate &&
              (!a.effectiveTo || a.effectiveTo >= r.attendanceDate)
          );
          return asg?.departmentId === filter.departmentId;
        });
      }
      if (filter.branchId) {
        filtered = filtered.filter((r) => {
          const asg = Array.from(this.db.employeeAssignments.values()).find(
            (a) =>
              a.employeeId === r.employeeId &&
              a.effectiveFrom <= r.attendanceDate &&
              (!a.effectiveTo || a.effectiveTo >= r.attendanceDate)
          );
          return asg?.branchId === filter.branchId;
        });
      }
      if (filter.search) {
        const q = filter.search.toLowerCase();
        filtered = filtered.filter(
          (r) =>
            (r.displayName && r.displayName.toLowerCase().includes(q)) ||
            (r.employeeCode && r.employeeCode.toLowerCase().includes(q)) ||
            (r.reason && r.reason.toLowerCase().includes(q))
        );
      }
    }

    return filtered.sort((a, b) => b.attendanceDate.localeCompare(a.attendanceDate));
  }

  public static async countPending(companyId: string, startDate?: string, endDate?: string): Promise<number> {
    let list = Array.from(this.db.overtimeRequests.values()).filter(
      (r) => r.companyId === companyId && r.status === 'PENDING'
    );
    if (startDate && endDate) {
      list = list.filter((r) => r.attendanceDate >= startDate && r.attendanceDate <= endDate);
    }
    return list.length;
  }

  private static enrichRequest(req: OvertimeRequest): OvertimeRequest {
    const emp = this.db.employees.get(req.employeeId);
    const asg = Array.from(this.db.employeeAssignments.values()).find(
      (a) =>
        a.employeeId === req.employeeId &&
        a.effectiveFrom <= req.attendanceDate &&
        (!a.effectiveTo || a.effectiveTo >= req.attendanceDate)
    );
    const dept = asg?.departmentId ? this.db.departments.get(asg.departmentId) : undefined;
    const desig = asg?.designationId ? this.db.designations.get(asg.designationId) : undefined;
    
    // Approver name
    const approverEmp = req.approverId ? this.db.employees.get(req.approverId) : undefined;
    
    // Daily attendance link
    const dailyAtt = req.dailyAttendanceId
      ? this.db.dailyAttendance.get(req.dailyAttendanceId)
      : Array.from(this.db.dailyAttendance.values()).find(
          (d) => d.employeeId === req.employeeId && d.attendanceDate === req.attendanceDate && d.companyId === req.companyId
        );

    const shift = dailyAtt?.shiftId ? this.db.shifts.get(dailyAtt.shiftId) : undefined;

    return {
      ...req,
      employeeCode: emp?.employeeCode,
      displayName: emp?.displayName || (emp ? `${emp.firstName} ${emp.lastName}` : undefined),
      employeeName: emp?.displayName || (emp ? `${emp.firstName} ${emp.lastName}` : undefined),
      departmentName: dept?.name,
      designationName: desig?.name,
      avatarUrl: emp?.avatarUrl,
      shiftName: shift?.name || dailyAtt?.shiftName,
      scheduledStart: dailyAtt?.scheduledStart,
      scheduledEnd: dailyAtt?.scheduledEnd,
      firstCheckIn: dailyAtt?.firstCheckIn,
      lastCheckOut: dailyAtt?.lastCheckOut,
      grossWorkMinutes: dailyAtt?.grossWorkMinutes,
      netWorkMinutes: dailyAtt?.netWorkMinutes,
      approverName: approverEmp?.displayName || approverEmp?.firstName,
    };
  }
}
