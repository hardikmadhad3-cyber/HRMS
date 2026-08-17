import { RelationalDatabase } from '../RelationalDatabase.js';
import { PayrollPeriodSnapshot, PayrollSnapshotStatus } from '../../../src/types/payroll.js';

export class PayrollPeriodSnapshotRepository {
  private static get db() {
    return RelationalDatabase.getInstance();
  }

  public static async findById(id: string, companyId: string): Promise<PayrollPeriodSnapshot | null> {
    const item = this.db.payrollPeriodSnapshots.get(id);
    if (!item || item.companyId !== companyId) return null;
    return { ...item };
  }

  public static async findByPeriodId(payrollPeriodId: string, companyId: string): Promise<PayrollPeriodSnapshot[]> {
    const results: PayrollPeriodSnapshot[] = [];
    for (const item of this.db.payrollPeriodSnapshots.values()) {
      if (item.companyId === companyId && item.payrollPeriodId === payrollPeriodId) {
        results.push({ ...item });
      }
    }
    return results.sort((a, b) => b.snapshotVersion - a.snapshotVersion);
  }

  public static async findByRunId(payrollRunId: string, companyId: string): Promise<PayrollPeriodSnapshot | null> {
    for (const item of this.db.payrollPeriodSnapshots.values()) {
      if (item.companyId === companyId && item.payrollRunId === payrollRunId) {
        return { ...item };
      }
    }
    return null;
  }

  public static async findLatestByPeriod(payrollPeriodId: string, companyId: string): Promise<PayrollPeriodSnapshot | null> {
    const list = await this.findByPeriodId(payrollPeriodId, companyId);
    return list.length > 0 ? list[0] : null;
  }

  public static async save(snapshot: PayrollPeriodSnapshot): Promise<PayrollPeriodSnapshot> {
    this.db.payrollPeriodSnapshots.set(snapshot.id, { ...snapshot });
    return { ...snapshot };
  }

  public static async updateStatus(
    id: string,
    companyId: string,
    status: PayrollSnapshotStatus,
    extra?: { reopenReason?: string; reopenedAt?: string; reopenedBy?: string }
  ): Promise<PayrollPeriodSnapshot | null> {
    const existing = this.db.payrollPeriodSnapshots.get(id);
    if (!existing || existing.companyId !== companyId) return null;
    const updated: PayrollPeriodSnapshot = {
      ...existing,
      status,
      ...extra,
    };
    this.db.payrollPeriodSnapshots.set(id, updated);
    return { ...updated };
  }
}
