import { PayrollComponentResult } from '../../../src/types/payroll.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export class PayrollComponentResultRepository {
  private static get db() {
    return RelationalDatabase.getInstance();
  }

  public static async findByRunEmployeeId(
    payrollRunEmployeeId: string,
    companyId: string
  ): Promise<PayrollComponentResult[]> {
    return Array.from(this.db.payrollComponentResults.values())
      .filter((r) => r.payrollRunEmployeeId === payrollRunEmployeeId && r.companyId === companyId)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  public static async findByRunId(
    payrollRunId: string,
    companyId: string
  ): Promise<PayrollComponentResult[]> {
    return Array.from(this.db.payrollComponentResults.values())
      .filter((r) => r.payrollRunId === payrollRunId && r.companyId === companyId)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  public static async save(result: PayrollComponentResult): Promise<PayrollComponentResult> {
    this.db.payrollComponentResults.set(result.id, { ...result });
    return result;
  }

  public static async saveBatch(results: PayrollComponentResult[]): Promise<PayrollComponentResult[]> {
    for (const res of results) {
      this.db.payrollComponentResults.set(res.id, { ...res });
    }
    return results;
  }

  public static async deleteByRunEmployeeId(
    payrollRunEmployeeId: string,
    companyId: string
  ): Promise<void> {
    for (const [id, res] of this.db.payrollComponentResults.entries()) {
      if (res.payrollRunEmployeeId === payrollRunEmployeeId && res.companyId === companyId) {
        this.db.payrollComponentResults.delete(id);
      }
    }
  }

  public static async deleteByRunId(payrollRunId: string, companyId: string): Promise<void> {
    for (const [id, res] of this.db.payrollComponentResults.entries()) {
      if (res.payrollRunId === payrollRunId && res.companyId === companyId) {
        this.db.payrollComponentResults.delete(id);
      }
    }
  }
}
