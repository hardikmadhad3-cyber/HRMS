import { RelationalDatabase } from '../RelationalDatabase.js';
import { Payslip, PayslipStatus } from '../../../src/types/payroll.js';

export interface PayslipFilter {
  payrollRunId?: string;
  payrollPeriodId?: string;
  employeeId?: string;
  status?: PayslipStatus;
  year?: number;
  search?: string;
}

export class PayslipRepository {
  private static get db() {
    return RelationalDatabase.getInstance();
  }

  public static async findById(id: string, companyId: string): Promise<Payslip | null> {
    const item = this.db.payslips.get(id);
    if (!item || item.companyId !== companyId) return null;
    return { ...item };
  }

  public static async findByPayslipNumber(payslipNumber: string, companyId: string): Promise<Payslip | null> {
    for (const item of this.db.payslips.values()) {
      if (item.companyId === companyId && item.payslipNumber === payslipNumber) {
        return { ...item };
      }
    }
    return null;
  }

  public static async findByDownloadToken(token: string): Promise<Payslip | null> {
    for (const item of this.db.payslips.values()) {
      if (item.downloadToken === token) {
        return { ...item };
      }
    }
    return null;
  }

  public static async findByRunAndEmployee(
    payrollRunId: string,
    employeeId: string,
    companyId: string
  ): Promise<Payslip | null> {
    for (const item of this.db.payslips.values()) {
      if (
        item.companyId === companyId &&
        item.payrollRunId === payrollRunId &&
        item.employeeId === employeeId
      ) {
        return { ...item };
      }
    }
    return null;
  }

  public static async findByRunId(payrollRunId: string, companyId: string): Promise<Payslip[]> {
    const results: Payslip[] = [];
    for (const item of this.db.payslips.values()) {
      if (item.companyId === companyId && item.payrollRunId === payrollRunId) {
        results.push({ ...item });
      }
    }
    return results;
  }

  public static async findByPeriodId(payrollPeriodId: string, companyId: string): Promise<Payslip[]> {
    const results: Payslip[] = [];
    for (const item of this.db.payslips.values()) {
      if (item.companyId === companyId && item.payrollPeriodId === payrollPeriodId) {
        results.push({ ...item });
      }
    }
    return results;
  }

  public static async findByEmployee(
    employeeId: string,
    companyId: string,
    filter?: { year?: number; status?: PayslipStatus }
  ): Promise<Payslip[]> {
    const results: Payslip[] = [];
    for (const item of this.db.payslips.values()) {
      if (item.companyId === companyId && item.employeeId === employeeId) {
        if (filter?.status && item.status !== filter.status) continue;
        if (filter?.year) {
          const itemYear = new Date(item.periodStartDate).getFullYear();
          if (itemYear !== filter.year) continue;
        }
        results.push({ ...item });
      }
    }
    // Sort descending by payDate / periodStartDate
    return results.sort((a, b) => b.periodStartDate.localeCompare(a.periodStartDate));
  }

  public static async findMany(companyId: string, filter?: PayslipFilter): Promise<Payslip[]> {
    const results: Payslip[] = [];
    for (const item of this.db.payslips.values()) {
      if (item.companyId !== companyId) continue;
      if (filter?.payrollRunId && item.payrollRunId !== filter.payrollRunId) continue;
      if (filter?.payrollPeriodId && item.payrollPeriodId !== filter.payrollPeriodId) continue;
      if (filter?.employeeId && item.employeeId !== filter.employeeId) continue;
      if (filter?.status && item.status !== filter.status) continue;
      if (filter?.year) {
        const itemYear = new Date(item.periodStartDate).getFullYear();
        if (itemYear !== filter.year) continue;
      }
      if (filter?.search) {
        const q = filter.search.toLowerCase();
        const empName = item.employeeSnapshot?.fullName?.toLowerCase() || '';
        const empCode = item.employeeSnapshot?.employeeCode?.toLowerCase() || '';
        const psNum = item.payslipNumber.toLowerCase();
        if (!empName.includes(q) && !empCode.includes(q) && !psNum.includes(q)) continue;
      }
      results.push({ ...item });
    }
    return results.sort((a, b) => b.periodStartDate.localeCompare(a.periodStartDate));
  }

  public static async save(payslip: Payslip): Promise<Payslip> {
    this.db.payslips.set(payslip.id, { ...payslip });
    return { ...payslip };
  }

  public static async saveBatch(payslips: Payslip[]): Promise<Payslip[]> {
    for (const p of payslips) {
      this.db.payslips.set(p.id, { ...p });
    }
    return payslips.map((p) => ({ ...p }));
  }

  public static async update(
    id: string,
    companyId: string,
    partial: Partial<Payslip>
  ): Promise<Payslip | null> {
    const existing = this.db.payslips.get(id);
    if (!existing || existing.companyId !== companyId) return null;
    const updated: Payslip = {
      ...existing,
      ...partial,
      updatedAt: new Date().toISOString(),
    };
    this.db.payslips.set(id, updated);
    return { ...updated };
  }

  public static async updateStatus(
    id: string,
    companyId: string,
    status: PayslipStatus,
    extra?: { publishedAt?: string; publishedBy?: string }
  ): Promise<Payslip | null> {
    const existing = this.db.payslips.get(id);
    if (!existing || existing.companyId !== companyId) return null;
    const updated: Payslip = {
      ...existing,
      status,
      ...extra,
      updatedAt: new Date().toISOString(),
    };
    this.db.payslips.set(id, updated);
    return { ...updated };
  }

  public static async deleteByRunId(payrollRunId: string, companyId: string): Promise<number> {
    let count = 0;
    for (const [id, item] of Array.from(this.db.payslips.entries())) {
      if (item.companyId === companyId && item.payrollRunId === payrollRunId) {
        this.db.payslips.delete(id);
        count++;
      }
    }
    return count;
  }
}
