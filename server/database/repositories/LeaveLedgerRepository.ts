import { LeaveLedgerEntry, LeaveTransactionType } from '../../../src/types/leave.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export interface LeaveLedgerFilter {
  employeeId?: string;
  leaveTypeId?: string;
  leaveYearId?: string;
  transactionType?: LeaveTransactionType;
  fromDate?: string;
  toDate?: string;
  referenceType?: string;
  referenceId?: string;
}

export class LeaveLedgerRepository {
  private static db = RelationalDatabase.getInstance();

  /**
   * Post an immutable ledger entry.
   * Ledger entries can NEVER be updated or deleted.
   */
  public static async create(entry: LeaveLedgerEntry): Promise<LeaveLedgerEntry> {
    const existing = this.db.leaveLedgers.get(entry.id);
    if (existing) {
      const err = new Error(`Ledger entry with ID '${entry.id}' already exists. Ledger entries are strictly immutable.`) as any;
      err.code = 'LEDGER_ENTRY_EXISTS';
      err.statusCode = 409;
      throw err;
    }

    this.db.leaveLedgers.set(entry.id, { ...entry });
    return this.enrich(entry);
  }

  public static async findById(id: string, companyId?: string): Promise<LeaveLedgerEntry | null> {
    const entry = this.db.leaveLedgers.get(id);
    if (!entry) return null;
    if (companyId && entry.companyId !== companyId) return null;
    return this.enrich(entry);
  }

  public static async findAll(companyId: string, filter?: LeaveLedgerFilter): Promise<LeaveLedgerEntry[]> {
    let list = Array.from(this.db.leaveLedgers.values()).filter((e) => e.companyId === companyId);

    if (filter) {
      if (filter.employeeId) {
        list = list.filter((e) => e.employeeId === filter.employeeId);
      }
      if (filter.leaveTypeId) {
        list = list.filter((e) => e.leaveTypeId === filter.leaveTypeId);
      }
      if (filter.leaveYearId) {
        list = list.filter((e) => e.leaveYearId === filter.leaveYearId);
      }
      if (filter.transactionType) {
        list = list.filter((e) => e.transactionType === filter.transactionType);
      }
      if (filter.referenceType) {
        list = list.filter((e) => e.referenceType === filter.referenceType);
      }
      if (filter.referenceId) {
        list = list.filter((e) => e.referenceId === filter.referenceId);
      }
      if (filter.fromDate) {
        list = list.filter((e) => e.effectiveDate >= filter.fromDate!);
      }
      if (filter.toDate) {
        list = list.filter((e) => e.effectiveDate <= filter.toDate!);
      }
    }

    // Sort chronologically descending
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return list.map((e) => this.enrich(e));
  }

  public static async findByEmployeeAndType(
    employeeId: string,
    leaveTypeId: string,
    leaveYearId: string,
    companyId: string
  ): Promise<LeaveLedgerEntry[]> {
    const list = Array.from(this.db.leaveLedgers.values()).filter(
      (e) =>
        e.companyId === companyId &&
        e.employeeId === employeeId &&
        e.leaveTypeId === leaveTypeId &&
        e.leaveYearId === leaveYearId
    );
    list.sort((a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime());
    return list.map((e) => this.enrich(e));
  }

  private static enrich(entry: LeaveLedgerEntry): LeaveLedgerEntry {
    const lt = this.db.leaveTypes.get(entry.leaveTypeId);
    const emp = this.db.employees.get(entry.employeeId);

    return {
      ...entry,
      leaveTypeCode: lt?.code,
      leaveTypeName: lt?.name,
      employeeName: emp?.displayName || `${emp?.firstName || ''} ${emp?.lastName || ''}`.trim(),
      employeeCode: emp?.employeeCode,
    };
  }
}
