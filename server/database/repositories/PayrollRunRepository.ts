import { PayrollRun, PayrollRunStatus } from '../../../src/types/payroll.js';
import { RelationalDatabase } from '../RelationalDatabase.js';

export class PayrollRunRepository {
  private static get db() {
    return RelationalDatabase.getInstance();
  }

  private static enrichRun(r: PayrollRun): PayrollRun {
    const period = this.db.payrollPeriods.get(r.payrollPeriodId);
    return {
      ...r,
      payrollPeriod: period ? { ...period } : undefined,
    };
  }

  public static async findById(id: string, companyId: string): Promise<PayrollRun | null> {
    const r = this.db.payrollRuns.get(id);
    if (!r || r.companyId !== companyId) return null;
    return this.enrichRun(r);
  }

  public static async findByPeriodId(
    payrollPeriodId: string,
    companyId: string
  ): Promise<PayrollRun[]> {
    return Array.from(this.db.payrollRuns.values())
      .filter((r) => r.payrollPeriodId === payrollPeriodId && r.companyId === companyId)
      .map((r) => this.enrichRun(r))
      .sort((a, b) => b.runNumber - a.runNumber);
  }

  public static async findAll(companyId: string, status?: PayrollRunStatus): Promise<PayrollRun[]> {
    return Array.from(this.db.payrollRuns.values())
      .filter((r) => r.companyId === companyId && (!status || r.status === status))
      .map((r) => this.enrichRun(r))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public static async getNextRunNumber(payrollPeriodId: string, companyId: string): Promise<number> {
    const runs = await this.findByPeriodId(payrollPeriodId, companyId);
    if (runs.length === 0) return 1;
    const maxNum = Math.max(...runs.map((r) => r.runNumber));
    return maxNum + 1;
  }

  public static async save(run: PayrollRun): Promise<PayrollRun> {
    this.db.payrollRuns.set(run.id, { ...run });
    return this.enrichRun(run);
  }

  public static async update(
    id: string,
    companyId: string,
    data: Partial<PayrollRun>
  ): Promise<PayrollRun | null> {
    const existing = await this.findById(id, companyId);
    if (!existing) return null;

    const updated: PayrollRun = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.db.payrollRuns.set(id, updated);
    return this.enrichRun(updated);
  }

  public static async delete(id: string, companyId: string): Promise<boolean> {
    const existing = await this.findById(id, companyId);
    if (!existing) return false;

    // Delete associated run employees, component results, and exceptions
    for (const [empId, re] of this.db.payrollRunEmployees.entries()) {
      if (re.payrollRunId === id && re.companyId === companyId) {
        this.db.payrollRunEmployees.delete(empId);
      }
    }
    for (const [resId, cr] of this.db.payrollComponentResults.entries()) {
      if (cr.payrollRunId === id && cr.companyId === companyId) {
        this.db.payrollComponentResults.delete(resId);
      }
    }
    for (const [excId, exc] of this.db.payrollExceptions.entries()) {
      if (exc.payrollRunId === id && exc.companyId === companyId) {
        this.db.payrollExceptions.delete(excId);
      }
    }

    this.db.payrollRuns.delete(id);
    return true;
  }
}
