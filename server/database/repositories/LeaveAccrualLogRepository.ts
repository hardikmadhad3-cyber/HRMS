import { LeaveAccrualLog } from '../../../src/types/leave.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export class LeaveAccrualLogRepository {
  private static db = RelationalDatabase.getInstance();

  public static async create(log: LeaveAccrualLog): Promise<LeaveAccrualLog> {
    const existing = Array.from(this.db.leaveAccrualLogs.values()).find(
      (l) => l.companyId === log.companyId && l.accrualRunKey === log.accrualRunKey
    );
    if (existing) {
      const err = new Error(`Accrual run with key '${log.accrualRunKey}' has already been processed for this company.`) as any;
      err.code = 'ACCRUAL_ALREADY_PROCESSED';
      err.statusCode = 409;
      throw err;
    }

    this.db.leaveAccrualLogs.set(log.id, { ...log });
    return this.enrich(log);
  }

  public static async findByRunKey(companyId: string, accrualRunKey: string): Promise<LeaveAccrualLog | null> {
    const log = Array.from(this.db.leaveAccrualLogs.values()).find(
      (l) => l.companyId === companyId && l.accrualRunKey === accrualRunKey
    );
    return log ? this.enrich(log) : null;
  }

  public static async findAll(companyId: string, accrualPeriod?: string): Promise<LeaveAccrualLog[]> {
    let list = Array.from(this.db.leaveAccrualLogs.values()).filter((l) => l.companyId === companyId);

    if (accrualPeriod) {
      list = list.filter((l) => l.accrualPeriod === accrualPeriod);
    }

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list.map((l) => this.enrich(l));
  }

  private static enrich(log: LeaveAccrualLog): LeaveAccrualLog {
    const lt = this.db.leaveTypes.get(log.leaveTypeId);
    return {
      ...log,
      leaveTypeCode: lt?.code,
      leaveTypeName: lt?.name,
    };
  }
}
