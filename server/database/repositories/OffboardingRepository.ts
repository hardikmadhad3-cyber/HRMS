import {
  OffboardingRequest,
  OffboardingClearanceItem,
  ExitInterview,
  OffboardingHistory,
  OffboardingStatus,
  ClearanceDepartment,
  ClearanceItemStatus,
} from '../../../src/types/offboarding.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export class OffboardingRepository {
  private static db = RelationalDatabase.getInstance();

  // ---------------------------------------------------------------------------
  // Offboarding Requests
  // ---------------------------------------------------------------------------
  public static async findRequests(
    companyId: string,
    filter: {
      employeeId?: string;
      employeeIds?: string[];
      status?: OffboardingStatus;
    } = {}
  ): Promise<OffboardingRequest[]> {
    let list = Array.from(this.db.offboardingRequests.values()).filter((r) => r.companyId === companyId);

    if (filter.employeeId) {
      list = list.filter((r) => r.employeeId === filter.employeeId);
    } else if (filter.employeeIds && filter.employeeIds.length > 0) {
      list = list.filter((r) => filter.employeeIds!.includes(r.employeeId));
    }

    if (filter.status) {
      list = list.filter((r) => r.status === filter.status);
    }

    return list
      .map((r) => this.enrichRequest(r))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public static async findRequestById(id: string, companyId: string): Promise<OffboardingRequest | null> {
    const request = this.db.offboardingRequests.get(id);
    if (request && request.companyId === companyId) {
      return this.enrichRequest(request);
    }
    return null;
  }

  public static async findActiveRequestByEmployeeId(employeeId: string, companyId: string): Promise<OffboardingRequest | null> {
    const active = Array.from(this.db.offboardingRequests.values()).find(
      (r) =>
        r.companyId === companyId &&
        r.employeeId === employeeId &&
        r.status !== OffboardingStatus.COMPLETED &&
        r.status !== OffboardingStatus.REJECTED &&
        r.status !== OffboardingStatus.WITHDRAWN
    );
    return active ? this.enrichRequest(active) : null;
  }

  public static async createRequest(request: OffboardingRequest): Promise<OffboardingRequest> {
    this.db.offboardingRequests.set(request.id, { ...request });
    return this.enrichRequest(request);
  }

  public static async updateRequest(
    id: string,
    companyId: string,
    updates: Partial<OffboardingRequest>
  ): Promise<OffboardingRequest | null> {
    const existing = this.db.offboardingRequests.get(id);
    if (!existing || existing.companyId !== companyId) return null;

    const updated: OffboardingRequest = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.db.offboardingRequests.set(id, updated);
    return this.enrichRequest(updated);
  }

  // ---------------------------------------------------------------------------
  // Clearance Items
  // ---------------------------------------------------------------------------
  public static async findClearanceItems(offboardingId: string, companyId: string): Promise<OffboardingClearanceItem[]> {
    return Array.from(this.db.offboardingClearanceItems.values())
      .filter((i) => i.offboardingId === offboardingId && i.companyId === companyId)
      .map((i) => this.enrichClearanceItem(i))
      .sort((a, b) => a.department.localeCompare(b.department));
  }

  public static async findClearanceItemById(id: string, companyId: string): Promise<OffboardingClearanceItem | null> {
    const item = this.db.offboardingClearanceItems.get(id);
    if (item && item.companyId === companyId) {
      return this.enrichClearanceItem(item);
    }
    return null;
  }

  public static async createClearanceItem(item: OffboardingClearanceItem): Promise<OffboardingClearanceItem> {
    this.db.offboardingClearanceItems.set(item.id, { ...item });
    await this.recalculateClearanceDepartmentStatuses(item.offboardingId, item.companyId);
    return this.enrichClearanceItem(item);
  }

  public static async updateClearanceItem(
    id: string,
    companyId: string,
    updates: Partial<OffboardingClearanceItem>
  ): Promise<OffboardingClearanceItem | null> {
    const existing = this.db.offboardingClearanceItems.get(id);
    if (!existing || existing.companyId !== companyId) return null;

    const updated: OffboardingClearanceItem = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.db.offboardingClearanceItems.set(id, updated);
    await this.recalculateClearanceDepartmentStatuses(existing.offboardingId, companyId);
    return this.enrichClearanceItem(updated);
  }

  public static async recalculateClearanceDepartmentStatuses(offboardingId: string, companyId: string): Promise<void> {
    const request = this.db.offboardingRequests.get(offboardingId);
    if (!request) return;

    const items = Array.from(this.db.offboardingClearanceItems.values()).filter(
      (i) => i.offboardingId === offboardingId && i.companyId === companyId
    );

    const getDeptStatus = (dept: ClearanceDepartment): ClearanceItemStatus => {
      const deptItems = items.filter((i) => i.department === dept);
      if (deptItems.length === 0) return ClearanceItemStatus.CLEARED;
      if (deptItems.some((i) => i.status === ClearanceItemStatus.BLOCKED)) return ClearanceItemStatus.BLOCKED;
      if (deptItems.every((i) => i.status === ClearanceItemStatus.CLEARED || i.status === ClearanceItemStatus.WAIVED)) {
        return ClearanceItemStatus.CLEARED;
      }
      return ClearanceItemStatus.PENDING;
    };

    request.managerClearanceStatus = getDeptStatus(ClearanceDepartment.MANAGER);
    request.itClearanceStatus = getDeptStatus(ClearanceDepartment.IT_ASSET);
    request.hrClearanceStatus = getDeptStatus(ClearanceDepartment.HR);
    request.financeClearanceStatus = getDeptStatus(ClearanceDepartment.FINANCE);

    request.allClearancesCompleted =
      request.managerClearanceStatus === ClearanceItemStatus.CLEARED &&
      request.itClearanceStatus === ClearanceItemStatus.CLEARED &&
      request.hrClearanceStatus === ClearanceItemStatus.CLEARED &&
      request.financeClearanceStatus === ClearanceItemStatus.CLEARED;

    request.updatedAt = new Date().toISOString();
    this.db.offboardingRequests.set(offboardingId, request);
  }

  // ---------------------------------------------------------------------------
  // Exit Interviews
  // ---------------------------------------------------------------------------
  public static async findExitInterviewByOffboardingId(offboardingId: string, companyId: string): Promise<ExitInterview | null> {
    const interview = Array.from(this.db.exitInterviews.values()).find(
      (i) => i.offboardingId === offboardingId && i.companyId === companyId
    );
    return interview ? this.enrichExitInterview(interview) : null;
  }

  public static async saveExitInterview(interview: ExitInterview): Promise<ExitInterview> {
    this.db.exitInterviews.set(interview.id, { ...interview });

    // Update request flag
    const request = this.db.offboardingRequests.get(interview.offboardingId);
    if (request) {
      request.exitInterviewCompleted = true;
      request.updatedAt = new Date().toISOString();
      this.db.offboardingRequests.set(request.id, request);
    }

    return this.enrichExitInterview(interview);
  }

  // ---------------------------------------------------------------------------
  // Offboarding History
  // ---------------------------------------------------------------------------
  public static async logHistory(entry: OffboardingHistory): Promise<void> {
    this.db.offboardingHistory.set(entry.id, { ...entry });
  }

  public static async findHistoryByOffboardingId(offboardingId: string, companyId: string): Promise<OffboardingHistory[]> {
    return Array.from(this.db.offboardingHistory.values())
      .filter((h) => h.offboardingId === offboardingId && h.companyId === companyId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  private static enrichRequest(request: OffboardingRequest): OffboardingRequest {
    const emp = this.db.employees.get(request.employeeId);
    let managerName: string | undefined;
    if (request.managerId) {
      const mgr = this.db.employees.get(request.managerId);
      if (mgr) managerName = `${mgr.firstName} ${mgr.lastName}`;
    }

    const clearanceItems = Array.from(this.db.offboardingClearanceItems.values())
      .filter((i) => i.offboardingId === request.id)
      .map((i) => this.enrichClearanceItem(i));

    const exitInterview = Array.from(this.db.exitInterviews.values()).find(
      (i) => i.offboardingId === request.id
    );

    return {
      ...request,
      employeeName: emp ? `${emp.firstName} ${emp.lastName}` : request.employeeName,
      employeeCode: emp?.employeeCode || request.employeeCode,
      managerName: managerName || request.managerName,
      clearanceItems,
      exitInterview: exitInterview ? this.enrichExitInterview(exitInterview) : undefined,
    };
  }

  private static enrichClearanceItem(item: OffboardingClearanceItem): OffboardingClearanceItem {
    let clearedByName: string | undefined;
    if (item.clearedBy) {
      const clearer = this.db.employees.get(item.clearedBy);
      if (clearer) clearedByName = `${clearer.firstName} ${clearer.lastName}`;
    }
    return {
      ...item,
      clearedByName,
    };
  }

  private static enrichExitInterview(interview: ExitInterview): ExitInterview {
    let conductedByName: string | undefined;
    if (interview.conductedBy) {
      const cond = this.db.employees.get(interview.conductedBy);
      if (cond) conductedByName = `${cond.firstName} ${cond.lastName}`;
    }
    return {
      ...interview,
      conductedByName,
    };
  }
}
