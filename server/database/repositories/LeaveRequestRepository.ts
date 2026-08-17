import { LeaveRequest, LeaveRequestStatus } from '../../../src/types/leave.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export interface LeaveRequestFilter {
  employeeId?: string;
  employeeIds?: string[];
  leaveTypeId?: string;
  leaveYearId?: string;
  status?: LeaveRequestStatus | LeaveRequestStatus[];
  fromDate?: string;
  toDate?: string;
  currentApproverId?: string;
  search?: string;
}

export class LeaveRequestRepository {
  private static db = RelationalDatabase.getInstance();

  public static async create(req: LeaveRequest): Promise<LeaveRequest> {
    this.db.leaveRequests.set(req.id, { ...req });
    return this.enrich(req);
  }

  public static async update(req: LeaveRequest): Promise<LeaveRequest> {
    this.db.leaveRequests.set(req.id, { ...req });
    return this.enrich(req);
  }

  public static async findById(id: string, companyId?: string): Promise<LeaveRequest | null> {
    const req = this.db.leaveRequests.get(id);
    if (!req) return null;
    if (companyId && req.companyId !== companyId) return null;
    return this.enrich(req);
  }

  public static async findAll(companyId: string, filter?: LeaveRequestFilter): Promise<LeaveRequest[]> {
    let list = Array.from(this.db.leaveRequests.values()).filter((r) => r.companyId === companyId);

    if (filter) {
      if (filter.employeeId) {
        list = list.filter((r) => r.employeeId === filter.employeeId);
      }
      if (filter.employeeIds && filter.employeeIds.length > 0) {
        const idSet = new Set(filter.employeeIds);
        list = list.filter((r) => idSet.has(r.employeeId));
      }
      if (filter.leaveTypeId) {
        list = list.filter((r) => r.leaveTypeId === filter.leaveTypeId);
      }
      if (filter.leaveYearId) {
        list = list.filter((r) => r.leaveYearId === filter.leaveYearId);
      }
      if (filter.status) {
        if (Array.isArray(filter.status)) {
          list = list.filter((r) => (filter.status as LeaveRequestStatus[]).includes(r.status));
        } else {
          list = list.filter((r) => r.status === filter.status);
        }
      }
      if (filter.currentApproverId) {
        list = list.filter((r) => r.currentApproverId === filter.currentApproverId);
      }
      if (filter.fromDate) {
        list = list.filter((r) => r.toDate >= filter.fromDate!);
      }
      if (filter.toDate) {
        list = list.filter((r) => r.fromDate <= filter.toDate!);
      }
      if (filter.search) {
        const q = filter.search.toLowerCase();
        list = list.filter((r) => {
          const emp = this.db.employees.get(r.employeeId);
          const empName = emp?.displayName?.toLowerCase() || '';
          const empCode = emp?.employeeCode?.toLowerCase() || '';
          const reason = r.reason.toLowerCase();
          return empName.includes(q) || empCode.includes(q) || reason.includes(q);
        });
      }
    }

    // Sort chronologically descending
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return list.map((r) => this.enrich(r));
  }

  /**
   * Check if employee has overlapping leave requests (excluding REJECTED / CANCELLED)
   */
  public static async findOverlappingRequests(
    employeeId: string,
    fromDate: string,
    toDate: string,
    companyId: string,
    excludeRequestId?: string
  ): Promise<LeaveRequest[]> {
    const activeStatuses: LeaveRequestStatus[] = ['DRAFT', 'SUBMITTED', 'PENDING', 'APPROVED'];
    const list = Array.from(this.db.leaveRequests.values()).filter(
      (r) =>
        r.companyId === companyId &&
        r.employeeId === employeeId &&
        r.id !== excludeRequestId &&
        activeStatuses.includes(r.status) &&
        r.fromDate <= toDate &&
        r.toDate >= fromDate
    );
    return list.map((r) => this.enrich(r));
  }

  private static enrich(req: LeaveRequest): LeaveRequest {
    const lt = this.db.leaveTypes.get(req.leaveTypeId);
    const emp = this.db.employees.get(req.employeeId);
    const approver = req.currentApproverId ? this.db.employees.get(req.currentApproverId) : undefined;
    const actioner = req.actionedBy ? this.db.employees.get(req.actionedBy) : undefined;

    const todayStr = new Date().toISOString().split('T')[0];
    const orgAsg = Array.from(this.db.employeeAssignments.values()).find(
      (a) => a.employeeId === req.employeeId && (!a.effectiveTo || a.effectiveTo >= todayStr)
    );
    const dept = orgAsg?.departmentId ? this.db.departments.get(orgAsg.departmentId) : undefined;
    const desig = orgAsg?.designationId ? this.db.designations.get(orgAsg.designationId) : undefined;

    return {
      ...req,
      leaveTypeCode: lt?.code,
      leaveTypeName: lt?.name,
      leaveCategory: lt?.category,
      paidType: lt?.paidType,
      color: lt?.color,
      employeeName: emp?.displayName || `${emp?.firstName || ''} ${emp?.lastName || ''}`.trim(),
      employeeCode: emp?.employeeCode,
      departmentName: dept?.name,
      designationName: desig?.name,
      currentApproverName: approver?.displayName,
      actionedByName: actioner?.displayName || req.actionedBy || undefined,
    };
  }
}
